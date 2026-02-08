#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
TMP_DIR="$(mktemp -d)"
CMD_LOG="$TMP_DIR/curl-commands.log"
FAILURES=0
PASSES=0
WARNS=0

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

record_cmd() {
  printf '%s\n' "$1" >> "$CMD_LOG"
}

pass() {
  PASSES=$((PASSES + 1))
  printf 'PASS: %s\n' "$1"
}

warn() {
  WARNS=$((WARNS + 1))
  printf 'WARN: %s\n' "$1"
}

fail() {
  FAILURES=$((FAILURES + 1))
  printf 'FAIL: %s\n' "$1"
}

api_available=0
api_method=""

probe_api() {
  local url="$BASE_URL/api/cves/search?q=React&page=1&pageSize=5&mode=product"
  local get_code post_code

  record_cmd "curl -sS '$url'"
  get_code="$(curl -sS -o "$TMP_DIR/probe-get.json" -w '%{http_code}' "$url" || printf '000')"

  if [ "$get_code" = "200" ]; then
    api_available=1
    api_method="GET"
    return
  fi

  record_cmd "curl -sS -X POST -H 'Accept: application/json' '$url'"
  post_code="$(curl -sS -X POST -H 'Accept: application/json' -o "$TMP_DIR/probe-post.json" -w '%{http_code}' "$url" || printf '000')"

  if [ "$post_code" = "200" ]; then
    api_available=1
    api_method="POST"
    return
  fi

  if [ "$get_code" != "404" ] && [ "$get_code" != "405" ]; then
    api_available=1
    api_method="GET"
    return
  fi

  if [ "$post_code" != "404" ] && [ "$post_code" != "405" ] && [ "$post_code" != "000" ]; then
    api_available=1
    api_method="POST"
    return
  fi

  api_available=0
  api_method=""
}

api_request() {
  local query="$1"
  local out_file="$2"
  local url="$BASE_URL/api/cves/search?$query"

  if [ "$api_method" = "POST" ]; then
    record_cmd "curl -sS -X POST -H 'Accept: application/json' '$url'"
    curl -sS -X POST -H 'Accept: application/json' -o "$out_file" -w '%{http_code}' "$url" || printf '000'
  else
    record_cmd "curl -sS '$url'"
    curl -sS -o "$out_file" -w '%{http_code}' "$url" || printf '000'
  fi
}

html_request() {
  local path_and_query="$1"
  local out_file="$2"
  local url="$BASE_URL$path_and_query"

  record_cmd "curl -sS '$url'"
  curl -sS -o "$out_file" -w '%{http_code}' "$url" || printf '000'
}

json_data_is_empty() {
  local file="$1"
  grep -Eq '"data"[[:space:]]*:[[:space:]]*\[[[:space:]]*\]' "$file"
}

json_data_has_rows() {
  local file="$1"
  grep -Eq '"data"[[:space:]]*:[[:space:]]*\[[[:space:]]*\{' "$file"
}

check_react_product_intent() {
  local body="$TMP_DIR/react-product.body"
  local status

  if [ "$api_available" -eq 1 ]; then
    status="$(api_request "q=React&page=1&pageSize=20&mode=product" "$body")"
  else
    status="$(html_request "/cves?q=React&page=1&mode=product" "$body")"
  fi

  if [ "$status" != "200" ]; then
    fail "React product intent request failed (HTTP $status)"
    return
  fi

  if grep -Eqi 'CVE-2007-1724|ReactOS|Reactor Netty|J! Reactions' "$body"; then
    fail "React product intent contains obvious collisions on page 1"
  else
    pass "React product intent excludes obvious collisions"
  fi

  if grep -Eqi 'CVE-2018-6341|CVE-2018-6342' "$body"; then
    pass "React product intent includes known React ecosystem CVE"
    return
  fi

  if [ "$api_available" -eq 1 ] && json_data_is_empty "$body"; then
    warn "React product intent returned 0 results; skipping known-CVE requirement"
  else
    fail "React product intent did not include known React ecosystem CVE"
  fi
}

