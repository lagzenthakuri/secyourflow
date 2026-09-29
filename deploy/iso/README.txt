SecYourFlow Offline Installer
=============================

This package contains everything needed to install and run SecYourFlow without an internet connection.

Prerequisites
-------------
1. Docker (v20+ recommended)
2. Docker Compose (usually included with Docker Desktop or as a plugin)

For Windows:
- Open PowerShell as Administrator.
- Navigate to this folder.
- Run: .\scripts\install.ps1

For Linux:
- Open Terminal.
- Navigate to this folder.
- Run: ./scripts/install.sh

Configuration
-------------
The installer will automatically create `env/secyourflow.env` and `env/db.env` from examples if they don't exist.
You can edit these files to change passwords, ports, or other settings before or after installation.

Usage
-----
- Start: ./scripts/start.sh (Linux) or `docker compose up -d`
- Stop:  ./scripts/stop.sh  (Linux) or `docker compose down`
- Access: http://localhost:3000

Updates
-------
To update manually, download the latest ISO/Zip and run the installer again.
To update automatically (requires internet), run:
./scripts/update.sh (Linux)
.\scripts\update.ps1 (Windows)
