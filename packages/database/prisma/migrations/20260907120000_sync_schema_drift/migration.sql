-- Reconciles migration history with prisma/schema.prisma.
--
-- The Policy / Audit / WazuhAlert tables, the compliance control-metadata
-- columns and enums, and ~25 performance indexes were added to schema.prisma
-- but never migrated, so `prisma migrate deploy` left production without them
-- and every subsequent `migrate dev` saw drift. This also replaces the orphaned
-- scripts/add-performance-indexes.sql, which nothing ever ran.
--
-- Written idempotently: some environments were provisioned with `prisma db
-- push` and already have parts of this, and they must not fail on deploy.

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "ControlType" AS ENUM ('PREVENTIVE', 'DETECTIVE', 'CORRECTIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "ControlFrequency" AS ENUM ('CONTINUOUS', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "NistCsfFunction" AS ENUM ('GOVERN', 'IDENTIFY', 'PROTECT', 'DETECT', 'RESPOND', 'RECOVER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "PolicyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'UNDER_REVIEW');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "AuditType" AS ENUM ('INTERNAL', 'EXTERNAL', 'REGULATORY', 'THIRD_PARTY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
CREATE TYPE "AuditStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum
ALTER TYPE "VulnSource" ADD VALUE IF NOT EXISTS 'TENABLE';

-- DropForeignKey
ALTER TABLE "Asset" DROP CONSTRAINT IF EXISTS "Asset_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT IF EXISTS "Comment_userId_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT IF EXISTS "Comment_vulnerabilityId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT IF EXISTS "Report_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT IF EXISTS "Report_userId_fkey";

-- DropForeignKey
ALTER TABLE "RiskRegister" DROP CONSTRAINT IF EXISTS "RiskRegister_assetId_fkey";

-- DropForeignKey
ALTER TABLE "RiskRegister" DROP CONSTRAINT IF EXISTS "RiskRegister_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "RiskRegister" DROP CONSTRAINT IF EXISTS "RiskRegister_vulnerabilityId_fkey";

-- DropForeignKey
ALTER TABLE "ScanResult" DROP CONSTRAINT IF EXISTS "ScanResult_scannerId_fkey";

-- DropForeignKey
ALTER TABLE "Vulnerability" DROP CONSTRAINT IF EXISTS "Vulnerability_organizationId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "AuditLog_createdAt_idx";

-- AlterTable
ALTER TABLE "AttackTactic" ALTER COLUMN "platforms" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AttackTechnique" ALTER COLUMN "platforms" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ComplianceControl" ADD COLUMN IF NOT EXISTS "controlType" "ControlType" NOT NULL DEFAULT 'PREVENTIVE',
ADD COLUMN IF NOT EXISTS "evidenceRequired" TEXT[],
ADD COLUMN IF NOT EXISTS "frequency" "ControlFrequency" NOT NULL DEFAULT 'ANNUAL',
ADD COLUMN IF NOT EXISTS "mappedControls" JSONB,
ADD COLUMN IF NOT EXISTS "maturityLevel" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "nistCsfFunction" "NistCsfFunction",
ADD COLUMN IF NOT EXISTS "ownerRole" TEXT,
ADD COLUMN IF NOT EXISTS "riskCategory" TEXT;

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "aiRiskAssessmentEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ThreatActor" ALTER COLUMN "aliases" DROP DEFAULT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Policy" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "type" TEXT,
    "url" TEXT,
    "owner" TEXT,
    "lastReview" TIMESTAMP(3),
    "nextReview" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Audit" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "AuditType" NOT NULL DEFAULT 'INTERNAL',
    "status" "AuditStatus" NOT NULL DEFAULT 'PLANNED',
    "scope" TEXT,
    "findings" TEXT,
    "recommendations" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "auditor" TEXT,
    "reportUrl" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WazuhAlert" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "ruleId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "raw" JSONB NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WazuhAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Policy_organizationId_idx" ON "Policy"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Policy_status_idx" ON "Policy"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Audit_organizationId_idx" ON "Audit"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Audit_status_idx" ON "Audit"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Audit_type_idx" ON "Audit"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WazuhAlert_organizationId_idx" ON "WazuhAlert"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WazuhAlert_level_idx" ON "WazuhAlert"("level");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WazuhAlert_ruleId_idx" ON "WazuhAlert"("ruleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WazuhAlert_agentId_idx" ON "WazuhAlert"("agentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WazuhAlert_timestamp_idx" ON "WazuhAlert"("timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Asset_organizationId_criticality_idx" ON "Asset"("organizationId", "criticality");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Asset_organizationId_environment_idx" ON "Asset"("organizationId", "environment");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Asset_organizationId_status_idx" ON "Asset"("organizationId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Asset_organizationId_type_idx" ON "Asset"("organizationId", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Asset_location_idx" ON "Asset"("location");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Asset_hostname_idx" ON "Asset"("hostname");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_createdAt_idx" ON "AuditLog"("entityType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ComplianceControl_maturityLevel_idx" ON "ComplianceControl"("maturityLevel");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ComplianceControl_nistCsfFunction_idx" ON "ComplianceControl"("nistCsfFunction");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ComplianceControl_frameworkId_status_idx" ON "ComplianceControl"("frameworkId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RiskRegister_organizationId_status_idx" ON "RiskRegister"("organizationId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RiskRegister_riskScore_idx" ON "RiskRegister"("riskScore" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RiskRegister_organizationId_riskScore_idx" ON "RiskRegister"("organizationId", "riskScore" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RiskRegister_createdAt_idx" ON "RiskRegister"("createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RiskRegister_assetId_vulnerabilityId_idx" ON "RiskRegister"("assetId", "vulnerabilityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Vulnerability_organizationId_severity_idx" ON "Vulnerability"("organizationId", "severity");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Vulnerability_organizationId_status_idx" ON "Vulnerability"("organizationId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Vulnerability_organizationId_isExploited_idx" ON "Vulnerability"("organizationId", "isExploited");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Vulnerability_organizationId_cisaKev_idx" ON "Vulnerability"("organizationId", "cisaKev");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Vulnerability_createdAt_idx" ON "Vulnerability"("createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Vulnerability_severity_status_idx" ON "Vulnerability"("severity", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Vulnerability_epssScore_idx" ON "Vulnerability"("epssScore" DESC);

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Vulnerability" ADD CONSTRAINT "Vulnerability_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_vulnerabilityId_fkey" FOREIGN KEY ("vulnerabilityId") REFERENCES "Vulnerability"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "ScanResult" ADD CONSTRAINT "ScanResult_scannerId_fkey" FOREIGN KEY ("scannerId") REFERENCES "ScannerConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Report" ADD CONSTRAINT "Report_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "RiskRegister" ADD CONSTRAINT "RiskRegister_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "RiskRegister" ADD CONSTRAINT "RiskRegister_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "RiskRegister" ADD CONSTRAINT "RiskRegister_vulnerabilityId_fkey" FOREIGN KEY ("vulnerabilityId") REFERENCES "Vulnerability"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey
DO $$ BEGIN
ALTER TABLE "WazuhAlert" ADD CONSTRAINT "WazuhAlert_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'AssetRelationship_parentAssetId_childAssetId_relationshipType_k')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'AssetRelationship_parentAssetId_childAssetId_relationshipTy_key') THEN
    ALTER INDEX "AssetRelationship_parentAssetId_childAssetId_relationshipType_k" RENAME TO "AssetRelationship_parentAssetId_childAssetId_relationshipTy_key";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'AttackTechniqueTactic_technique_tactic_key')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'AttackTechniqueTactic_techniqueId_tacticId_key') THEN
    ALTER INDEX "AttackTechniqueTactic_technique_tactic_key" RENAME TO "AttackTechniqueTactic_techniqueId_tacticId_key";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ComplianceEvidence_createdAt_desc_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ComplianceEvidence_createdAt_idx') THEN
    ALTER INDEX "ComplianceEvidence_createdAt_desc_idx" RENAME TO "ComplianceEvidence_createdAt_idx";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ComplianceEvidenceVersion_createdAt_desc_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ComplianceEvidenceVersion_createdAt_idx') THEN
    ALTER INDEX "ComplianceEvidenceVersion_createdAt_desc_idx" RENAME TO "ComplianceEvidenceVersion_createdAt_idx";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ComplianceTrendSnapshot_framework_snapshotDate_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ComplianceTrendSnapshot_frameworkId_snapshotDate_idx') THEN
    ALTER INDEX "ComplianceTrendSnapshot_framework_snapshotDate_idx" RENAME TO "ComplianceTrendSnapshot_frameworkId_snapshotDate_idx";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ComplianceTrendSnapshot_org_snapshotDate_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ComplianceTrendSnapshot_organizationId_snapshotDate_idx') THEN
    ALTER INDEX "ComplianceTrendSnapshot_org_snapshotDate_idx" RENAME TO "ComplianceTrendSnapshot_organizationId_snapshotDate_idx";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'DashboardViewShare_dashboardViewId_sharedWithUserId_sharedWithR')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'DashboardViewShare_dashboardViewId_sharedWithUserId_sharedW_key') THEN
    ALTER INDEX "DashboardViewShare_dashboardViewId_sharedWithUserId_sharedWithR" RENAME TO "DashboardViewShare_dashboardViewId_sharedWithUserId_sharedW_key";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ThreatActorTechnique_actor_tech_key')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ThreatActorTechnique_actorId_techniqueId_key') THEN
    ALTER INDEX "ThreatActorTechnique_actor_tech_key" RENAME TO "ThreatActorTechnique_actorId_techniqueId_key";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ThreatCampaignTechnique_campaign_tech_key')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ThreatCampaignTechnique_campaignId_techniqueId_key') THEN
    ALTER INDEX "ThreatCampaignTechnique_campaign_tech_key" RENAME TO "ThreatCampaignTechnique_campaignId_techniqueId_key";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ThreatFeedRun_org_startedAt_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ThreatFeedRun_organizationId_startedAt_idx') THEN
    ALTER INDEX "ThreatFeedRun_org_startedAt_idx" RENAME TO "ThreatFeedRun_organizationId_startedAt_idx";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ThreatIndicator_org_type_norm_feed_key')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ThreatIndicator_organizationId_type_normalizedValue_feedId_key') THEN
    ALTER INDEX "ThreatIndicator_org_type_norm_feed_key" RENAME TO "ThreatIndicator_organizationId_type_normalizedValue_feedId_key";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ThreatIndicatorMatch_asset_status_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ThreatIndicatorMatch_assetId_status_idx') THEN
    ALTER INDEX "ThreatIndicatorMatch_asset_status_idx" RENAME TO "ThreatIndicatorMatch_assetId_status_idx";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ThreatIndicatorMatch_indicator_asset_field_key')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ThreatIndicatorMatch_indicatorId_assetId_matchField_key') THEN
    ALTER INDEX "ThreatIndicatorMatch_indicator_asset_field_key" RENAME TO "ThreatIndicatorMatch_indicatorId_assetId_matchField_key";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ThreatIndicatorMatch_org_status_idx')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ThreatIndicatorMatch_organizationId_status_idx') THEN
    ALTER INDEX "ThreatIndicatorMatch_org_status_idx" RENAME TO "ThreatIndicatorMatch_organizationId_status_idx";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'VulnAttackTechnique_vuln_tech_source_key')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'VulnerabilityAttackTechnique_vulnerabilityId_techniqueId_ma_key') THEN
    ALTER INDEX "VulnAttackTechnique_vuln_tech_source_key" RENAME TO "VulnerabilityAttackTechnique_vulnerabilityId_techniqueId_ma_key";
  END IF;
END $$;

-- RenameIndex
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'VulnerabilityThreatActor_vuln_actor_source_key')
     AND NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'VulnerabilityThreatActor_vulnerabilityId_actorId_source_key') THEN
    ALTER INDEX "VulnerabilityThreatActor_vuln_actor_source_key" RENAME TO "VulnerabilityThreatActor_vulnerabilityId_actorId_source_key";
  END IF;
END $$;
