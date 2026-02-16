$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Write-Host "== SecYourFlow offline install (Windows) =="
Write-Host "Root: $Root"

# Check Docker
docker --version *> $null
if ($LASTEXITCODE -ne 0) { Write-Host "Docker not found. Install Docker Desktop first."; exit 1 }

docker compose version *> $null
if ($LASTEXITCODE -ne 0) { Write-Host "Docker Compose not found. Install Docker Desktop (includes compose)."; exit 1 }

Write-Host "-> Loading offline images..."
if (Test-Path "$Root\images\*.tar") {
    Get-ChildItem "$Root\images\*.tar" | ForEach-Object {
      Write-Host "   Loading $($_.FullName)"
      docker load -i $_.FullName | Out-Null
    }
} else {
    Write-Host "   No images found in images\*.tar, skipping load."
}

Write-Host "-> Copy env examples if missing..."
$envDir = Join-Path $Root "env"
if (!(Test-Path $envDir)) {
    New-Item -ItemType Directory -Force -Path $envDir | Out-Null
}

@("db.env","secyourflow.env") | ForEach-Object {
  $target = Join-Path $envDir $_
  $example = "$target.example"
  if (!(Test-Path $target) -and (Test-Path $example)) {
    Copy-Item $example $target
    Write-Host "   Created env\$_ (edit it if needed)"
  }
}

Write-Host "-> Starting SecYourFlow..."
Set-Location $Root
docker compose up -d

Write-Host "✅ Done. Open: http://localhost:3000"