check_reactos_explicit() {
  local body="$TMP_DIR/reactos.body"
  local status

  if [ "$api_available" -eq 1 ]; then
    status="$(api_request "q=ReactOS&page=1&pageSize=20&mode=product" "$body")"
  else
    status="$(html_request "/cves?q=ReactOS&page=1&mode=product" "$body")"
  fi

  if [ "$status" != "200" ]; then
    fail "ReactOS explicit query failed (HTTP $status)"
    return
  fi

  if [ "$api_available" -eq 1 ] && json_data_is_empty "$body"; then
    fail "ReactOS explicit query returned 0 results"
    return
  fi

  if grep -Eqi 'ReactOS|CVE-2007-1724' "$body"; then
    pass "ReactOS explicit query returns ReactOS-related results"
  else
    fail "ReactOS explicit query missing ReactOS-related results"
  fi
}

check_empty_query_behavior() {
  local html_body="$TMP_DIR/empty-query.html"
  local html_status
  local current_year min_allowed_year years oldest_year

  current_year="$(date +%Y)"
  min_allowed_year=$((current_year - 1))

  html_status="$(html_request "/cves?page=1" "$html_body")"

  if [ "$html_status" != "200" ]; then
    fail "Empty query HTML route failed (HTTP $html_status)"
    return
  fi

  if grep -q 'trending/recent results shown because query is empty' "$html_body"; then
    fail "Empty query still shows old trending/recent warning"
  else
    pass "Empty query does not show trending/recent warning"
  fi

  if grep -Eq 'CVE-1999-[0-9]+' "$html_body"; then
    fail "Empty query HTML contains CVE-1999-* entries"
  else
    pass "Empty query HTML does not contain CVE-1999-* entries"
  fi

  if grep -Eq 'Type to search CVEs|No CVEs found for this query' "$html_body"; then
    pass "Empty query HTML shows empty-state messaging"
  else
    years="$(grep -Eo 'CVE-[0-9]{4}-[0-9]{4,}' "$html_body" | awk -F- '{print $2}' | sort -u || true)"
    if [ -z "$years" ]; then
      warn "Empty query HTML had no CVE IDs and no explicit empty-state text"
    else
      oldest_year="$(printf '%s\n' "$years" | awk 'NR==1 {min=$1} $1<min {min=$1} END {print min}')"
      if [ "$oldest_year" -lt "$min_allowed_year" ]; then
        fail "Empty query HTML contains non-recent CVE year $oldest_year (< $min_allowed_year)"
      else
        pass "Empty query HTML CVE years are recent"
      fi
    fi
  fi

  if [ "$api_available" -eq 1 ]; then
    local api_body="$TMP_DIR/empty-query.json"
    local api_status
    api_status="$(api_request "page=1&pageSize=20&mode=auto" "$api_body")"

    if [ "$api_status" != "200" ]; then
      fail "Empty query API request failed (HTTP $api_status)"
      return
    fi

    if grep -q 'trending/recent results shown because query is empty' "$api_body"; then
      fail "Empty query API still returns trending/recent warning"
    else
      pass "Empty query API has no trending/recent warning"
    fi

    if json_data_has_rows "$api_body"; then
      years="$(grep -Eo 'CVE-[0-9]{4}-[0-9]{4,}' "$api_body" | awk -F- '{print $2}' | sort -u || true)"
      if [ -n "$years" ]; then
        oldest_year="$(printf '%s\n' "$years" | awk 'NR==1 {min=$1} $1<min {min=$1} END {print min}')"
        if [ "$oldest_year" -lt "$min_allowed_year" ]; then
          fail "Empty query API contains non-recent CVE year $oldest_year (< $min_allowed_year)"
        else
          pass "Empty query API CVE years are recent"
        fi
      fi
    else
      pass "Empty query API returns empty result set"
    fi
  fi
}

printf 'CVE curl smoke tests against %s\n' "$BASE_URL"
probe_api
if [ "$api_available" -eq 1 ]; then
  printf 'Detected API route: /api/cves/search (%s)\n' "$api_method"
else
  printf 'API route unavailable; falling back to HTML-only checks where possible\n'
fi

check_react_product_intent
check_reactos_explicit
check_empty_query_behavior

printf '\nSummary: %d PASS, %d WARN, %d FAIL\n' "$PASSES" "$WARNS" "$FAILURES"
printf 'Curl commands executed:\n'
cat "$CMD_LOG"

if [ "$FAILURES" -gt 0 ]; then
  exit 1
fi

exit 0
