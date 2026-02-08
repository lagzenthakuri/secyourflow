#!/usr/bin/env bash
set -euo pipefail

if [ "${RUN_LIVE:-0}" != "1" ]; then
  printf 'FAIL: RUN_LIVE=1 is required for live API checks.\n'
  printf 'Action: RUN_LIVE=1 BASE_URL=http://localhost:3000 bash scripts/live-api-check.sh\n'
  exit 2
fi

BASE_URL="${BASE_URL:-http://localhost:3000}"
NVD_API_BASE="${NVD_API_BASE:-https://services.nvd.nist.gov/rest/json/cves/2.0}"
EPSS_API_BASE="${EPSS_API_BASE:-https://api.first.org/data/v1/epss}"
KEV_URL="${KEV_URL:-https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json}"
NVD_API_KEY="${CVE_NVD_API_KEY:-${NVD_API_KEY:-}}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-20}"
SKIP_LOCAL="${SKIP_LOCAL:-0}"
SKIP_RANDOM="${SKIP_RANDOM:-0}"

TMP_DIR="$(mktemp -d)"
FAILURES=0
PASSES=0
API_METHOD=""

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

pass() {
  PASSES=$((PASSES + 1))
  printf 'PASS: %s\n' "$1"
}

fail() {
  FAILURES=$((FAILURES + 1))
  printf 'FAIL: %s\n' "$1"
}

curl_json() {
  local url="$1"
  local out="$2"
  local code
  if [ -n "$NVD_API_KEY" ] && echo "$url" | grep -Fq "$NVD_API_BASE"; then
    code="$(curl -sS --max-time "$TIMEOUT_SECONDS" -H 'Accept: application/json' -H "apiKey: ${NVD_API_KEY}" -o "$out" -w '%{http_code}' "$url" || printf '000')"
  else
    code="$(curl -sS --max-time "$TIMEOUT_SECONDS" -H 'Accept: application/json' -o "$out" -w '%{http_code}' "$url" || printf '000')"
  fi
  printf '%s' "$code"
}

curl_json_with_retry() {
  local url="$1"
  local out="$2"
  local attempt code backoff
  for attempt in 1 2 3 4; do
    code="$(curl_json "$url" "$out")"
    if [ "$code" = "200" ]; then
      printf '%s' "$code"
      return
    fi
    if [ "$code" = "429" ] || [ "$code" = "500" ] || [ "$code" = "502" ] || [ "$code" = "503" ] || [ "$code" = "504" ]; then
      backoff=$((2 ** attempt))
      sleep "$backoff"
      continue
    fi
    printf '%s' "$code"
    return
  done
  printf '%s' "$code"
}

probe_local_api_method() {
  if [ "$SKIP_LOCAL" = "1" ]; then
    return
  fi

  local probe_url="${BASE_URL}/api/cves/search?q=CVE-2018-6341&page=1&pageSize=5&mode=auto"
  local get_code post_code
  get_code="$(curl -sS --max-time "$TIMEOUT_SECONDS" -o "$TMP_DIR/local-probe-get.json" -w '%{http_code}' "$probe_url" || printf '000')"
  if [ "$get_code" = "200" ]; then
    API_METHOD="GET"
    pass "Detected local API method GET"
    return
  fi

  post_code="$(curl -sS --max-time "$TIMEOUT_SECONDS" -X POST -H 'Accept: application/json' -o "$TMP_DIR/local-probe-post.json" -w '%{http_code}' "$probe_url" || printf '000')"
  if [ "$post_code" = "200" ]; then
    API_METHOD="POST"
    pass "Detected local API method POST"
    return
  fi

  fail "Local API unreachable at ${BASE_URL}/api/cves/search (GET=${get_code}, POST=${post_code})"
}

local_api_request() {
  local query="$1"
  local out="$2"
  local url="${BASE_URL}/api/cves/search?${query}"
  if [ "$API_METHOD" = "POST" ]; then
    curl -sS --max-time "$TIMEOUT_SECONDS" -X POST -H 'Accept: application/json' -o "$out" -w '%{http_code}' "$url" || printf '000'
  else
    curl -sS --max-time "$TIMEOUT_SECONDS" -o "$out" -w '%{http_code}' "$url" || printf '000'
  fi
}

check_nvd_reachability() {
  local body="$TMP_DIR/nvd-reach.json"
  local code
  code="$(curl_json_with_retry "${NVD_API_BASE}?resultsPerPage=1&keywordSearch=openssl" "$body")"

  if [ "$code" = "200" ]; then
    pass "NVD reachable (${NVD_API_BASE})"
    return
  fi

  if [ "$code" = "429" ]; then
    fail "NVD rate limited after retries. Configure NVD_API_KEY/CVE_NVD_API_KEY."
    return
  fi

  if [ "$code" = "000" ]; then
    fail "NVD unreachable (network blocked)."
    return
  fi

  fail "NVD reachability check failed with HTTP ${code}"
}

check_nvd_by_id() {
  local cve_id="$1"
  local body="$TMP_DIR/nvd-${cve_id}.json"
  local code
  code="$(curl_json_with_retry "${NVD_API_BASE}?resultsPerPage=1&cveId=${cve_id}" "$body")"
  if [ "$code" != "200" ]; then
    fail "NVD cveId lookup failed for ${cve_id} (HTTP ${code})"
    return
  fi

  if grep -Eq "\"id\"[[:space:]]*:[[:space:]]*\"${cve_id}\"" "$body"; then
    pass "NVD cveId lookup returns ${cve_id}"
  else
    fail "NVD cveId lookup did not contain ${cve_id}"
  fi
}

