#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPDATE_URL="${UPDATE_URL:-https://updates.secyourflow.com/latest.json}"
STATE_FILE="$ROOT_DIR/.installed_version"

need_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1"; exit 1; }; }

need_cmd curl
need_cmd sha256sum
need_cmd docker
need_cmd unzip # Required for bundle extraction

docker compose version >/dev/null 2>&1 || { echo "Docker Compose not found."; exit 1; }

current_version="0.0.0"
if [[ -f "$STATE_FILE" ]]; then current_version="$(cat "$STATE_FILE")"; fi

echo "Current version: $current_version"
echo "Checking: $UPDATE_URL"

# Fetch update metadata
if ! json="$(curl -fsSL "$UPDATE_URL")"; then
    echo "Error: Failed to fetch update metadata from $UPDATE_URL"
    exit 1
fi

# Parse JSON (simple sed, robust for standard format)
latest_version="$(echo "$json" | sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
bundle_url="$(echo "$json" | sed -n 's/.*"bundle_url"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
sha256_expected="$(echo "$json" | sed -n 's/.*"sha256"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"

if [[ -z "$latest_version" || -z "$bundle_url" || -z "$sha256_expected" ]]; then
  echo "Update metadata missing fields."
  exit 1
fi

if [[ "$latest_version" == "$current_version" ]]; then
  echo "✅ Already up to date."
  exit 0
fi

echo "New version available: $latest_version"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

bundle="$tmpdir/bundle.zip"
echo "Downloading bundle..."
if ! curl -fL "$bundle_url" -o "$bundle"; then
    echo "Error: Failed to download bundle."
    exit 1
fi

echo "Verifying SHA256..."
sha256_actual="$(sha256sum "$bundle" | awk '{print $1}')"
if [[ "$sha256_actual" != "$sha256_expected" ]]; then
  echo "❌ SHA256 mismatch!"
  echo "Expected: $sha256_expected"
  echo "Actual:   $sha256_actual"
  exit 1
fi
echo "✅ Verified."

echo "Extracting..."
unzip -q "$bundle" -d "$tmpdir/unpacked"

# Expect bundle layout:
# unpacked/
#   images/*.tar
#   docker-compose.yml (optional)

if compgen -G "$tmpdir/unpacked/images/*.tar" > /dev/null; then
  echo "Loading images..."
  for tar in "$tmpdir"/unpacked/images/*.tar; do
    echo "  docker load -i $(basename "$tar")"
    docker load -i "$tar" >/dev/null
  done
else
  echo "❌ No images found in bundle."
  exit 1
fi

# Optional: update compose file if shipped
if [[ -f "$tmpdir/unpacked/docker-compose.yml" ]]; then
  echo "Updating docker-compose.yml"
  cp "$tmpdir/unpacked/docker-compose.yml" "$ROOT_DIR/docker-compose.yml"
fi

echo "Restarting services..."
cd "$ROOT_DIR"
docker compose up -d

echo "$latest_version" > "$STATE_FILE"
echo "✅ Updated to $latest_version"
