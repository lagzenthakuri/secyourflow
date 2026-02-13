-- Add organization-level isolation for scanner and risk snapshot data.
-- This migration is fail-fast: mapping tables must be populated before it can complete.

BEGIN;

ALTER TABLE "ScannerConfig"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

ALTER TABLE "ScanResult"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

ALTER TABLE "RiskSnapshot"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

CREATE TABLE IF NOT EXISTS "ScannerConfigOrganizationMapping" (
  "scannerConfigId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScannerConfigOrganizationMapping_pkey" PRIMARY KEY ("scannerConfigId"),
  CONSTRAINT "ScannerConfigOrganizationMapping_scannerConfigId_fkey"
    FOREIGN KEY ("scannerConfigId") REFERENCES "ScannerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ScannerConfigOrganizationMapping_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "RiskSnapshotOrganizationMapping" (
  "riskSnapshotId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RiskSnapshotOrganizationMapping_pkey" PRIMARY KEY ("riskSnapshotId"),
  CONSTRAINT "RiskSnapshotOrganizationMapping_riskSnapshotId_fkey"
    FOREIGN KEY ("riskSnapshotId") REFERENCES "RiskSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RiskSnapshotOrganizationMapping_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

UPDATE "ScannerConfig" AS "sc"
SET "organizationId" = "map"."organizationId"
FROM "ScannerConfigOrganizationMapping" AS "map"
WHERE "map"."scannerConfigId" = "sc"."id"
  AND "sc"."organizationId" IS NULL;

UPDATE "ScanResult" AS "sr"
SET "organizationId" = "sc"."organizationId"
FROM "ScannerConfig" AS "sc"
WHERE "sr"."scannerId" = "sc"."id"
  AND "sr"."organizationId" IS NULL;

UPDATE "RiskSnapshot" AS "rs"
SET "organizationId" = "map"."organizationId"
FROM "RiskSnapshotOrganizationMapping" AS "map"
WHERE "map"."riskSnapshotId" = "rs"."id"
  AND "rs"."organizationId" IS NULL;

DO $$
DECLARE
  unresolved_scanners INTEGER;
  unresolved_scans INTEGER;
  unresolved_snapshots INTEGER;
BEGIN
  SELECT COUNT(*) INTO unresolved_scanners
  FROM "ScannerConfig"
  WHERE "organizationId" IS NULL;

  SELECT COUNT(*) INTO unresolved_scans
  FROM "ScanResult"
  WHERE "organizationId" IS NULL;

  SELECT COUNT(*) INTO unresolved_snapshots
  FROM "RiskSnapshot"
  WHERE "organizationId" IS NULL;

  IF unresolved_scanners > 0 OR unresolved_scans > 0 OR unresolved_snapshots > 0 THEN
    RAISE EXCEPTION
      'Migration blocked. Missing organization mapping: ScannerConfig=% ScanResult=% RiskSnapshot=%. Populate ScannerConfigOrganizationMapping and RiskSnapshotOrganizationMapping first.',
      unresolved_scanners,
      unresolved_scans,
      unresolved_snapshots;
  END IF;
END $$;

ALTER TABLE "ScannerConfig"
  ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "ScanResult"
  ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "RiskSnapshot"
  ALTER COLUMN "organizationId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScannerConfig_organizationId_fkey'
  ) THEN
    ALTER TABLE "ScannerConfig"
      ADD CONSTRAINT "ScannerConfig_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ScanResult_organizationId_fkey'
  ) THEN
    ALTER TABLE "ScanResult"
      ADD CONSTRAINT "ScanResult_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RiskSnapshot_organizationId_fkey'
  ) THEN
    ALTER TABLE "RiskSnapshot"
      ADD CONSTRAINT "RiskSnapshot_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ScannerConfig_organizationId_idx"
  ON "ScannerConfig"("organizationId");
CREATE INDEX IF NOT EXISTS "ScannerConfig_organizationId_isActive_idx"
  ON "ScannerConfig"("organizationId", "isActive");
CREATE INDEX IF NOT EXISTS "ScannerConfig_organizationId_type_idx"
  ON "ScannerConfig"("organizationId", "type");

CREATE INDEX IF NOT EXISTS "ScanResult_organizationId_idx"
  ON "ScanResult"("organizationId");
CREATE INDEX IF NOT EXISTS "ScanResult_organizationId_status_idx"
  ON "ScanResult"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "ScanResult_organizationId_createdAt_idx"
  ON "ScanResult"("organizationId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "RiskSnapshot_organizationId_idx"
  ON "RiskSnapshot"("organizationId");
CREATE INDEX IF NOT EXISTS "RiskSnapshot_organizationId_date_idx"
  ON "RiskSnapshot"("organizationId", "date" DESC);

COMMIT;
