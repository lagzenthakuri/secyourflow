-- Create enums
CREATE TYPE "WorkflowState" AS ENUM ('NEW', 'TRIAGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "RemediationPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'BLOCKED', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "TicketProvider" AS ENUM ('GITHUB', 'JIRA');
CREATE TYPE "TicketSyncStatus" AS ENUM ('LINKED', 'OUT_OF_SYNC', 'ERROR', 'DISCONNECTED');
CREATE TYPE "ReportTemplateKey" AS ENUM (
  'EXECUTIVE_POSTURE',
  'RISK_TREND',
  'TOP_RISKS',
  'COMPLIANCE_SUMMARY',
  'VULN_ASSESSMENT',
  'PENTEST_FINDINGS',
  'ASSET_INVENTORY',
  'REMEDIATION_TRACKING'
);
CREATE TYPE "ReportOutputFormat" AS ENUM ('PDF', 'CSV', 'XLSX');
CREATE TYPE "ReportFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');
CREATE TYPE "AssetRelationshipType" AS ENUM ('HOSTS', 'RUNS_ON', 'DEPENDS_ON', 'CONNECTS_TO', 'CONTAINS');
CREATE TYPE "LifecycleEventType" AS ENUM (
  'CREATED',
  'TRANSFERRED',
  'OWNERSHIP_CHANGED',
  'DECOMMISSION_REQUESTED',
  'DECOMMISSIONED',
  'REACTIVATED'
);
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'WEBHOOK');

-- Alter existing core tables
ALTER TABLE "Vulnerability"
  ADD COLUMN "workflowState" "WorkflowState" NOT NULL DEFAULT 'NEW',
  ADD COLUMN "assignedUserId" TEXT,
  ADD COLUMN "assignedTeam" TEXT,
  ADD COLUMN "slaDueAt" TIMESTAMP(3),
  ADD COLUMN "triagedAt" TIMESTAMP(3),
  ADD COLUMN "resolvedAt" TIMESTAMP(3),
  ADD COLUMN "closedAt" TIMESTAMP(3);

ALTER TABLE "Report"
  ADD COLUMN "templateKey" "ReportTemplateKey",
  ADD COLUMN "outputFormat" "ReportOutputFormat",
  ADD COLUMN "scheduleId" TEXT;

