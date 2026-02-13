#!/bin/bash

# Credential Rotation Script for SecYourFlow
# This script helps generate new secure credentials

set -e

echo "=================================="
echo "SecYourFlow Credential Rotation"
echo "=================================="
echo ""
echo "This script will generate new secure credentials."
echo "You must manually update your .env file and revoke old credentials."
echo ""

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    echo "Error: openssl is required but not installed."
    exit 1
fi

echo "Generating new credentials..."
echo ""

echo "1. AUTH_SECRET (for NextAuth):"
AUTH_SECRET=$(openssl rand -base64 32)
echo "   $AUTH_SECRET"
echo ""

echo "2. NEXTAUTH_SECRET (should match AUTH_SECRET):"
echo "   $AUTH_SECRET"
echo ""

echo "3. ADMIN_API_TOKEN:"
ADMIN_TOKEN=$(openssl rand -base64 32)
echo "   $ADMIN_TOKEN"
echo ""

echo "4. TOTP_ENCRYPTION_KEY:"
TOTP_KEY=$(openssl rand -base64 32)
echo "   $TOTP_KEY"
echo ""

echo "5. SECRET_KEY_BASE:"
SECRET_KEY=$(openssl rand -base64 32)
echo "   $SECRET_KEY"
echo ""

echo "=================================="
echo "IMPORTANT NEXT STEPS:"
echo "=================================="
echo ""
echo "1. DATABASE CREDENTIALS:"
echo "   - Change your PostgreSQL password immediately"
echo "   - Update DATABASE_URL in .env with new password"
echo "   - Restrict database access to specific IPs"
echo ""
echo "2. API KEYS (must be rotated manually):"
echo "   - NVD_API_KEY: https://nvd.nist.gov/developers/request-an-api-key"
echo "   - GITHUB_TOKEN: https://github.com/settings/tokens"
echo "   - GOOGLE_CLIENT_SECRET: https://console.cloud.google.com/apis/credentials"
echo "   - CLOUDINARY_API_SECRET: https://cloudinary.com/console"
echo "   - OTX_API_KEY: https://otx.alienvault.com/api"
echo "   - URLHAUS_AUTH_KEY: https://urlhaus.abuse.ch/api/"
echo "   - MALWAREBAZAAR_AUTH_KEY: https://bazaar.abuse.ch/api/"
echo ""
echo "3. UPDATE .env FILE:"
echo "   - Copy the generated values above into your .env file"
echo "   - Update all API keys from their respective services"
echo "   - Verify .env is in .gitignore"
echo ""
echo "4. REVOKE OLD CREDENTIALS:"
echo "   - Revoke old GitHub token"
echo "   - Revoke old Google OAuth credentials"
echo "   - Revoke old API keys"
echo ""
echo "5. RESTART APPLICATION:"
echo "   - Stop the application"
echo "   - Verify new credentials are in .env"
echo "   - Start the application"
echo "   - Test authentication"
echo ""
echo "6. SECURITY CHECKLIST:"
echo "   - [ ] Database password changed"
echo "   - [ ] Database behind firewall/VPN"
echo "   - [ ] All secrets rotated"
echo "   - [ ] Old credentials revoked"
echo "   - [ ] .env not in git"
echo "   - [ ] Application restarted"
echo "   - [ ] Authentication tested"
echo ""
echo "=================================="
