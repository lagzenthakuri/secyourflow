-- Background job history, plus integrity fixes for the risk register.
--
-- Hand-written rather than generated: `prisma migrate diff` wanted to DROP and
-- re-add RiskRegister.status, which would erase the state of every existing
-- assessment. The conversion below is done in place with a USING cast.

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE TYPE "RiskEntryStatus" AS ENUM ('PROCESSING', 'ACTIVE', 'FAILED', 'SUPERSEDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
CREATE TYPE "RiskAnalysisSource" AS ENUM ('AI', 'DETERMINISTIC');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 1. De-duplicate RiskRegister before the unique constraint goes on.
--
-- The engine created a new row per analysis run instead of upserting, so a
-- vulnerability-on-asset can have many. Keep the most useful one: a completed
-- ACTIVE assessment first, then the most recently updated.
-- ---------------------------------------------------------------------------
DELETE FROM "RiskRegister" r
USING (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "organizationId", "assetId", "vulnerabilityId"
      ORDER BY
        CASE WHEN "status" = 'ACTIVE' THEN 0 ELSE 1 END,
        "updatedAt" DESC,
        "createdAt" DESC
    ) AS rn
  FROM "RiskRegister"
) ranked
WHERE r.id = ranked.id AND ranked.rn > 1;

-- ---------------------------------------------------------------------------
-- 2. Provenance. Rows the old engine produced from its hardcoded fallback are
--    identifiable by the remarks string it stamped on them. Anything else is
--    treated as model output. Misclassification errs toward DETERMINISTIC,
--    which understates rather than overstates AI involvement.
-- ---------------------------------------------------------------------------
ALTER TABLE "RiskRegister"
  ADD COLUMN IF NOT EXISTS "analysisSource" "RiskAnalysisSource" NOT NULL DEFAULT 'DETERMINISTIC',
  ADD COLUMN IF NOT EXISTS "failureReason" TEXT;

UPDATE "RiskRegister"
SET "analysisSource" = 'AI'
WHERE "aiAnalysis" ? 'remarks'
  AND COALESCE("aiAnalysis" ->> 'remarks', '') <> 'Generated from mock fallback'
  AND "status" = 'ACTIVE';

-- ---------------------------------------------------------------------------
-- 3. Convert status to an enum in place.
--
-- Rows left in PROCESSING are orphans: the old code path started an analysis
-- outside the request lifetime and nothing ever reaped them, so the UI showed
-- "AI Risk Assessment in progress..." forever. Retire them to FAILED so they
-- become retryable.
-- ---------------------------------------------------------------------------
UPDATE "RiskRegister" SET "status" = 'FAILED' WHERE "status" = 'PROCESSING';
UPDATE "RiskRegister"
SET "failureReason" = 'Analysis was interrupted before background job processing existed. Re-run to assess.'
WHERE "status" = 'FAILED' AND "failureReason" IS NULL;

-- Anything outside the known set becomes FAILED rather than blocking the cast.
UPDATE "RiskRegister"
SET "status" = 'FAILED'
WHERE "status" NOT IN ('PROCESSING', 'ACTIVE', 'FAILED', 'SUPERSEDED');

ALTER TABLE "RiskRegister"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "RiskRegister"
  ALTER COLUMN "status" TYPE "RiskEntryStatus" USING "status"::"RiskEntryStatus";

ALTER TABLE "RiskRegister"
  ALTER COLUMN "status" SET DEFAULT 'PROCESSING';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RiskRegister_organizationId_status_idx" ON "RiskRegister"("organizationId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "RiskRegister_organizationId_assetId_vulnerabilityId_key"
  ON "RiskRegister"("organizationId", "assetId", "vulnerabilityId");

-- ---------------------------------------------------------------------------
-- 4. Per-organization AI credential (sealed with AES-256-GCM by the app).
-- ---------------------------------------------------------------------------
ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "aiApiKey" TEXT;

-- ---------------------------------------------------------------------------
-- 5. Background job history.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "JobRun" (
    "id" TEXT NOT NULL,
    "queue" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "jobId" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "organizationId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "payload" JSONB,
    "result" JSONB,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "JobRun_organizationId_status_idx" ON "JobRun"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "JobRun_queue_status_idx" ON "JobRun"("queue", "status");
CREATE INDEX IF NOT EXISTS "JobRun_entityType_entityId_idx" ON "JobRun"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "JobRun_status_createdAt_idx" ON "JobRun"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "JobRun_createdAt_idx" ON "JobRun"("createdAt" DESC);

DO $$ BEGIN
ALTER TABLE "JobRun" ADD CONSTRAINT "JobRun_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
