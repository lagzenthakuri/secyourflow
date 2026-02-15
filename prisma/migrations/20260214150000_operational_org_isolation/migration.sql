-- Add organization context to previously global operational tables.
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "ScannerConfig" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "ScanResult" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "RiskSnapshot" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

DO $$
DECLARE
  default_org_id TEXT;
BEGIN
  SELECT "id" INTO default_org_id
  FROM "Organization"
  ORDER BY "createdAt" ASC
  LIMIT 1;

  IF default_org_id IS NULL THEN
    default_org_id := concat('org_migration_', substring(md5(random()::text), 1, 16));
    INSERT INTO "Organization" ("id", "name", "createdAt", "updatedAt")
    VALUES (default_org_id, 'Migration Organization', NOW(), NOW());
  END IF;

  UPDATE "AuditLog" AS log
  SET "organizationId" = COALESCE(u."organizationId", default_org_id)
  FROM "User" AS u
  WHERE log."organizationId" IS NULL
    AND log."userId" = u."id";

  UPDATE "AuditLog"
  SET "organizationId" = default_org_id
  WHERE "organizationId" IS NULL;

  UPDATE "ScannerConfig"
  SET "organizationId" = default_org_id
  WHERE "organizationId" IS NULL;

  UPDATE "ScanResult" AS sr
  SET "organizationId" = sc."organizationId"
  FROM "ScannerConfig" AS sc
  WHERE sr."organizationId" IS NULL
    AND sr."scannerId" = sc."id"
    AND sc."organizationId" IS NOT NULL;

  UPDATE "ScanResult"
  SET "organizationId" = default_org_id
  WHERE "organizationId" IS NULL;

  UPDATE "RiskSnapshot"
  SET "organizationId" = default_org_id
  WHERE "organizationId" IS NULL;
END $$;

ALTER TABLE "AuditLog" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ScannerConfig" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ScanResult" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "RiskSnapshot" ALTER COLUMN "organizationId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AuditLog_organizationId_fkey'
  ) THEN
    ALTER TABLE "AuditLog"
      ADD CONSTRAINT "AuditLog_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ScannerConfig_organizationId_fkey'
  ) THEN
    ALTER TABLE "ScannerConfig"
      ADD CONSTRAINT "ScannerConfig_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ScanResult_organizationId_fkey'
  ) THEN
    ALTER TABLE "ScanResult"
      ADD CONSTRAINT "ScanResult_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'RiskSnapshot_organizationId_fkey'
  ) THEN
    ALTER TABLE "RiskSnapshot"
      ADD CONSTRAINT "RiskSnapshot_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ScannerConfig_organizationId_idx" ON "ScannerConfig"("organizationId");
CREATE INDEX IF NOT EXISTS "ScanResult_organizationId_idx" ON "ScanResult"("organizationId");
CREATE INDEX IF NOT EXISTS "ScanResult_organizationId_startTime_idx" ON "ScanResult"("organizationId", "startTime" DESC);
CREATE INDEX IF NOT EXISTS "ScanResult_organizationId_status_idx" ON "ScanResult"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "RiskSnapshot_organizationId_idx" ON "RiskSnapshot"("organizationId");
CREATE INDEX IF NOT EXISTS "RiskSnapshot_organizationId_date_idx" ON "RiskSnapshot"("organizationId", "date" DESC);
