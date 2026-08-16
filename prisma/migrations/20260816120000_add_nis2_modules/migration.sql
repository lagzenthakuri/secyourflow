-- CreateEnum
CREATE TYPE "Nis2Article21Measure" AS ENUM ('RISK_ANALYSIS', 'INCIDENT_HANDLING', 'BUSINESS_CONTINUITY', 'SUPPLY_CHAIN', 'SECURE_ACQUISITION', 'EFFECTIVENESS_ASSESSMENT', 'CYBER_HYGIENE', 'CRYPTOGRAPHY', 'HUMAN_RESOURCES', 'ACCESS_CONTROL');

-- CreateEnum
CREATE TYPE "Nis2VerificationMode" AS ENUM ('AUTOMATED', 'PARTIAL', 'MANUAL');

-- CreateEnum
CREATE TYPE "Nis2ChecklistStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'IMPLEMENTED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "Nis2IncidentPhase" AS ENUM ('EARLY_WARNING', 'INCIDENT_NOTIFICATION', 'FINAL_REPORT', 'COMPLETE');

-- CreateEnum
CREATE TYPE "Nis2IncidentStatus" AS ENUM ('OPEN', 'CONTAINED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Nis2DeadlineAlertKind" AS ENUM ('PRE_DEADLINE', 'BREACH');

-- CreateEnum
CREATE TYPE "Nis2VendorCriticality" AS ENUM ('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4');

-- CreateEnum
CREATE TYPE "Nis2DataAccessLevel" AS ENUM ('NONE', 'PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "Nis2ProcessCriticality" AS ENUM ('VITAL', 'CRITICAL', 'IMPORTANT', 'SUPPORTING');

-- CreateTable
CREATE TABLE "Nis2ChecklistItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "measure" "Nis2Article21Measure" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "verificationMode" "Nis2VerificationMode" NOT NULL DEFAULT 'MANUAL',
    "status" "Nis2ChecklistStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "ownerId" TEXT,
    "dueDate" TIMESTAMP(3),
    "documentUrl" TEXT,
    "notes" TEXT,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "escalationReason" TEXT,
    "escalatedAt" TIMESTAMP(3),
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nis2ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nis2Incident" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'HIGH',
    "status" "Nis2IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "phase" "Nis2IncidentPhase" NOT NULL DEFAULT 'EARLY_WARNING',
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "earlyWarningDueAt" TIMESTAMP(3) NOT NULL,
    "notificationDueAt" TIMESTAMP(3) NOT NULL,
    "finalReportDueAt" TIMESTAMP(3) NOT NULL,
    "earlyWarningSubmittedAt" TIMESTAMP(3),
    "notificationSubmittedAt" TIMESTAMP(3),
    "finalReportSubmittedAt" TIMESTAMP(3),
    "earlyWarningPayload" JSONB,
    "notificationPayload" JSONB,
    "finalReportPayload" JSONB,
    "significantImpact" BOOLEAN NOT NULL DEFAULT true,
    "crossBorder" BOOLEAN NOT NULL DEFAULT false,
    "taxonomy" TEXT,
    "iocs" JSONB,
    "affectedUsersEstimate" INTEGER,
    "reportedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nis2Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nis2IncidentAsset" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nis2IncidentAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nis2IncidentTimelineEntry" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nis2IncidentTimelineEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nis2IncidentAlert" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "phase" "Nis2IncidentPhase" NOT NULL,
    "kind" "Nis2DeadlineAlertKind" NOT NULL,
    "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nis2IncidentAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nis2Vendor" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serviceProvided" TEXT NOT NULL,
    "criticality" "Nis2VendorCriticality" NOT NULL DEFAULT 'LEVEL_3',
    "dataAccessLevel" "Nis2DataAccessLevel" NOT NULL DEFAULT 'NONE',
    "country" TEXT,
    "euBased" BOOLEAN NOT NULL DEFAULT false,
    "certifications" TEXT[],
    "contractStart" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "slaDefined" BOOLEAN NOT NULL DEFAULT false,
    "auditRights" BOOLEAN NOT NULL DEFAULT false,
    "securityClauses" BOOLEAN NOT NULL DEFAULT false,
    "breachNotifiedIn" INTEGER,
    "lastAuditAt" TIMESTAMP(3),
    "securityScore" INTEGER,
    "scoreBreakdown" JSONB,
    "scoredAt" TIMESTAMP(3),
    "acnRelevant" BOOLEAN NOT NULL DEFAULT false,
    "contactEmail" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nis2Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nis2BusinessProcess" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner" TEXT,
    "criticality" "Nis2ProcessCriticality" NOT NULL DEFAULT 'IMPORTANT',
    "rtoHours" INTEGER,
    "rpoHours" INTEGER,
    "mtpdHours" INTEGER,
    "financialImpact" INTEGER NOT NULL DEFAULT 1,
    "operationalImpact" INTEGER NOT NULL DEFAULT 1,
    "reputationalImpact" INTEGER NOT NULL DEFAULT 1,
    "regulatoryImpact" INTEGER NOT NULL DEFAULT 1,
    "safetyImpact" INTEGER NOT NULL DEFAULT 1,
    "impactScore" DOUBLE PRECISION,
    "bcpDocumented" BOOLEAN NOT NULL DEFAULT false,
    "drpDocumented" BOOLEAN NOT NULL DEFAULT false,
    "lastTestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nis2BusinessProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nis2ProcessAssetDependency" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nis2ProcessAssetDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nis2ProcessVendorDependency" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nis2ProcessVendorDependency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Nis2ChecklistItem_organizationId_idx" ON "Nis2ChecklistItem"("organizationId");

-- CreateIndex
CREATE INDEX "Nis2ChecklistItem_organizationId_measure_idx" ON "Nis2ChecklistItem"("organizationId", "measure");

-- CreateIndex
CREATE INDEX "Nis2ChecklistItem_organizationId_status_idx" ON "Nis2ChecklistItem"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Nis2ChecklistItem_organizationId_escalated_idx" ON "Nis2ChecklistItem"("organizationId", "escalated");

-- CreateIndex
CREATE INDEX "Nis2ChecklistItem_ownerId_idx" ON "Nis2ChecklistItem"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Nis2ChecklistItem_organizationId_code_key" ON "Nis2ChecklistItem"("organizationId", "code");

-- CreateIndex
CREATE INDEX "Nis2Incident_organizationId_idx" ON "Nis2Incident"("organizationId");

-- CreateIndex
CREATE INDEX "Nis2Incident_organizationId_status_idx" ON "Nis2Incident"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Nis2Incident_organizationId_phase_idx" ON "Nis2Incident"("organizationId", "phase");

-- CreateIndex
CREATE INDEX "Nis2Incident_organizationId_detectedAt_idx" ON "Nis2Incident"("organizationId", "detectedAt" DESC);

-- CreateIndex
CREATE INDEX "Nis2Incident_earlyWarningDueAt_idx" ON "Nis2Incident"("earlyWarningDueAt");

-- CreateIndex
CREATE INDEX "Nis2Incident_notificationDueAt_idx" ON "Nis2Incident"("notificationDueAt");

-- CreateIndex
CREATE INDEX "Nis2Incident_finalReportDueAt_idx" ON "Nis2Incident"("finalReportDueAt");

-- CreateIndex
CREATE INDEX "Nis2Incident_reportedById_idx" ON "Nis2Incident"("reportedById");

-- CreateIndex
CREATE UNIQUE INDEX "Nis2Incident_organizationId_reference_key" ON "Nis2Incident"("organizationId", "reference");

-- CreateIndex
CREATE INDEX "Nis2IncidentAsset_assetId_idx" ON "Nis2IncidentAsset"("assetId");

-- CreateIndex
CREATE INDEX "Nis2IncidentAsset_organizationId_idx" ON "Nis2IncidentAsset"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Nis2IncidentAsset_incidentId_assetId_key" ON "Nis2IncidentAsset"("incidentId", "assetId");

-- CreateIndex
CREATE INDEX "Nis2IncidentTimelineEntry_incidentId_occurredAt_idx" ON "Nis2IncidentTimelineEntry"("incidentId", "occurredAt");

-- CreateIndex
CREATE INDEX "Nis2IncidentTimelineEntry_authorId_idx" ON "Nis2IncidentTimelineEntry"("authorId");

-- CreateIndex
CREATE INDEX "Nis2IncidentAlert_incidentId_idx" ON "Nis2IncidentAlert"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "Nis2IncidentAlert_incidentId_phase_kind_key" ON "Nis2IncidentAlert"("incidentId", "phase", "kind");

-- CreateIndex
CREATE INDEX "Nis2Vendor_organizationId_idx" ON "Nis2Vendor"("organizationId");

-- CreateIndex
CREATE INDEX "Nis2Vendor_organizationId_criticality_idx" ON "Nis2Vendor"("organizationId", "criticality");

-- CreateIndex
CREATE INDEX "Nis2Vendor_organizationId_acnRelevant_idx" ON "Nis2Vendor"("organizationId", "acnRelevant");

-- CreateIndex
CREATE INDEX "Nis2Vendor_securityScore_idx" ON "Nis2Vendor"("securityScore");

-- CreateIndex
CREATE UNIQUE INDEX "Nis2Vendor_organizationId_name_key" ON "Nis2Vendor"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Nis2BusinessProcess_organizationId_idx" ON "Nis2BusinessProcess"("organizationId");

-- CreateIndex
CREATE INDEX "Nis2BusinessProcess_organizationId_criticality_idx" ON "Nis2BusinessProcess"("organizationId", "criticality");

-- CreateIndex
CREATE INDEX "Nis2BusinessProcess_impactScore_idx" ON "Nis2BusinessProcess"("impactScore" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Nis2BusinessProcess_organizationId_name_key" ON "Nis2BusinessProcess"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Nis2ProcessAssetDependency_assetId_idx" ON "Nis2ProcessAssetDependency"("assetId");

-- CreateIndex
CREATE INDEX "Nis2ProcessAssetDependency_organizationId_idx" ON "Nis2ProcessAssetDependency"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Nis2ProcessAssetDependency_processId_assetId_key" ON "Nis2ProcessAssetDependency"("processId", "assetId");

-- CreateIndex
CREATE INDEX "Nis2ProcessVendorDependency_vendorId_idx" ON "Nis2ProcessVendorDependency"("vendorId");

-- CreateIndex
CREATE INDEX "Nis2ProcessVendorDependency_organizationId_idx" ON "Nis2ProcessVendorDependency"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Nis2ProcessVendorDependency_processId_vendorId_key" ON "Nis2ProcessVendorDependency"("processId", "vendorId");

-- AddForeignKey
ALTER TABLE "Nis2ChecklistItem" ADD CONSTRAINT "Nis2ChecklistItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nis2ChecklistItem" ADD CONSTRAINT "Nis2ChecklistItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nis2Incident" ADD CONSTRAINT "Nis2Incident_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nis2Incident" ADD CONSTRAINT "Nis2Incident_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nis2IncidentAsset" ADD CONSTRAINT "Nis2IncidentAsset_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Nis2Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nis2IncidentAsset" ADD CONSTRAINT "Nis2IncidentAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nis2IncidentAsset" ADD CONSTRAINT "Nis2IncidentAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nis2IncidentTimelineEntry" ADD CONSTRAINT "Nis2IncidentTimelineEntry_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Nis2Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nis2IncidentTimelineEntry" ADD CONSTRAINT "Nis2IncidentTimelineEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nis2IncidentAlert" ADD CONSTRAINT "Nis2IncidentAlert_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Nis2Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nis2Vendor" ADD CONSTRAINT "Nis2Vendor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nis2BusinessProcess" ADD CONSTRAINT "Nis2BusinessProcess_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nis2ProcessAssetDependency" ADD CONSTRAINT "Nis2ProcessAssetDependency_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Nis2BusinessProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nis2ProcessAssetDependency" ADD CONSTRAINT "Nis2ProcessAssetDependency_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nis2ProcessAssetDependency" ADD CONSTRAINT "Nis2ProcessAssetDependency_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nis2ProcessVendorDependency" ADD CONSTRAINT "Nis2ProcessVendorDependency_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Nis2BusinessProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nis2ProcessVendorDependency" ADD CONSTRAINT "Nis2ProcessVendorDependency_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Nis2Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nis2ProcessVendorDependency" ADD CONSTRAINT "Nis2ProcessVendorDependency_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Tenant integrity guards for the NIS2 join tables, matching the convention
-- established in 20260214163000_tenant_integrity_trigger_guards.

CREATE OR REPLACE FUNCTION secyourflow_enforce_nis2_incident_asset_org()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  incident_org_id TEXT;
  asset_org_id TEXT;
BEGIN
  SELECT "organizationId" INTO incident_org_id FROM "Nis2Incident" WHERE "id" = NEW."incidentId";
  SELECT "organizationId" INTO asset_org_id FROM "Asset" WHERE "id" = NEW."assetId";

  IF incident_org_id IS NULL OR asset_org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid incidentId/assetId for Nis2IncidentAsset';
  END IF;

  IF NEW."organizationId" <> incident_org_id OR NEW."organizationId" <> asset_org_id THEN
    RAISE EXCEPTION 'Nis2IncidentAsset organization mismatch with incident/asset';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'secyourflow_nis2_incident_asset_org_guard'
  ) THEN
    CREATE TRIGGER secyourflow_nis2_incident_asset_org_guard
    BEFORE INSERT OR UPDATE OF "organizationId", "incidentId", "assetId"
    ON "Nis2IncidentAsset"
    FOR EACH ROW
    EXECUTE FUNCTION secyourflow_enforce_nis2_incident_asset_org();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION secyourflow_enforce_nis2_process_asset_org()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  process_org_id TEXT;
  asset_org_id TEXT;
BEGIN
  SELECT "organizationId" INTO process_org_id FROM "Nis2BusinessProcess" WHERE "id" = NEW."processId";
  SELECT "organizationId" INTO asset_org_id FROM "Asset" WHERE "id" = NEW."assetId";

  IF process_org_id IS NULL OR asset_org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid processId/assetId for Nis2ProcessAssetDependency';
  END IF;

  IF NEW."organizationId" <> process_org_id OR NEW."organizationId" <> asset_org_id THEN
    RAISE EXCEPTION 'Nis2ProcessAssetDependency organization mismatch with process/asset';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'secyourflow_nis2_process_asset_org_guard'
  ) THEN
    CREATE TRIGGER secyourflow_nis2_process_asset_org_guard
    BEFORE INSERT OR UPDATE OF "organizationId", "processId", "assetId"
    ON "Nis2ProcessAssetDependency"
    FOR EACH ROW
    EXECUTE FUNCTION secyourflow_enforce_nis2_process_asset_org();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION secyourflow_enforce_nis2_process_vendor_org()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  process_org_id TEXT;
  vendor_org_id TEXT;
BEGIN
  SELECT "organizationId" INTO process_org_id FROM "Nis2BusinessProcess" WHERE "id" = NEW."processId";
  SELECT "organizationId" INTO vendor_org_id FROM "Nis2Vendor" WHERE "id" = NEW."vendorId";

  IF process_org_id IS NULL OR vendor_org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid processId/vendorId for Nis2ProcessVendorDependency';
  END IF;

  IF NEW."organizationId" <> process_org_id OR NEW."organizationId" <> vendor_org_id THEN
    RAISE EXCEPTION 'Nis2ProcessVendorDependency organization mismatch with process/vendor';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'secyourflow_nis2_process_vendor_org_guard'
  ) THEN
    CREATE TRIGGER secyourflow_nis2_process_vendor_org_guard
    BEFORE INSERT OR UPDATE OF "organizationId", "processId", "vendorId"
    ON "Nis2ProcessVendorDependency"
    FOR EACH ROW
    EXECUTE FUNCTION secyourflow_enforce_nis2_process_vendor_org();
  END IF;
END;
$$;
