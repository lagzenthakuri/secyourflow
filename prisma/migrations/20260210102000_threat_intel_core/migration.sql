-- CreateEnum
CREATE TYPE "ThreatFeedFormat" AS ENUM ('JSON', 'CSV', 'TAXII');

-- CreateEnum
CREATE TYPE "AttackMappingSource" AS ENUM ('CVE_REFERENCE', 'CWE_MAPPING', 'MANUAL', 'ACTOR_REFERENCE', 'TECHNIQUE_INFERENCE');

-- CreateEnum
CREATE TYPE "ThreatMatchStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'RESOLVED');

-- AlterTable ThreatFeed (org scoping + ingest metadata)
ALTER TABLE "ThreatFeed"
  ADD COLUMN "format" "ThreatFeedFormat" NOT NULL DEFAULT 'JSON',
  ADD COLUMN "checkpoint" TEXT,
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "organizationId" TEXT;

-- AlterTable ThreatIndicator (org scoping + normalized IOC)
ALTER TABLE "ThreatIndicator"
  ADD COLUMN "normalizedValue" TEXT,
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "organizationId" TEXT;

-- Ensure at least one organization exists for backfill
INSERT INTO "Organization" ("id", "name", "createdAt", "updatedAt")
SELECT 'bootstrap-org-threat-intel', 'My Organization', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Organization");

-- Backfill ThreatFeed.organizationId using oldest org
WITH first_org AS (
  SELECT "id"
  FROM "Organization"
  ORDER BY "createdAt" ASC
  LIMIT 1
)
UPDATE "ThreatFeed"
SET "organizationId" = (SELECT "id" FROM first_org)
WHERE "organizationId" IS NULL;

-- Backfill ThreatIndicator.organizationId from parent feed
UPDATE "ThreatIndicator" ti
SET "organizationId" = tf."organizationId"
FROM "ThreatFeed" tf
WHERE ti."feedId" = tf."id"
  AND ti."organizationId" IS NULL;

-- Normalize existing indicator values for dedupe key
UPDATE "ThreatIndicator"
SET "normalizedValue" = LOWER(TRIM("value"))
WHERE "normalizedValue" IS NULL OR "normalizedValue" = '';

-- Enforce NOT NULL after backfill
ALTER TABLE "ThreatFeed"
  ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "ThreatIndicator"
  ALTER COLUMN "normalizedValue" SET NOT NULL,
  ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateTable
CREATE TABLE "ThreatFeedRun" (
  "id" TEXT NOT NULL,
  "feedId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "recordsFetched" INTEGER NOT NULL DEFAULT 0,
  "recordsCreated" INTEGER NOT NULL DEFAULT 0,
  "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
  "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
  "checkpoint" TEXT,
  "errors" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ThreatFeedRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttackTactic" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "shortName" TEXT,
  "description" TEXT,
  "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AttackTactic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttackTechnique" (
  "id" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isSubTechnique" BOOLEAN NOT NULL DEFAULT false,
  "revoked" BOOLEAN NOT NULL DEFAULT false,
  "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AttackTechnique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttackTechniqueTactic" (
  "id" TEXT NOT NULL,
  "techniqueId" TEXT NOT NULL,
  "tacticId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AttackTechniqueTactic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VulnerabilityAttackTechnique" (
  "id" TEXT NOT NULL,
  "vulnerabilityId" TEXT NOT NULL,
  "techniqueId" TEXT NOT NULL,
  "mappingSource" "AttackMappingSource" NOT NULL,
  "confidence" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VulnerabilityAttackTechnique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatIndicatorMatch" (
  "id" TEXT NOT NULL,
  "indicatorId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "matchField" TEXT NOT NULL,
  "matchValue" TEXT NOT NULL,
  "status" "ThreatMatchStatus" NOT NULL DEFAULT 'ACTIVE',
  "confidence" INTEGER,
  "firstMatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastMatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ThreatIndicatorMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatActor" (
  "id" TEXT NOT NULL,
  "externalId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "source" TEXT,
  "lastSeen" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ThreatActor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatCampaign" (
  "id" TEXT NOT NULL,
  "externalId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "firstSeen" TIMESTAMP(3),
  "lastSeen" TIMESTAMP(3),
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ThreatCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatActorTechnique" (
  "id" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "techniqueId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ThreatActorTechnique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatCampaignTechnique" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "techniqueId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ThreatCampaignTechnique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VulnerabilityThreatActor" (
  "id" TEXT NOT NULL,
  "vulnerabilityId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "source" "AttackMappingSource" NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VulnerabilityThreatActor_pkey" PRIMARY KEY ("id")
);

-- ThreatFeed / ThreatIndicator indexes and constraints
CREATE UNIQUE INDEX "ThreatFeed_organizationId_name_key" ON "ThreatFeed"("organizationId", "name");
CREATE INDEX "ThreatFeed_organizationId_idx" ON "ThreatFeed"("organizationId");

CREATE INDEX "ThreatIndicator_normalizedValue_idx" ON "ThreatIndicator"("normalizedValue");
CREATE INDEX "ThreatIndicator_organizationId_idx" ON "ThreatIndicator"("organizationId");
CREATE INDEX "ThreatIndicator_expiresAt_idx" ON "ThreatIndicator"("expiresAt");
CREATE UNIQUE INDEX "ThreatIndicator_org_type_norm_feed_key" ON "ThreatIndicator"("organizationId", "type", "normalizedValue", "feedId");

-- ThreatFeedRun indexes
CREATE INDEX "ThreatFeedRun_feedId_startedAt_idx" ON "ThreatFeedRun"("feedId", "startedAt" DESC);
CREATE INDEX "ThreatFeedRun_org_startedAt_idx" ON "ThreatFeedRun"("organizationId", "startedAt" DESC);

-- ATT&CK indexes and uniqueness
CREATE UNIQUE INDEX "AttackTactic_externalId_key" ON "AttackTactic"("externalId");
CREATE INDEX "AttackTactic_name_idx" ON "AttackTactic"("name");

CREATE UNIQUE INDEX "AttackTechnique_externalId_key" ON "AttackTechnique"("externalId");
CREATE INDEX "AttackTechnique_name_idx" ON "AttackTechnique"("name");

CREATE UNIQUE INDEX "AttackTechniqueTactic_technique_tactic_key" ON "AttackTechniqueTactic"("techniqueId", "tacticId");
CREATE INDEX "AttackTechniqueTactic_tacticId_idx" ON "AttackTechniqueTactic"("tacticId");

CREATE UNIQUE INDEX "VulnAttackTechnique_vuln_tech_source_key" ON "VulnerabilityAttackTechnique"("vulnerabilityId", "techniqueId", "mappingSource");
CREATE INDEX "VulnerabilityAttackTechnique_techniqueId_idx" ON "VulnerabilityAttackTechnique"("techniqueId");

CREATE UNIQUE INDEX "ThreatIndicatorMatch_indicator_asset_field_key" ON "ThreatIndicatorMatch"("indicatorId", "assetId", "matchField");
CREATE INDEX "ThreatIndicatorMatch_org_status_idx" ON "ThreatIndicatorMatch"("organizationId", "status");
CREATE INDEX "ThreatIndicatorMatch_asset_status_idx" ON "ThreatIndicatorMatch"("assetId", "status");

CREATE UNIQUE INDEX "ThreatActor_externalId_key" ON "ThreatActor"("externalId");
CREATE INDEX "ThreatActor_name_idx" ON "ThreatActor"("name");

CREATE UNIQUE INDEX "ThreatCampaign_externalId_key" ON "ThreatCampaign"("externalId");
CREATE INDEX "ThreatCampaign_name_idx" ON "ThreatCampaign"("name");
CREATE INDEX "ThreatCampaign_actorId_idx" ON "ThreatCampaign"("actorId");

CREATE UNIQUE INDEX "ThreatActorTechnique_actor_tech_key" ON "ThreatActorTechnique"("actorId", "techniqueId");
CREATE INDEX "ThreatActorTechnique_techniqueId_idx" ON "ThreatActorTechnique"("techniqueId");

CREATE UNIQUE INDEX "ThreatCampaignTechnique_campaign_tech_key" ON "ThreatCampaignTechnique"("campaignId", "techniqueId");
CREATE INDEX "ThreatCampaignTechnique_techniqueId_idx" ON "ThreatCampaignTechnique"("techniqueId");

CREATE UNIQUE INDEX "VulnerabilityThreatActor_vuln_actor_source_key" ON "VulnerabilityThreatActor"("vulnerabilityId", "actorId", "source");
CREATE INDEX "VulnerabilityThreatActor_actorId_idx" ON "VulnerabilityThreatActor"("actorId");

-- Foreign keys
ALTER TABLE "ThreatFeed" ADD CONSTRAINT "ThreatFeed_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ThreatIndicator" ADD CONSTRAINT "ThreatIndicator_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ThreatFeedRun" ADD CONSTRAINT "ThreatFeedRun_feedId_fkey"
  FOREIGN KEY ("feedId") REFERENCES "ThreatFeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ThreatFeedRun" ADD CONSTRAINT "ThreatFeedRun_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AttackTechniqueTactic" ADD CONSTRAINT "AttackTechniqueTactic_techniqueId_fkey"
  FOREIGN KEY ("techniqueId") REFERENCES "AttackTechnique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AttackTechniqueTactic" ADD CONSTRAINT "AttackTechniqueTactic_tacticId_fkey"
  FOREIGN KEY ("tacticId") REFERENCES "AttackTactic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VulnerabilityAttackTechnique" ADD CONSTRAINT "VulnerabilityAttackTechnique_vulnerabilityId_fkey"
  FOREIGN KEY ("vulnerabilityId") REFERENCES "Vulnerability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VulnerabilityAttackTechnique" ADD CONSTRAINT "VulnerabilityAttackTechnique_techniqueId_fkey"
  FOREIGN KEY ("techniqueId") REFERENCES "AttackTechnique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ThreatIndicatorMatch" ADD CONSTRAINT "ThreatIndicatorMatch_indicatorId_fkey"
  FOREIGN KEY ("indicatorId") REFERENCES "ThreatIndicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ThreatIndicatorMatch" ADD CONSTRAINT "ThreatIndicatorMatch_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ThreatIndicatorMatch" ADD CONSTRAINT "ThreatIndicatorMatch_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ThreatCampaign" ADD CONSTRAINT "ThreatCampaign_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "ThreatActor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ThreatActorTechnique" ADD CONSTRAINT "ThreatActorTechnique_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "ThreatActor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ThreatActorTechnique" ADD CONSTRAINT "ThreatActorTechnique_techniqueId_fkey"
  FOREIGN KEY ("techniqueId") REFERENCES "AttackTechnique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ThreatCampaignTechnique" ADD CONSTRAINT "ThreatCampaignTechnique_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "ThreatCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ThreatCampaignTechnique" ADD CONSTRAINT "ThreatCampaignTechnique_techniqueId_fkey"
  FOREIGN KEY ("techniqueId") REFERENCES "AttackTechnique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VulnerabilityThreatActor" ADD CONSTRAINT "VulnerabilityThreatActor_vulnerabilityId_fkey"
  FOREIGN KEY ("vulnerabilityId") REFERENCES "Vulnerability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VulnerabilityThreatActor" ADD CONSTRAINT "VulnerabilityThreatActor_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "ThreatActor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
