-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('IT_OFFICER', 'PENTESTER', 'ANALYST', 'MAIN_OFFICER');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('SERVER', 'WORKSTATION', 'NETWORK_DEVICE', 'CLOUD_INSTANCE', 'CONTAINER', 'DATABASE', 'APPLICATION', 'API', 'DOMAIN', 'CERTIFICATE', 'IOT_DEVICE', 'MOBILE_DEVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('PRODUCTION', 'STAGING', 'DEVELOPMENT', 'TESTING', 'DR');

-- CreateEnum
CREATE TYPE "Criticality" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DECOMMISSIONED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "CloudProvider" AS ENUM ('AWS', 'AZURE', 'GCP', 'ORACLE', 'IBM', 'ALIBABA', 'OTHER');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL');

-- CreateEnum
CREATE TYPE "VulnStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'MITIGATED', 'FIXED', 'ACCEPTED', 'FALSE_POSITIVE');

-- CreateEnum
CREATE TYPE "VulnSource" AS ENUM ('NESSUS', 'OPENVAS', 'NMAP', 'TRIVY', 'QUALYS', 'RAPID7', 'CROWDSTRIKE', 'MANUAL', 'API', 'OTHER');

-- CreateEnum
CREATE TYPE "ExploitMaturity" AS ENUM ('NOT_DEFINED', 'UNPROVEN', 'POC', 'FUNCTIONAL', 'HIGH');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('COMPLIANT', 'NON_COMPLIANT', 'PARTIALLY_COMPLIANT', 'NOT_ASSESSED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ImplementationStatus" AS ENUM ('IMPLEMENTED', 'PARTIALLY_IMPLEMENTED', 'PLANNED', 'NOT_IMPLEMENTED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ThreatFeedType" AS ENUM ('CVE', 'MALWARE', 'IOC', 'THREAT_ACTOR', 'CAMPAIGN');

-- CreateEnum
CREATE TYPE "IndicatorType" AS ENUM ('IP_ADDRESS', 'DOMAIN', 'URL', 'FILE_HASH_MD5', 'FILE_HASH_SHA1', 'FILE_HASH_SHA256', 'EMAIL', 'CVE', 'REGISTRY_KEY', 'USER_AGENT');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CveStatus" AS ENUM ('ACTIVE', 'REJECTED', 'RESERVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "password" TEXT,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'ANALYST',
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLogin" TIMESTAMP(3),
    "organizationId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "hostname" TEXT,
    "ipAddress" TEXT,
    "macAddress" TEXT,
    "operatingSystem" TEXT,
    "version" TEXT,
    "environment" "Environment" NOT NULL DEFAULT 'PRODUCTION',
    "criticality" "Criticality" NOT NULL DEFAULT 'MEDIUM',
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "owner" TEXT,
    "department" TEXT,
    "location" TEXT,
    "cloudProvider" "CloudProvider",
    "cloudRegion" TEXT,
    "cloudAccountId" TEXT,
    "tags" TEXT[],
    "metadata" JSONB,
    "lastSeen" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vulnerability" (
    "id" TEXT NOT NULL,
    "cveId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "Severity" NOT NULL,
    "cvssScore" DOUBLE PRECISION,
    "cvssVector" TEXT,
    "epssScore" DOUBLE PRECISION,
    "epssPercentile" DOUBLE PRECISION,
    "cweId" TEXT,
    "cweDescription" TEXT,
    "isExploited" BOOLEAN NOT NULL DEFAULT false,
    "exploitMaturity" "ExploitMaturity",
    "cisaKev" BOOLEAN NOT NULL DEFAULT false,
    "source" "VulnSource" NOT NULL,
    "scannerId" TEXT,
    "scannerName" TEXT,
    "firstDetected" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "VulnStatus" NOT NULL DEFAULT 'OPEN',
    "solution" TEXT,
    "references" TEXT[],
    "patchAvailable" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "fixedAt" TIMESTAMP(3),
    "riskScore" DOUBLE PRECISION,
    "businessImpact" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Vulnerability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetVulnerability" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "vulnerabilityId" TEXT NOT NULL,
    "port" INTEGER,
    "protocol" TEXT,
    "service" TEXT,
    "path" TEXT,
    "evidence" TEXT,
    "status" "VulnStatus" NOT NULL DEFAULT 'OPEN',
    "firstDetected" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetVulnerability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceFramework" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "ComplianceFramework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceControl" (
    "id" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "objective" TEXT,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'NOT_ASSESSED',
    "implementationStatus" "ImplementationStatus" NOT NULL DEFAULT 'NOT_IMPLEMENTED',
    "evidence" TEXT,
    "notes" TEXT,
    "lastAssessed" TIMESTAMP(3),
    "nextAssessment" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "frameworkId" TEXT NOT NULL,

    CONSTRAINT "ComplianceControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetComplianceControl" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'NOT_ASSESSED',
    "evidence" TEXT,
    "assessedAt" TIMESTAMP(3),

    CONSTRAINT "AssetComplianceControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VulnerabilityComplianceControl" (
    "id" TEXT NOT NULL,
    "vulnerabilityId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "impact" TEXT,

    CONSTRAINT "VulnerabilityComplianceControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatFeed" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "type" "ThreatFeedType" NOT NULL,
    "url" TEXT,
    "apiKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSync" TIMESTAMP(3),
    "syncInterval" INTEGER NOT NULL DEFAULT 3600,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreatFeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreatIndicator" (
    "id" TEXT NOT NULL,
    "type" "IndicatorType" NOT NULL,
    "value" TEXT NOT NULL,
    "confidence" INTEGER,
    "severity" "Severity",
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "source" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "tacticId" TEXT,
    "techniqueId" TEXT,
    "feedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreatIndicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vulnerabilityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScannerConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VulnSource" NOT NULL,
    "endpoint" TEXT,
    "apiKey" TEXT,
    "username" TEXT,
    "password" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSync" TIMESTAMP(3),
    "syncInterval" INTEGER NOT NULL DEFAULT 86400,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScannerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanResult" (
    "id" TEXT NOT NULL,
    "scanId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "status" "ScanStatus" NOT NULL DEFAULT 'RUNNING',
    "totalHosts" INTEGER NOT NULL DEFAULT 0,
    "totalVulns" INTEGER NOT NULL DEFAULT 0,
    "rawData" JSONB,
    "scannerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskSnapshot" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAssets" INTEGER NOT NULL,
    "criticalAssets" INTEGER NOT NULL,
    "totalVulns" INTEGER NOT NULL,
    "criticalVulns" INTEGER NOT NULL,
    "highVulns" INTEGER NOT NULL,
    "mediumVulns" INTEGER NOT NULL,
    "lowVulns" INTEGER NOT NULL,
    "exploitedVulns" INTEGER NOT NULL,
    "cisaKevVulns" INTEGER NOT NULL,
    "overallRiskScore" DOUBLE PRECISION NOT NULL,
    "complianceScore" DOUBLE PRECISION,
    "metadata" JSONB,

    CONSTRAINT "RiskSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "dateFormat" TEXT NOT NULL DEFAULT 'MMM DD, YYYY',
    "notifyCritical" BOOLEAN NOT NULL DEFAULT true,
    "notifyExploited" BOOLEAN NOT NULL DEFAULT true,
    "notifyCompliance" BOOLEAN NOT NULL DEFAULT true,
    "notifyScan" BOOLEAN NOT NULL DEFAULT false,
    "notifyWeekly" BOOLEAN NOT NULL DEFAULT true,
    "require2FA" BOOLEAN NOT NULL DEFAULT false,
    "sessionTimeout" INTEGER NOT NULL DEFAULT 30,
    "passwordPolicy" TEXT NOT NULL DEFAULT 'STRONG',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "format" TEXT NOT NULL DEFAULT 'PDF',
    "frequency" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "url" TEXT,
    "size" TEXT,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskRegister" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "vulnerabilityId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "impactScore" DOUBLE PRECISION NOT NULL,
    "likelihoodScore" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "aiAnalysis" JSONB NOT NULL,
    "treatmentOption" TEXT,
    "responsibleParty" TEXT,
    "currentControls" TEXT,
    "riskCategory2" TEXT,
    "actionPlan" TEXT,
    "selectedControls" TEXT,
    "remarks" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cve" (
    "id" TEXT NOT NULL,
    "cveId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "lastModifiedAt" TIMESTAMP(3) NOT NULL,
    "severity" "Severity" NOT NULL,
    "cweIds" TEXT[],
    "searchVector" tsvector,
    "status" "CveStatus" NOT NULL DEFAULT 'ACTIVE',
    "isKev" BOOLEAN NOT NULL DEFAULT false,
    "epssScore" DOUBLE PRECISION,
    "epssPercentile" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CveCpe" (
    "id" TEXT NOT NULL,
    "cveId" TEXT NOT NULL,
    "cpeUri" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "versionStartIncluding" TEXT,
    "versionEndExcluding" TEXT,
    "vulnerable" BOOLEAN NOT NULL,

    CONSTRAINT "CveCpe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CveCvss" (
    "id" TEXT NOT NULL,
    "cveId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "vectorString" TEXT NOT NULL,
    "baseScore" DOUBLE PRECISION NOT NULL,
    "baseSeverity" TEXT NOT NULL,
    "exploitabilityScore" DOUBLE PRECISION,
    "impactScore" DOUBLE PRECISION,

    CONSTRAINT "CveCvss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CveProvenance" (
    "id" TEXT NOT NULL,
    "cveId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "checksum" TEXT NOT NULL,

    CONSTRAINT "CveProvenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CveReference" (
    "id" TEXT NOT NULL,
    "cveId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "tags" TEXT[],

    CONSTRAINT "CveReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionState" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3) NOT NULL,
    "lastSuccessAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IngestionState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KevEntry" (
    "id" TEXT NOT NULL,
    "cveId" TEXT NOT NULL,
    "vulnerabilityName" TEXT NOT NULL,
    "dateAdded" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "requiredAction" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "KevEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Organization_name_idx" ON "Organization"("name");

-- CreateIndex
CREATE INDEX "Asset_name_idx" ON "Asset"("name");

-- CreateIndex
CREATE INDEX "Asset_type_idx" ON "Asset"("type");

-- CreateIndex
CREATE INDEX "Asset_ipAddress_idx" ON "Asset"("ipAddress");

-- CreateIndex
CREATE INDEX "Asset_organizationId_idx" ON "Asset"("organizationId");

-- CreateIndex
CREATE INDEX "Asset_criticality_idx" ON "Asset"("criticality");

-- CreateIndex
CREATE INDEX "Vulnerability_cveId_idx" ON "Vulnerability"("cveId");

-- CreateIndex
CREATE INDEX "Vulnerability_severity_idx" ON "Vulnerability"("severity");

-- CreateIndex
CREATE INDEX "Vulnerability_status_idx" ON "Vulnerability"("status");

-- CreateIndex
CREATE INDEX "Vulnerability_organizationId_idx" ON "Vulnerability"("organizationId");

-- CreateIndex
CREATE INDEX "Vulnerability_isExploited_idx" ON "Vulnerability"("isExploited");

-- CreateIndex
CREATE INDEX "Vulnerability_riskScore_idx" ON "Vulnerability"("riskScore");

-- CreateIndex
CREATE INDEX "AssetVulnerability_assetId_idx" ON "AssetVulnerability"("assetId");

-- CreateIndex
CREATE INDEX "AssetVulnerability_vulnerabilityId_idx" ON "AssetVulnerability"("vulnerabilityId");

-- CreateIndex
CREATE INDEX "AssetVulnerability_status_idx" ON "AssetVulnerability"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AssetVulnerability_assetId_vulnerabilityId_key" ON "AssetVulnerability"("assetId", "vulnerabilityId");

-- CreateIndex
CREATE INDEX "ComplianceFramework_name_idx" ON "ComplianceFramework"("name");

-- CreateIndex
CREATE INDEX "ComplianceFramework_organizationId_idx" ON "ComplianceFramework"("organizationId");

-- CreateIndex
CREATE INDEX "ComplianceControl_frameworkId_idx" ON "ComplianceControl"("frameworkId");

-- CreateIndex
CREATE INDEX "ComplianceControl_status_idx" ON "ComplianceControl"("status");

-- CreateIndex
CREATE INDEX "ComplianceControl_controlId_idx" ON "ComplianceControl"("controlId");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceControl_frameworkId_controlId_key" ON "ComplianceControl"("frameworkId", "controlId");

-- CreateIndex
CREATE INDEX "AssetComplianceControl_assetId_idx" ON "AssetComplianceControl"("assetId");

-- CreateIndex
CREATE INDEX "AssetComplianceControl_controlId_idx" ON "AssetComplianceControl"("controlId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetComplianceControl_assetId_controlId_key" ON "AssetComplianceControl"("assetId", "controlId");

-- CreateIndex
CREATE INDEX "VulnerabilityComplianceControl_vulnerabilityId_idx" ON "VulnerabilityComplianceControl"("vulnerabilityId");

-- CreateIndex
CREATE INDEX "VulnerabilityComplianceControl_controlId_idx" ON "VulnerabilityComplianceControl"("controlId");

-- CreateIndex
CREATE UNIQUE INDEX "VulnerabilityComplianceControl_vulnerabilityId_controlId_key" ON "VulnerabilityComplianceControl"("vulnerabilityId", "controlId");

-- CreateIndex
CREATE INDEX "ThreatFeed_name_idx" ON "ThreatFeed"("name");

-- CreateIndex
CREATE INDEX "ThreatFeed_isActive_idx" ON "ThreatFeed"("isActive");

-- CreateIndex
CREATE INDEX "ThreatIndicator_type_idx" ON "ThreatIndicator"("type");

-- CreateIndex
CREATE INDEX "ThreatIndicator_value_idx" ON "ThreatIndicator"("value");

-- CreateIndex
CREATE INDEX "ThreatIndicator_feedId_idx" ON "ThreatIndicator"("feedId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Comment_entityType_entityId_idx" ON "Comment"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "ScannerConfig_type_idx" ON "ScannerConfig"("type");

-- CreateIndex
CREATE INDEX "ScannerConfig_isActive_idx" ON "ScannerConfig"("isActive");

-- CreateIndex
CREATE INDEX "ScanResult_scanId_idx" ON "ScanResult"("scanId");

-- CreateIndex
CREATE INDEX "ScanResult_scannerId_idx" ON "ScanResult"("scannerId");

-- CreateIndex
CREATE INDEX "ScanResult_status_idx" ON "ScanResult"("status");

-- CreateIndex
CREATE INDEX "RiskSnapshot_date_idx" ON "RiskSnapshot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_organizationId_key" ON "Setting"("organizationId");

-- CreateIndex
CREATE INDEX "Report_organizationId_idx" ON "Report"("organizationId");

-- CreateIndex
CREATE INDEX "Report_userId_idx" ON "Report"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "RiskRegister_assetId_idx" ON "RiskRegister"("assetId");

-- CreateIndex
CREATE INDEX "RiskRegister_vulnerabilityId_idx" ON "RiskRegister"("vulnerabilityId");

-- CreateIndex
CREATE INDEX "RiskRegister_organizationId_idx" ON "RiskRegister"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Cve_cveId_key" ON "Cve"("cveId");

-- CreateIndex
CREATE INDEX "Cve_cveId_idx" ON "Cve"("cveId");

-- CreateIndex
CREATE INDEX "Cve_cveId_pattern_idx" ON "Cve"("cveId");

-- CreateIndex
CREATE INDEX "Cve_cveId_trgm_idx" ON "Cve" USING GIN ("cveId" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Cve_epssScore_idx" ON "Cve"("epssScore");

-- CreateIndex
CREATE INDEX "Cve_isKev_severity_idx" ON "Cve"("isKev", "severity");

-- CreateIndex
CREATE INDEX "Cve_publishedAt_idx" ON "Cve"("publishedAt" DESC);

-- CreateIndex
CREATE INDEX "Cve_searchVector_idx" ON "Cve" USING GIN ("searchVector");

-- CreateIndex
CREATE INDEX "Cve_severity_publishedAt_idx" ON "Cve"("severity", "publishedAt");

-- CreateIndex
CREATE INDEX "Cve_status_lastModifiedAt_idx" ON "Cve"("status", "lastModifiedAt");

-- CreateIndex
CREATE INDEX "Cve_status_publishedAt_idx" ON "Cve"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Cve_status_severity_published_idx" ON "Cve"("status", "severity", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "CveCpe_cveId_idx" ON "CveCpe"("cveId");

-- CreateIndex
CREATE INDEX "CveCpe_vendor_product_idx" ON "CveCpe"("vendor", "product");

-- CreateIndex
CREATE INDEX "CveCvss_cveId_idx" ON "CveCvss"("cveId");

-- CreateIndex
CREATE INDEX "CveProvenance_cveId_source_idx" ON "CveProvenance"("cveId", "source");

-- CreateIndex
CREATE INDEX "CveProvenance_source_lastUpdated_idx" ON "CveProvenance"("source", "lastUpdated" DESC);

-- CreateIndex
CREATE INDEX "CveReference_cveId_idx" ON "CveReference"("cveId");

-- CreateIndex
CREATE UNIQUE INDEX "IngestionState_source_key" ON "IngestionState"("source");

-- CreateIndex
CREATE INDEX "IngestionState_source_idx" ON "IngestionState"("source");

-- CreateIndex
CREATE UNIQUE INDEX "KevEntry_cveId_key" ON "KevEntry"("cveId");

-- CreateIndex
CREATE INDEX "KevEntry_cveId_idx" ON "KevEntry"("cveId");

-- CreateIndex
CREATE INDEX "KevEntry_dueDate_idx" ON "KevEntry"("dueDate");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vulnerability" ADD CONSTRAINT "Vulnerability_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetVulnerability" ADD CONSTRAINT "AssetVulnerability_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetVulnerability" ADD CONSTRAINT "AssetVulnerability_vulnerabilityId_fkey" FOREIGN KEY ("vulnerabilityId") REFERENCES "Vulnerability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceFramework" ADD CONSTRAINT "ComplianceFramework_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceControl" ADD CONSTRAINT "ComplianceControl_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "ComplianceFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetComplianceControl" ADD CONSTRAINT "AssetComplianceControl_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetComplianceControl" ADD CONSTRAINT "AssetComplianceControl_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "ComplianceControl"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VulnerabilityComplianceControl" ADD CONSTRAINT "VulnerabilityComplianceControl_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "ComplianceControl"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VulnerabilityComplianceControl" ADD CONSTRAINT "VulnerabilityComplianceControl_vulnerabilityId_fkey" FOREIGN KEY ("vulnerabilityId") REFERENCES "Vulnerability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreatIndicator" ADD CONSTRAINT "ThreatIndicator_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "ThreatFeed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_vulnerabilityId_fkey" FOREIGN KEY ("vulnerabilityId") REFERENCES "Vulnerability"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanResult" ADD CONSTRAINT "ScanResult_scannerId_fkey" FOREIGN KEY ("scannerId") REFERENCES "ScannerConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskRegister" ADD CONSTRAINT "RiskRegister_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskRegister" ADD CONSTRAINT "RiskRegister_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskRegister" ADD CONSTRAINT "RiskRegister_vulnerabilityId_fkey" FOREIGN KEY ("vulnerabilityId") REFERENCES "Vulnerability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CveCpe" ADD CONSTRAINT "CveCpe_cveId_fkey" FOREIGN KEY ("cveId") REFERENCES "Cve"("cveId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CveCvss" ADD CONSTRAINT "CveCvss_cveId_fkey" FOREIGN KEY ("cveId") REFERENCES "Cve"("cveId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CveProvenance" ADD CONSTRAINT "CveProvenance_cveId_fkey" FOREIGN KEY ("cveId") REFERENCES "Cve"("cveId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CveReference" ADD CONSTRAINT "CveReference_cveId_fkey" FOREIGN KEY ("cveId") REFERENCES "Cve"("cveId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KevEntry" ADD CONSTRAINT "KevEntry_cveId_fkey" FOREIGN KEY ("cveId") REFERENCES "Cve"("cveId") ON DELETE RESTRICT ON UPDATE CASCADE;