check_nvd_keyword_react() {
  local body="$TMP_DIR/nvd-react.json"
  local code
  code="$(curl_json_with_retry "${NVD_API_BASE}?resultsPerPage=50&keywordSearch=React" "$body")"
  if [ "$code" != "200" ]; then
    fail "NVD keywordSearch=React failed (HTTP ${code})"
    return
  fi

  if grep -Eq '"vulnerabilities"[[:space:]]*:[[:space:]]*\[[[:space:]]*\{' "$body"; then
    pass "NVD keywordSearch=React returned non-empty vulnerabilities"
  else
    fail "NVD keywordSearch=React returned no vulnerabilities"
  fi
}

check_epss_if_enabled() {
  if ! grep -Fq 'EpssAdapter' src/modules/cve-search/api/service.ts; then
    pass "EPSS integration not present in service; skipped"
    return
  fi

  local body="$TMP_DIR/epss.json"
  local code
  code="$(curl_json_with_retry "${EPSS_API_BASE}?cve=CVE-2018-6342" "$body")"
  if [ "$code" != "200" ]; then
    fail "EPSS lookup failed for CVE-2018-6342 (HTTP ${code})"
    return
  fi

  if grep -Eq '"cve"[[:space:]]*:[[:space:]]*"CVE-2018-6342"' "$body" \
    && grep -Eq '"epss"[[:space:]]*:[[:space:]]*"[0-9.]+"' "$body" \
    && grep -Eq '"percentile"[[:space:]]*:[[:space:]]*"[0-9.]+"' "$body"; then
    pass "EPSS response includes parsable epss + percentile for CVE-2018-6342"
  else
    fail "EPSS response missing expected epss/percentile fields for CVE-2018-6342"
  fi
}

check_kev_if_enabled() {
  if ! grep -Fq 'KevAdapter' src/modules/cve-search/api/service.ts; then
    pass "KEV integration not present in service; skipped"
    return
  fi

  local kev_body="$TMP_DIR/kev.json"
  local kev_code known_kev
  kev_code="$(curl_json_with_retry "${KEV_URL}" "$kev_body")"
  if [ "$kev_code" != "200" ]; then
    fail "KEV catalog fetch failed (HTTP ${kev_code})"
    return
  fi

  known_kev="$(grep -Eo 'CVE-[0-9]{4}-[0-9]{4,}' "$kev_body" | awk 'NR==1 {print; exit}')"
  if [ -z "$known_kev" ]; then
    fail "KEV catalog returned no parseable CVE IDs"
    return
  fi
  pass "KEV catalog includes known CVE ${known_kev}"

  if [ "$SKIP_LOCAL" = "1" ] || [ -z "$API_METHOD" ]; then
    fail "Cannot verify local KEV=true mapping for ${known_kev}: local API unavailable (set SKIP_LOCAL=0 and run dev server)."
    return
  fi

  local local_body="$TMP_DIR/local-kev.json"
  local local_code
  local_code="$(local_api_request "q=${known_kev}&page=1&pageSize=5&mode=auto" "$local_body")"
  if [ "$local_code" != "200" ]; then
    fail "Local KEV verification request failed for ${known_kev} (HTTP ${local_code})"
    return
  fi

  if grep -Eq "\"cveId\"[[:space:]]*:[[:space:]]*\"${known_kev}\"" "$local_body" \
    && grep -Eq '"isKnownExploited"[[:space:]]*:[[:space:]]*true' "$local_body"; then
    pass "Local API marks ${known_kev} as KEV=true"
  else
    fail "Local API did not mark ${known_kev} as KEV=true"
  fi
}

check_local_collision_filtering() {
  if [ "$SKIP_LOCAL" = "1" ] || [ -z "$API_METHOD" ]; then
    fail "Cannot verify local React collision filtering: local API unavailable (set SKIP_LOCAL=0 and run dev server)."
    return
  fi

  local body="$TMP_DIR/local-react-product.json"
  local code
  code="$(local_api_request "q=React&page=1&pageSize=50&mode=product" "$body")"
  if [ "$code" != "200" ]; then
    fail "Local React product query failed (HTTP ${code})"
    return
  fi

  if grep -Eq 'CVE-2018-6341|CVE-2018-6342' "$body"; then
    pass "Local React product query includes CVE-2018-6341 or CVE-2018-6342"
  else
    fail "Local React product query missing CVE-2018-6341/CVE-2018-6342"
  fi

  if grep -Eq 'CVE-2007-1724' "$body"; then
    fail "Local React product query includes collision CVE-2007-1724"
  else
    pass "Local React product query excludes collision CVE-2007-1724"
  fi
}

printf 'Running live upstream checks (RUN_LIVE=1)\n'
printf 'NVD=%s\n' "$NVD_API_BASE"
printf 'EPSS=%s\n' "$EPSS_API_BASE"
printf 'KEV=%s\n' "$KEV_URL"
if [ "$SKIP_LOCAL" != "1" ]; then
  printf 'Local API=%s\n' "$BASE_URL"
fi

probe_local_api_method
check_nvd_reachability
check_nvd_by_id "CVE-2018-6341"
check_nvd_by_id "CVE-2018-6342"
check_nvd_keyword_react
check_local_collision_filtering
check_epss_if_enabled
check_kev_if_enabled

if [ "$SKIP_RANDOM" != "1" ]; then
  if RUN_LIVE=1 SKIP_LOCAL_API="$SKIP_LOCAL" BASE_URL="$BASE_URL" bash scripts/random-cve-sampler.sh; then
    pass "Deterministic random sampler completed"
  else
    fail "Deterministic random sampler failed"
  fi
fi

printf '\nSummary: %d PASS, %d FAIL\n' "$PASSES" "$FAILURES"
if [ "$FAILURES" -gt 0 ]; then
  exit 1
fi
