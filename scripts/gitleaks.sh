#!/usr/bin/env bash
set -euo pipefail

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks not found in PATH."
  echo "Install gitleaks and re-run: gitleaks detect --redact --source ."
  exit 2
fi

gitleaks detect --redact --source .

