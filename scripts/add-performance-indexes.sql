-- Performance Optimization: Add Strategic Database Indexes
-- This script adds indexes to improve query performance for common access patterns

-- Vulnerability indexes
CREATE INDEX IF NOT EXISTS "Vulnerability_organizationId_severity_idx" ON "Vulnerability"("organizationId", "severity");
CREATE INDEX IF NOT EXISTS "Vulnerability_organizationId_status_idx" ON "Vulnerability"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Vulnerability_organizationId_isExploited_idx" ON "Vulnerability"("organizationId", "isExploited");
CREATE INDEX IF NOT EXISTS "Vulnerability_organizationId_cisaKev_idx" ON "Vulnerability"("organizationId", "cisaKev");
CREATE INDEX IF NOT EXISTS "Vulnerability_createdAt_desc_idx" ON "Vulnerability"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Vulnerability_severity_status_idx" ON "Vulnerability"("severity", "status");
CREATE INDEX IF NOT EXISTS "Vulnerability_epssScore_desc_idx" ON "Vulnerability"("epssScore" DESC);

-- Asset indexes
CREATE INDEX IF NOT EXISTS "Asset_organizationId_criticality_idx" ON "Asset"("organizationId", "criticality");
CREATE INDEX IF NOT EXISTS "Asset_organizationId_environment_idx" ON "Asset"("organizationId", "environment");
CREATE INDEX IF NOT EXISTS "Asset_organizationId_status_idx" ON "Asset"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Asset_organizationId_type_idx" ON "Asset"("organizationId", "type");
CREATE INDEX IF NOT EXISTS "Asset_location_idx" ON "Asset"("location");
CREATE INDEX IF NOT EXISTS "Asset_hostname_idx" ON "Asset"("hostname");

-- RiskRegister indexes
CREATE INDEX IF NOT EXISTS "RiskRegister_organizationId_status_idx" ON "RiskRegister"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "RiskRegister_riskScore_desc_idx" ON "RiskRegister"("riskScore" DESC);
CREATE INDEX IF NOT EXISTS "RiskRegister_organizationId_riskScore_desc_idx" ON "RiskRegister"("organizationId", "riskScore" DESC);
CREATE INDEX IF NOT EXISTS "RiskRegister_createdAt_desc_idx" ON "RiskRegister"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "RiskRegister_assetId_vulnerabilityId_idx" ON "RiskRegister"("assetId", "vulnerabilityId");

-- ComplianceControl indexes
CREATE INDEX IF NOT EXISTS "ComplianceControl_frameworkId_status_idx" ON "ComplianceControl"("frameworkId", "status");

-- AuditLog indexes
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_desc_idx" ON "AuditLog"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_createdAt_desc_idx" ON "AuditLog"("entityType", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_desc_idx" ON "AuditLog"("userId", "createdAt" DESC);

-- Notification indexes
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_desc_idx" ON "Notification"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Notification_createdAt_desc_idx" ON "Notification"("createdAt" DESC);

-- Analyze tables to update statistics
ANALYZE "Vulnerability";
ANALYZE "Asset";
ANALYZE "RiskRegister";
ANALYZE "ComplianceControl";
ANALYZE "AuditLog";
ANALYZE "Notification";
