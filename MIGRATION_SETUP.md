# Prisma Migration Setup Guide

## Problem Summary
You're experiencing two migration issues:
1. **P3014**: Cannot create shadow database (user lacks CREATEDB privilege)
2. **P3005**: Schema is not empty (existing tables without migration history)

## Solution Implemented

I've configured your project to use a manual shadow database approach, which is the recommended solution for production-like databases where users don't have CREATEDB privileges.

### Changes Made
1. Added `shadowDatabaseUrl` to `prisma/schema.prisma`
2. Added `SHADOW_DATABASE_URL` to `.env.example`

## Setup Instructions

### Step 1: Create the Shadow Database

Connect to your PostgreSQL server with an admin user and run:

```sql
-- Create the shadow database
CREATE DATABASE appdb_shadow;

-- Grant privileges to your application user
GRANT ALL PRIVILEGES ON DATABASE appdb_shadow TO your_user;
```

Replace `your_user` with your actual database username.

### Step 2: Configure Environment Variable

Add this to your `.env` file (update with your actual credentials):

```bash
SHADOW_DATABASE_URL="postgresql://USER:PASSWORD@45.115.217.121:5432/appdb_shadow?schema=public"
```

Make sure to use the same credentials as your `DATABASE_URL`, just with a different database name.

### Step 3: Baseline Existing Migrations (for P3005)

Since your remote database already has tables, you need to tell Prisma that the existing migrations are already applied:

```bash
# Mark each migration as applied (run in order)
npx prisma migrate resolve --applied "20260207130330_init"
npx prisma migrate resolve --applied "20260208120500_add_totp_2fa"
npx prisma migrate resolve --applied "20260210102000_threat_intel_core"
npx prisma migrate resolve --applied "20260210113000_compliance_automation"
npx prisma migrate resolve --applied "20260210171500_workflow_reporting_assets_mvp"
npx prisma migrate resolve --applied "20260210184243_add_auditlog_ipaddress_index"
npx prisma migrate resolve --applied "20260210195000_single_active_session_enforcement"
```

### Step 4: Verify Setup

Now you should be able to run:

```bash
# For development migrations
npx prisma migrate dev

# For production deployments
npx prisma migrate deploy
```

## Alternative: Local Development Approach

If you prefer to keep your remote database untouched during development:

1. Use a local PostgreSQL instance (Docker or native) for `migrate dev`
2. Apply migrations to remote with `migrate deploy` only
3. This is common for production-like databases

### Docker PostgreSQL Example:
```bash
docker run -d \
  --name postgres-dev \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=appdb \
  -p 5432:5432 \
  postgres:15

# Use this for local development
DATABASE_URL="postgresql://postgres:dev@localhost:5432/appdb?schema=public"
```

## Troubleshooting

### If shadow database creation fails:
- Verify your admin user has CREATEDB privilege
- Check that the database name doesn't already exist
- Ensure network connectivity to the database server

### If baseline fails:
- Verify the migration names match exactly (check `ls prisma/migrations`)
- Ensure your database schema actually matches these migrations
- If schema differs, you may need to manually adjust it first

### If you see "Prisma config detected, skipping environment variable loading":
- This is expected with `prisma.config.ts`
- Make sure environment variables are exported in your shell:
  ```bash
  export DATABASE_URL="your-url"
  export SHADOW_DATABASE_URL="your-shadow-url"
  ```
- Or load them in your deployment environment configuration

## Next Steps

After setup is complete, you can:
- Create new migrations with `npx prisma migrate dev --name your_migration_name`
- Deploy to production with `npx prisma migrate deploy`
- Generate Prisma Client with `npx prisma generate`
