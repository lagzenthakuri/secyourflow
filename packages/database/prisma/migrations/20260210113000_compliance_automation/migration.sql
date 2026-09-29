-- CreateTable
CREATE TABLE "ComplianceEvidence" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "controlId" TEXT NOT NULL,
  "assetId" TEXT,
  "organizationId" TEXT NOT NULL,
  "uploadedById" TEXT,
  "currentVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ComplianceEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceEvidenceVersion" (
  "id" TEXT NOT NULL,
  "evidenceId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storagePath" TEXT NOT NULL,
  "checksum" TEXT,
  "notes" TEXT,
  "uploadedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ComplianceEvidenceVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceTrendSnapshot" (
  "id" TEXT NOT NULL,
  "frameworkId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "totalControls" INTEGER NOT NULL,
  "compliant" INTEGER NOT NULL,
  "nonCompliant" INTEGER NOT NULL,
  "partiallyCompliant" INTEGER NOT NULL,
  "notAssessed" INTEGER NOT NULL,
  "compliancePercentage" DOUBLE PRECISION NOT NULL,

  CONSTRAINT "ComplianceTrendSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComplianceEvidence_controlId_idx" ON "ComplianceEvidence"("controlId");
CREATE INDEX "ComplianceEvidence_assetId_idx" ON "ComplianceEvidence"("assetId");
CREATE INDEX "ComplianceEvidence_organizationId_idx" ON "ComplianceEvidence"("organizationId");
CREATE INDEX "ComplianceEvidence_createdAt_desc_idx" ON "ComplianceEvidence"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceEvidenceVersion_evidenceId_version_key" ON "ComplianceEvidenceVersion"("evidenceId", "version");
CREATE INDEX "ComplianceEvidenceVersion_evidenceId_idx" ON "ComplianceEvidenceVersion"("evidenceId");
CREATE INDEX "ComplianceEvidenceVersion_createdAt_desc_idx" ON "ComplianceEvidenceVersion"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "ComplianceTrendSnapshot_framework_snapshotDate_idx" ON "ComplianceTrendSnapshot"("frameworkId", "snapshotDate" DESC);
CREATE INDEX "ComplianceTrendSnapshot_org_snapshotDate_idx" ON "ComplianceTrendSnapshot"("organizationId", "snapshotDate" DESC);

-- AddForeignKey
ALTER TABLE "ComplianceEvidence"
  ADD CONSTRAINT "ComplianceEvidence_controlId_fkey"
  FOREIGN KEY ("controlId") REFERENCES "ComplianceControl"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComplianceEvidence"
  ADD CONSTRAINT "ComplianceEvidence_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ComplianceEvidence"
  ADD CONSTRAINT "ComplianceEvidence_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComplianceEvidence"
  ADD CONSTRAINT "ComplianceEvidence_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ComplianceEvidenceVersion"
  ADD CONSTRAINT "ComplianceEvidenceVersion_evidenceId_fkey"
  FOREIGN KEY ("evidenceId") REFERENCES "ComplianceEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComplianceEvidenceVersion"
  ADD CONSTRAINT "ComplianceEvidenceVersion_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ComplianceTrendSnapshot"
  ADD CONSTRAINT "ComplianceTrendSnapshot_frameworkId_fkey"
  FOREIGN KEY ("frameworkId") REFERENCES "ComplianceFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComplianceTrendSnapshot"
  ADD CONSTRAINT "ComplianceTrendSnapshot_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
