#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== SecYourFlow offline install (Linux) =="
echo "Root: $ROOT_DIR"

# Basic checks
if ! command -v docker &> /dev/null; then
    echo "Error: Docker not found. Install Docker first."
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "Error: Docker Compose not found (use Docker Desktop or docker-compose plugin)."
    exit 1
fi

echo "-> Loading offline images..."
if compgen -G "$ROOT_DIR/images/*.tar" > /dev/null; then
  for tar in "$ROOT_DIR"/images/*.tar; do
    echo "   Loading $tar"
    docker load -i "$tar"
  done
else
  echo "   No images found in images/*.tar, skipping load."
fi

echo "-> Copy env examples if missing..."
mkdir -p "$ROOT_DIR/env"
for f in db.env secyourflow.env; do
  if [ ! -f "$ROOT_DIR/env/$f" ] && [ -f "$ROOT_DIR/env/$f.example" ]; then
    cp "$ROOT_DIR/env/$f.example" "$ROOT_DIR/env/$f"
    echo "   Created env/$f (edit it if needed)"
  fi
done

echo "-> Starting SecYourFlow..."
cd "$ROOT_DIR"
docker compose up -d

echo "✅ Done. Open: http://localhost:3000"
