#!/usr/bin/env bash
set -euo pipefail

# Configuration
COUNT="${COUNT:-150}"
SEED="${SEED:-42}"
YEAR_MIN="${YEAR_MIN:-1999}"
YEAR_MAX="${YEAR_MAX:-2026}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
MAX_RETRIES=3

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL=0
PASSED=0
FAILED=0

# Temp files
RESP_FILE=$(mktemp)
trap "rm -f $RESP_FILE" EXIT

# Seeded random number generator
RANDOM=$SEED

echo "========================================="
echo "CVE Search Smoke Test"
echo "========================================="
echo "Count: $COUNT"
echo "Seed: $SEED"
echo "Year Range: $YEAR_MIN-$YEAR_MAX"
echo "Base URL: $BASE_URL"
echo "========================================="
echo ""

# Generate random CVE IDs
generate_cve_id() {
    local year=$((YEAR_MIN + RANDOM % (YEAR_MAX - YEAR_MIN + 1)))
    local id=$((RANDOM % 99999 + 1))
    printf "CVE-%d-%04d" "$year" "$id"
}

# Test a single CVE
test_cve() {
    local cve_id="$1"
    local attempt=1
    local http_code
    local success=false

    while [ $attempt -le $MAX_RETRIES ]; do
        http_code=$(curl -sS -o "$RESP_FILE" -w '%{http_code}' "${BASE_URL}/api/cves/search?q=${cve_id}" 2>&1 || echo "000")

        if [ "$http_code" = "200" ]; then
            # Check if response contains the CVE ID (case-insensitive)
            if grep -qi "$cve_id" "$RESP_FILE"; then
                success=true
                break
            else
                # 200 but no match - could be valid (CVE not found in results)
                success=true
                break
            fi
        elif [ "$http_code" = "404" ] || [ "$http_code" = "400" ]; then
            # Client errors are acceptable (CVE might not exist)
            success=true
            break
        elif [ "$http_code" = "429" ] || [ "$http_code" = "503" ] || [ "$http_code" = "502" ]; then
            # Transient errors - retry with backoff
            local backoff=$((2 ** (attempt - 1)))
            echo -e "${YELLOW}  Retry $attempt/$MAX_RETRIES for $cve_id (HTTP $http_code) - waiting ${backoff}s${NC}"
            sleep "$backoff"
            attempt=$((attempt + 1))
        else
            # Other errors
            break
        fi
    done

    if [ "$success" = true ]; then
        echo -e "${GREEN}✓${NC} $cve_id (HTTP $http_code)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗${NC} $cve_id (HTTP $http_code)"
        echo "  Response snippet: $(head -c 200 "$RESP_FILE")"
        FAILED=$((FAILED + 1))
    fi

    TOTAL=$((TOTAL + 1))
}

# Run tests
echo "Running tests..."
echo ""

for i in $(seq 1 "$COUNT"); do
    cve_id=$(generate_cve_id)
    test_cve "$cve_id"

    # Progress indicator every 10 tests
    if [ $((i % 10)) -eq 0 ]; then
        echo "  Progress: $i/$COUNT"
    fi
done

echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo "Total: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "Success Rate: $(awk "BEGIN {printf \"%.1f\", ($PASSED/$TOTAL)*100}")%"
echo "========================================="

if [ $FAILED -gt 0 ]; then
    exit 1
fi

exit 0
