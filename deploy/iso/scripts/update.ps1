$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$UpdateUrl = $env:UPDATE_URL
if ([string]::IsNullOrEmpty($UpdateUrl)) { $UpdateUrl = "https://updates.secyourflow.com/latest.json" }
$StateFile = Join-Path $Root ".installed_version"

function Fail($m){ Write-Host $m; exit 1 }

# Checks
docker --version *> $null
if ($LASTEXITCODE -ne 0) { Fail "Docker not found. Install Docker Desktop first." }
docker compose version *> $null
if ($LASTEXITCODE -ne 0) { Fail "Docker Compose not found." }

$current = "0.0.0"
if (Test-Path $StateFile) { $current = Get-Content $StateFile -Raw }

Write-Host "Current version: $current"
Write-Host "Checking: $UpdateUrl"

try {
    $meta = Invoke-RestMethod -Uri $UpdateUrl -Method Get
} catch {
    Fail "Error: Failed to fetch update metadata from $UpdateUrl"
}

$latest = $meta.version
$bundleUrl = $meta.bundle_url
$shaExpected = $meta.sha256

if (!$latest -or !$bundleUrl -or !$shaExpected) { Fail "Update metadata missing fields." }

if ($latest -eq $current) {
  Write-Host "✅ Already up to date."
  exit 0
}

Write-Host "New version available: $latest"

$tmp = Join-Path $env:TEMP ("secyourflow_update_" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

$bundle = Join-Path $tmp "bundle.zip"
Write-Host "Downloading bundle..."
try {
    Invoke-WebRequest -Uri $bundleUrl -OutFile $bundle
} catch {
    Fail "Error: Failed to download bundle."
}

Write-Host "Verifying SHA256..."
$hash = (Get-FileHash $bundle -Algorithm SHA256).Hash.ToLower()
if ($hash -ne $shaExpected.ToLower()) {
  Fail "❌ SHA256 mismatch! Expected $shaExpected but got $hash"
}
Write-Host "✅ Verified."

Write-Host "Extracting..."
Expand-Archive -Path $bundle -DestinationPath (Join-Path $tmp "unpacked") -Force

$imgDir = Join-Path (Join-Path $tmp "unpacked") "images"
if (!(Test-Path $imgDir)) { Fail "❌ No images folder found in bundle." }

Write-Host "Loading images..."
Get-ChildItem "$imgDir\*.tar" | ForEach-Object {
  Write-Host "  Loading $($_.Name)"
  docker load -i $_.FullName | Out-Null
}

$composeNew = Join-Path (Join-Path $tmp "unpacked") "docker-compose.yml"
if (Test-Path $composeNew) {
  Copy-Item $composeNew (Join-Path $Root "docker-compose.yml") -Force
}

Write-Host "Restarting services..."
Set-Location $Root
docker compose up -d | Out-Null

Set-Content -Path $StateFile -Value $latest
Write-Host "✅ Updated to $latest"