-- New tables
CREATE TABLE "VulnerabilityWorkflowTransition" (
  "id" TEXT NOT NULL,
  "vulnerabilityId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "fromState" "WorkflowState",
  "toState" "WorkflowState" NOT NULL,
  "changedById" TEXT,
  "note" TEXT,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VulnerabilityWorkflowTransition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RemediationPlan" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "ownerId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "RemediationPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "dueDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RemediationPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RemediationPlanVulnerability" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "vulnerabilityId" TEXT NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RemediationPlanVulnerability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RemediationNote" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "planId" TEXT,
  "vulnerabilityId" TEXT,
  "authorId" TEXT,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RemediationNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RemediationEvidence" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "planId" TEXT,
  "vulnerabilityId" TEXT,
  "uploadedById" TEXT,
  "title" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storagePath" TEXT NOT NULL,
  "checksum" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RemediationEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalTicket" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "provider" "TicketProvider" NOT NULL,
  "syncStatus" "TicketSyncStatus" NOT NULL DEFAULT 'LINKED',
  "externalId" TEXT NOT NULL,
  "externalKey" TEXT,
  "externalUrl" TEXT,
  "externalStatus" TEXT,
  "title" TEXT,
  "payload" JSONB,
  "vulnerabilityId" TEXT,
  "planId" TEXT,
  "userId" TEXT,
  "lastSyncedAt" TIMESTAMP(3),
  "lastSyncError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExternalTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportSchedule" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "templateKey" "ReportTemplateKey" NOT NULL,
  "frequency" "ReportFrequency" NOT NULL,
  "outputFormat" "ReportOutputFormat" NOT NULL DEFAULT 'PDF',
  "recipients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "filters" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "nextRunAt" TIMESTAMP(3) NOT NULL,
  "lastRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReportSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportRun" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "scheduleId" TEXT,
  "reportId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReportRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportArtifact" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "reportRunId" TEXT NOT NULL,
  "format" "ReportOutputFormat" NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "checksum" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportArtifact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DashboardView" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "layout" JSONB NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DashboardView_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DashboardViewShare" (
  "id" TEXT NOT NULL,
  "dashboardViewId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "sharedWithUserId" TEXT,
  "sharedWithRole" "Role",
  "canEdit" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DashboardViewShare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetRelationship" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "parentAssetId" TEXT NOT NULL,
  "childAssetId" TEXT NOT NULL,
  "relationshipType" "AssetRelationshipType" NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssetRelationship_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetGroup" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdById" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssetGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetGroupMember" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetGroupMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetLifecycleEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "actorId" TEXT,
  "eventType" "LifecycleEventType" NOT NULL,
  "fromEnvironment" "Environment",
  "toEnvironment" "Environment",
  "fromOwner" TEXT,
  "toOwner" TEXT,
  "notes" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetLifecycleEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetChangeLog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "changedById" TEXT,
  "field" TEXT NOT NULL,
  "oldValue" JSONB,
  "newValue" JSONB,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetChangeLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetDiscoveryRun" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "discoveredCount" INTEGER NOT NULL DEFAULT 0,
  "createdCount" INTEGER NOT NULL DEFAULT 0,
  "updatedCount" INTEGER NOT NULL DEFAULT 0,
  "rawInput" JSONB,
  "errorMessage" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssetDiscoveryRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetDiscoveryRunAsset" (
  "id" TEXT NOT NULL,
  "discoveryRunId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  CONSTRAINT "AssetDiscoveryRunAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationRule" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
  "eventType" TEXT NOT NULL,
  "minimumSeverity" "Severity",
  "includeExploited" BOOLEAN NOT NULL DEFAULT false,
  "includeKev" BOOLEAN NOT NULL DEFAULT false,
  "recipients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "webhookUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "RemediationPlanVulnerability_planId_vulnerabilityId_key" ON "RemediationPlanVulnerability"("planId", "vulnerabilityId");
CREATE UNIQUE INDEX "ExternalTicket_provider_externalId_key" ON "ExternalTicket"("provider", "externalId");
CREATE UNIQUE INDEX "DashboardViewShare_dashboardViewId_sharedWithUserId_sharedWithRole_key" ON "DashboardViewShare"("dashboardViewId", "sharedWithUserId", "sharedWithRole");
CREATE UNIQUE INDEX "AssetRelationship_parentAssetId_childAssetId_relationshipType_key" ON "AssetRelationship"("parentAssetId", "childAssetId", "relationshipType");
CREATE UNIQUE INDEX "AssetGroup_organizationId_name_key" ON "AssetGroup"("organizationId", "name");
CREATE UNIQUE INDEX "AssetGroupMember_groupId_assetId_key" ON "AssetGroupMember"("groupId", "assetId");
CREATE UNIQUE INDEX "AssetDiscoveryRunAsset_discoveryRunId_assetId_key" ON "AssetDiscoveryRunAsset"("discoveryRunId", "assetId");

-- Indexes
CREATE INDEX "Vulnerability_workflowState_idx" ON "Vulnerability"("workflowState");
CREATE INDEX "Vulnerability_slaDueAt_idx" ON "Vulnerability"("slaDueAt");
CREATE INDEX "Vulnerability_assignedUserId_idx" ON "Vulnerability"("assignedUserId");
CREATE INDEX "Vulnerability_organizationId_workflowState_idx" ON "Vulnerability"("organizationId", "workflowState");
CREATE INDEX "Vulnerability_organizationId_slaDueAt_idx" ON "Vulnerability"("organizationId", "slaDueAt");
CREATE INDEX "Report_scheduleId_idx" ON "Report"("scheduleId");

CREATE INDEX "VulnerabilityWorkflowTransition_vulnerabilityId_changedAt_idx" ON "VulnerabilityWorkflowTransition"("vulnerabilityId", "changedAt" DESC);
CREATE INDEX "VulnerabilityWorkflowTransition_organizationId_changedAt_idx" ON "VulnerabilityWorkflowTransition"("organizationId", "changedAt" DESC);
CREATE INDEX "VulnerabilityWorkflowTransition_changedById_idx" ON "VulnerabilityWorkflowTransition"("changedById");

CREATE INDEX "RemediationPlan_organizationId_status_idx" ON "RemediationPlan"("organizationId", "status");
CREATE INDEX "RemediationPlan_organizationId_dueDate_idx" ON "RemediationPlan"("organizationId", "dueDate");
CREATE INDEX "RemediationPlan_ownerId_idx" ON "RemediationPlan"("ownerId");
CREATE INDEX "RemediationPlanVulnerability_vulnerabilityId_idx" ON "RemediationPlanVulnerability"("vulnerabilityId");
CREATE INDEX "RemediationNote_organizationId_createdAt_idx" ON "RemediationNote"("organizationId", "createdAt" DESC);
CREATE INDEX "RemediationNote_planId_idx" ON "RemediationNote"("planId");
CREATE INDEX "RemediationNote_vulnerabilityId_idx" ON "RemediationNote"("vulnerabilityId");
CREATE INDEX "RemediationNote_authorId_idx" ON "RemediationNote"("authorId");
CREATE INDEX "RemediationEvidence_organizationId_createdAt_idx" ON "RemediationEvidence"("organizationId", "createdAt" DESC);
CREATE INDEX "RemediationEvidence_planId_idx" ON "RemediationEvidence"("planId");
CREATE INDEX "RemediationEvidence_vulnerabilityId_idx" ON "RemediationEvidence"("vulnerabilityId");
CREATE INDEX "RemediationEvidence_uploadedById_idx" ON "RemediationEvidence"("uploadedById");

CREATE INDEX "ExternalTicket_organizationId_provider_idx" ON "ExternalTicket"("organizationId", "provider");
CREATE INDEX "ExternalTicket_syncStatus_lastSyncedAt_idx" ON "ExternalTicket"("syncStatus", "lastSyncedAt");
CREATE INDEX "ExternalTicket_vulnerabilityId_idx" ON "ExternalTicket"("vulnerabilityId");
CREATE INDEX "ExternalTicket_planId_idx" ON "ExternalTicket"("planId");

CREATE INDEX "ReportSchedule_organizationId_isActive_idx" ON "ReportSchedule"("organizationId", "isActive");
CREATE INDEX "ReportSchedule_nextRunAt_isActive_idx" ON "ReportSchedule"("nextRunAt", "isActive");
CREATE INDEX "ReportSchedule_userId_idx" ON "ReportSchedule"("userId");
CREATE INDEX "ReportRun_organizationId_createdAt_idx" ON "ReportRun"("organizationId", "createdAt" DESC);
CREATE INDEX "ReportRun_scheduleId_createdAt_idx" ON "ReportRun"("scheduleId", "createdAt" DESC);
CREATE INDEX "ReportRun_status_idx" ON "ReportRun"("status");
CREATE INDEX "ReportArtifact_reportRunId_idx" ON "ReportArtifact"("reportRunId");
CREATE INDEX "ReportArtifact_organizationId_createdAt_idx" ON "ReportArtifact"("organizationId", "createdAt" DESC);

CREATE INDEX "DashboardView_organizationId_userId_idx" ON "DashboardView"("organizationId", "userId");
CREATE INDEX "DashboardView_organizationId_isDefault_idx" ON "DashboardView"("organizationId", "isDefault");
CREATE INDEX "DashboardViewShare_organizationId_sharedWithRole_idx" ON "DashboardViewShare"("organizationId", "sharedWithRole");
CREATE INDEX "DashboardViewShare_sharedWithUserId_idx" ON "DashboardViewShare"("sharedWithUserId");

CREATE INDEX "AssetRelationship_organizationId_parentAssetId_idx" ON "AssetRelationship"("organizationId", "parentAssetId");
CREATE INDEX "AssetRelationship_organizationId_childAssetId_idx" ON "AssetRelationship"("organizationId", "childAssetId");
CREATE INDEX "AssetGroup_organizationId_idx" ON "AssetGroup"("organizationId");
CREATE INDEX "AssetGroupMember_assetId_idx" ON "AssetGroupMember"("assetId");
CREATE INDEX "AssetLifecycleEvent_assetId_occurredAt_idx" ON "AssetLifecycleEvent"("assetId", "occurredAt" DESC);
CREATE INDEX "AssetLifecycleEvent_organizationId_occurredAt_idx" ON "AssetLifecycleEvent"("organizationId", "occurredAt" DESC);
CREATE INDEX "AssetChangeLog_assetId_changedAt_idx" ON "AssetChangeLog"("assetId", "changedAt" DESC);
CREATE INDEX "AssetChangeLog_organizationId_changedAt_idx" ON "AssetChangeLog"("organizationId", "changedAt" DESC);
CREATE INDEX "AssetDiscoveryRun_organizationId_startedAt_idx" ON "AssetDiscoveryRun"("organizationId", "startedAt" DESC);
CREATE INDEX "AssetDiscoveryRun_source_status_idx" ON "AssetDiscoveryRun"("source", "status");
CREATE INDEX "AssetDiscoveryRunAsset_assetId_idx" ON "AssetDiscoveryRunAsset"("assetId");

CREATE INDEX "NotificationRule_organizationId_isActive_idx" ON "NotificationRule"("organizationId", "isActive");
CREATE INDEX "NotificationRule_userId_isActive_idx" ON "NotificationRule"("userId", "isActive");
CREATE INDEX "NotificationRule_eventType_idx" ON "NotificationRule"("eventType");

-- Foreign keys
ALTER TABLE "Vulnerability"
  ADD CONSTRAINT "Vulnerability_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ReportSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VulnerabilityWorkflowTransition"
  ADD CONSTRAINT "VulnerabilityWorkflowTransition_vulnerabilityId_fkey" FOREIGN KEY ("vulnerabilityId") REFERENCES "Vulnerability"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "VulnerabilityWorkflowTransition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "VulnerabilityWorkflowTransition_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RemediationPlan"
  ADD CONSTRAINT "RemediationPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RemediationPlan_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RemediationPlanVulnerability"
  ADD CONSTRAINT "RemediationPlanVulnerability_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RemediationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RemediationPlanVulnerability_vulnerabilityId_fkey" FOREIGN KEY ("vulnerabilityId") REFERENCES "Vulnerability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RemediationNote"
  ADD CONSTRAINT "RemediationNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RemediationNote_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RemediationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RemediationNote_vulnerabilityId_fkey" FOREIGN KEY ("vulnerabilityId") REFERENCES "Vulnerability"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RemediationNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RemediationEvidence"
  ADD CONSTRAINT "RemediationEvidence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RemediationEvidence_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RemediationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RemediationEvidence_vulnerabilityId_fkey" FOREIGN KEY ("vulnerabilityId") REFERENCES "Vulnerability"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "RemediationEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ExternalTicket"
  ADD CONSTRAINT "ExternalTicket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ExternalTicket_vulnerabilityId_fkey" FOREIGN KEY ("vulnerabilityId") REFERENCES "Vulnerability"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ExternalTicket_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RemediationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ExternalTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReportSchedule"
  ADD CONSTRAINT "ReportSchedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ReportSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportRun"
  ADD CONSTRAINT "ReportRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ReportRun_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ReportSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ReportRun_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReportArtifact"
  ADD CONSTRAINT "ReportArtifact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ReportArtifact_reportRunId_fkey" FOREIGN KEY ("reportRunId") REFERENCES "ReportRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DashboardView"
  ADD CONSTRAINT "DashboardView_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DashboardView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DashboardViewShare"
  ADD CONSTRAINT "DashboardViewShare_dashboardViewId_fkey" FOREIGN KEY ("dashboardViewId") REFERENCES "DashboardView"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DashboardViewShare_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "DashboardViewShare_sharedWithUserId_fkey" FOREIGN KEY ("sharedWithUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssetRelationship"
  ADD CONSTRAINT "AssetRelationship_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AssetRelationship_parentAssetId_fkey" FOREIGN KEY ("parentAssetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AssetRelationship_childAssetId_fkey" FOREIGN KEY ("childAssetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssetGroup"
  ADD CONSTRAINT "AssetGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AssetGroup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssetGroupMember"
  ADD CONSTRAINT "AssetGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AssetGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AssetGroupMember_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssetLifecycleEvent"
  ADD CONSTRAINT "AssetLifecycleEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AssetLifecycleEvent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AssetLifecycleEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssetChangeLog"
  ADD CONSTRAINT "AssetChangeLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AssetChangeLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AssetChangeLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssetDiscoveryRun"
  ADD CONSTRAINT "AssetDiscoveryRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AssetDiscoveryRunAsset"
  ADD CONSTRAINT "AssetDiscoveryRunAsset_discoveryRunId_fkey" FOREIGN KEY ("discoveryRunId") REFERENCES "AssetDiscoveryRun"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AssetDiscoveryRunAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationRule"
  ADD CONSTRAINT "NotificationRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "NotificationRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill vulnerability workflow state from legacy status field
UPDATE "Vulnerability"
SET "workflowState" = CASE
  WHEN "status" = 'OPEN' THEN 'NEW'::"WorkflowState"
  WHEN "status" = 'IN_PROGRESS' THEN 'IN_PROGRESS'::"WorkflowState"
  WHEN "status" IN ('MITIGATED', 'FIXED') THEN 'RESOLVED'::"WorkflowState"
  WHEN "status" IN ('ACCEPTED', 'FALSE_POSITIVE') THEN 'CLOSED'::"WorkflowState"
  ELSE 'NEW'::"WorkflowState"
END;

-- Backfill SLA defaults by severity if missing
UPDATE "Vulnerability"
SET "slaDueAt" = (
  "createdAt" + CASE
    WHEN "severity" = 'CRITICAL' THEN INTERVAL '7 days'
    WHEN "severity" = 'HIGH' THEN INTERVAL '14 days'
    WHEN "severity" = 'MEDIUM' THEN INTERVAL '30 days'
    WHEN "severity" = 'LOW' THEN INTERVAL '60 days'
    ELSE INTERVAL '90 days'
  END
)
WHERE "slaDueAt" IS NULL;

-- Seed default notification rules for existing users
INSERT INTO "NotificationRule" (
  "id",
  "organizationId",
  "userId",
  "name",
  "isActive",
  "channel",
  "eventType",
  "minimumSeverity",
  "includeExploited",
  "includeKev",
  "recipients",
  "createdAt",
  "updatedAt"
)
SELECT
  'notifrule_' || md5(random()::text || clock_timestamp()::text || u."id"),
  u."organizationId",
  u."id",
  'Critical Vulnerability Alerts',
  true,
  'IN_APP'::"NotificationChannel",
  'VULNERABILITY_CREATED',
  'CRITICAL'::"Severity",
  true,
  true,
  ARRAY[]::TEXT[],
  NOW(),
  NOW()
FROM "User" u
WHERE u."organizationId" IS NOT NULL;
