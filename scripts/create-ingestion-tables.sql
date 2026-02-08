-- Create IngestionState table for CVE ingestion tracking
CREATE TABLE IF NOT EXISTS "secyourflow"."IngestionState" (
  "id" TEXT PRIMARY KEY,
  "source" TEXT UNIQUE NOT NULL,
  "lastSyncAt" TIMESTAMP(3) NOT NULL,
  "lastSuccessAt" TIMESTAMP(3),
  "status" TEXT NOT NULL,
  "errorMessage" TEXT,
  "recordsProcessed" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "IngestionState_source_idx" ON "secyourflow"."IngestionState"("source");

-- Create Cve table if it doesn't exist
CREATE TABLE IF NOT EXISTS "secyourflow"."Cve" (
  "id" TEXT PRIMARY KEY,
  "cveId" TEXT UNIQUE NOT NULL,
  "description" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL,
  "lastModifiedAt" TIMESTAMP(3) NOT NULL,
  "severity" TEXT NOT NULL,
  "cweIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "searchVector" tsvector,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "isKev" BOOLEAN NOT NULL DEFAULT false,
  "epssScore" DOUBLE PRECISION,
  "epssPercentile" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "Cve_cveId_idx" ON "secyourflow"."Cve"("cveId");
CREATE INDEX IF NOT EXISTS "Cve_epssScore_idx" ON "secyourflow"."Cve"("epssScore");
CREATE INDEX IF NOT EXISTS "Cve_isKev_severity_idx" ON "secyourflow"."Cve"("isKev", "severity");
CREATE INDEX IF NOT EXISTS "Cve_publishedAt_idx" ON "secyourflow"."Cve"("publishedAt" DESC);
CREATE INDEX IF NOT EXISTS "Cve_severity_publishedAt_idx" ON "secyourflow"."Cve"("severity", "publishedAt");
CREATE INDEX IF NOT EXISTS "Cve_status_lastModifiedAt_idx" ON "secyourflow"."Cve"("status", "lastModifiedAt");
CREATE INDEX IF NOT EXISTS "Cve_status_publishedAt_idx" ON "secyourflow"."Cve"("status", "publishedAt");

-- Create CveCvss table
CREATE TABLE IF NOT EXISTS "secyourflow"."CveCvss" (
  "id" TEXT PRIMARY KEY,
  "cveId" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "vectorString" TEXT NOT NULL,
  "baseScore" DOUBLE PRECISION NOT NULL,
  "baseSeverity" TEXT NOT NULL,
  "exploitabilityScore" DOUBLE PRECISION,
  "impactScore" DOUBLE PRECISION,
  CONSTRAINT "CveCvss_cveId_fkey" FOREIGN KEY ("cveId") REFERENCES "secyourflow"."Cve"("cveId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CveCvss_cveId_idx" ON "secyourflow"."CveCvss"("cveId");

-- Create CveCpe table
CREATE TABLE IF NOT EXISTS "secyourflow"."CveCpe" (
  "id" TEXT PRIMARY KEY,
  "cveId" TEXT NOT NULL,
  "cpeUri" TEXT NOT NULL,
  "vendor" TEXT NOT NULL,
  "product" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "versionStartIncluding" TEXT,
  "versionEndExcluding" TEXT,
  "vulnerable" BOOLEAN NOT NULL,
  CONSTRAINT "CveCpe_cveId_fkey" FOREIGN KEY ("cveId") REFERENCES "secyourflow"."Cve"("cveId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CveCpe_cveId_idx" ON "secyourflow"."CveCpe"("cveId");
CREATE INDEX IF NOT EXISTS "CveCpe_vendor_product_idx" ON "secyourflow"."CveCpe"("vendor", "product");

-- Create CveReference table
CREATE TABLE IF NOT EXISTS "secyourflow"."CveReference" (
  "id" TEXT PRIMARY KEY,
  "cveId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  CONSTRAINT "CveReference_cveId_fkey" FOREIGN KEY ("cveId") REFERENCES "secyourflow"."Cve"("cveId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CveReference_cveId_idx" ON "secyourflow"."CveReference"("cveId");

-- Create CveProvenance table
CREATE TABLE IF NOT EXISTS "secyourflow"."CveProvenance" (
  "id" TEXT PRIMARY KEY,
  "cveId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "lastUpdated" TIMESTAMP(3) NOT NULL,
  "checksum" TEXT NOT NULL,
  CONSTRAINT "CveProvenance_cveId_fkey" FOREIGN KEY ("cveId") REFERENCES "secyourflow"."Cve"("cveId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CveProvenance_cveId_source_idx" ON "secyourflow"."CveProvenance"("cveId", "source");
CREATE INDEX IF NOT EXISTS "CveProvenance_source_lastUpdated_idx" ON "secyourflow"."CveProvenance"("source", "lastUpdated" DESC);

-- Create KevEntry table
CREATE TABLE IF NOT EXISTS "secyourflow"."KevEntry" (
  "id" TEXT PRIMARY KEY,
  "cveId" TEXT UNIQUE NOT NULL,
  "vulnerabilityName" TEXT NOT NULL,
  "dateAdded" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "requiredAction" TEXT NOT NULL,
  "notes" TEXT,
  CONSTRAINT "KevEntry_cveId_fkey" FOREIGN KEY ("cveId") REFERENCES "secyourflow"."Cve"("cveId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "KevEntry_cveId_idx" ON "secyourflow"."KevEntry"("cveId");
CREATE INDEX IF NOT EXISTS "KevEntry_dueDate_idx" ON "secyourflow"."KevEntry"("dueDate");
