#!/usr/bin/env bash
set -e

# formatting
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "== Building SecYourFlow ISO Locally =="

# 0. Check for genisoimage
if ! command -v genisoimage &> /dev/null; then
    echo "Error: 'genisoimage' is not installed."
    echo "Please install it first: sudo apt-get install genisoimage"
    exit 1
fi

# 1. Build Docker Images
echo "-> Building Docker images..."
docker build -t secyourflow:latest .
docker pull postgres:16-alpine

# 2. Prepare ISO Directory
echo "-> Preparing ISO folder..."
rm -rf secyourflow-iso
mkdir -p secyourflow-iso/images secyourflow-iso/env secyourflow-iso/scripts

# Copy templates
cp -r deploy/iso/* secyourflow-iso/
chmod +x secyourflow-iso/scripts/*.sh

# 3. Save Docker Images
echo "-> Saving Docker images (this may take a while)..."
echo "   Saving secyourflow:latest..."
docker save -o secyourflow-iso/images/secyourflow.tar secyourflow:latest

echo "   Saving postgres:16-alpine..."
docker save -o secyourflow-iso/images/db.tar postgres:16-alpine

# 4. Generate ISO
echo "-> Generating ISO file..."

VERSION="local-$(date +%Y%m%d)"
ISO_NAME="SecYourFlow-${VERSION}.iso"

genisoimage -o "$ISO_NAME" -V "SECYOURFLOW" -R -J secyourflow-iso

echo -e "✅ Success! Created $ISO_NAME"
