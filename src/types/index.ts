// ==================== ENUMS ====================

export type Role = "IT_OFFICER" | "PENTESTER" | "ANALYST" | "MAIN_OFFICER";

export type AssetType =
  | "SERVER"
  | "WORKSTATION"
  | "NETWORK_DEVICE"
  | "CLOUD_INSTANCE"
  | "CONTAINER"
  | "DATABASE"
  | "APPLICATION"
  | "API"
  | "DOMAIN"
  | "CERTIFICATE"
  | "IOT_DEVICE"
  | "MOBILE_DEVICE"
  | "OTHER";

export type Environment =
  | "PRODUCTION"
  | "STAGING"
  | "DEVELOPMENT"
  | "TESTING"
  | "DR";

export type Criticality =
  | "CRITICAL"
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "INFORMATIONAL";

export type AssetStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "DECOMMISSIONED"
  | "MAINTENANCE";

export type CloudProvider =
  | "AWS"
  | "AZURE"
  | "GCP"
  | "ORACLE"
  | "IBM"
  | "ALIBABA"
  | "OTHER";

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";

export type VulnStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "MITIGATED"
  | "FIXED"
  | "ACCEPTED"
  | "FALSE_POSITIVE";

export type WorkflowState =
  | "NEW"
  | "TRIAGED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED";

export type VulnSource =
  | "NESSUS"
  | "OPENVAS"
  | "NMAP"
  | "TRIVY"
  | "QUALYS"
  | "RAPID7"
  | "CROWDSTRIKE"
  | "MANUAL"
  | "API"
  | "OTHER";

export type ExploitMaturity =
  | "NOT_DEFINED"
  | "UNPROVEN"
  | "POC"
  | "FUNCTIONAL"
  | "HIGH";

export type ComplianceStatus =
  | "COMPLIANT"
  | "NON_COMPLIANT"
  | "PARTIALLY_COMPLIANT"
  | "NOT_ASSESSED"
  | "NOT_APPLICABLE";

export type ImplementationStatus =
  | "IMPLEMENTED"
  | "PARTIALLY_IMPLEMENTED"
  | "PLANNED"
  | "NOT_IMPLEMENTED"
  | "NOT_APPLICABLE";

// ==================== INTERFACES ====================

export interface User {
  avatar?: string;
  email: string;
  id: string;
  name?: string;
  organizationId?: string;
  role: Role;
}

export interface Asset {
  cloudProvider?: CloudProvider;
  cloudRegion?: string;
  createdAt: Date;
  criticality: Criticality;
  department?: string;
  environment: Environment;
  hostname?: string;
  id: string;
  ipAddress?: string;
  lastSeen?: Date;
  location?: string;
  name: string;
  operatingSystem?: string;
  owner?: string;
  status: AssetStatus;
  tags: string[];
  type: AssetType;
  vulnerabilityCount?: number;
}

export interface Vulnerability {
  affectedAssets?: number;
  /** Currently linked asset, if any. Risk analysis requires one. */
  assetId?: string | null;
  assignedTeam?: string | null;
  assignedUser?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  assignedUserId?: string | null;
  cisaKev: boolean;
  cveId?: string;
  cvssScore?: number;
  cvssVector?: string;
  description?: string;
  epssPercentile?: number;
  epssScore?: number;
  exploitMaturity?: ExploitMaturity;
  firstDetected: Date;
  id: string;
  isExploited: boolean;
  lastSeen: Date;
  riskEntries?: RiskEntrySummary[];
  riskScore?: number;
  severity: Severity;
  slaDueAt?: string | Date | null;
  solution?: string;
  source: VulnSource;
  status: VulnStatus;
  title: string;
  workflowState?: WorkflowState;
}

/** The subset of a RiskRegister row the vulnerability views render. */
export interface RiskEntrySummary {
  aiAnalysis?: Record<string, unknown>;
  /** Whether a model produced this, or the deterministic fallback did. */
  analysisSource: "AI" | "DETERMINISTIC";
  confidence?: number | null;
  failureReason?: string | null;
  id: string;
  impactScore: number;
  likelihoodScore: number;
  riskScore: number;
  status: "PROCESSING" | "ACTIVE" | "FAILED" | "SUPERSEDED";
  updatedAt?: string | Date;
}

export interface AssetRelationship {
  childAssetId: string;
  id: string;
  notes?: string | null;
  parentAssetId: string;
  relationshipType:
    | "HOSTS"
    | "RUNS_ON"
    | "DEPENDS_ON"
    | "CONNECTS_TO"
    | "CONTAINS";
}

export interface AssetGroup {
  color?: string | null;
  description?: string | null;
  id: string;
  memberCount?: number;
  name: string;
}

export interface DashboardViewConfig {
  id: string;
  isDefault: boolean;
  layout: Record<string, unknown>;
  name: string;
}

export interface ComplianceFramework {
  compliantCount?: number;
  controlCount?: number;
  description?: string;
  id: string;
  isActive: boolean;
  name: string;
  nonCompliantCount?: number;
  version?: string;
}

export interface ComplianceControl {
  category?: string;
  controlId: string;
  description?: string;
  frameworkId: string;
  frameworkName?: string;
  id: string;
  implementationStatus: ImplementationStatus;
  status: ComplianceStatus;
  title: string;
}

export interface ThreatIndicator {
  confidence?: number;
  description?: string;
  firstSeen: Date;
  id: string;
  lastSeen: Date;
  severity?: Severity;
  source?: string;
  tags: string[];
  type: string;
  value: string;
}

// ==================== DASHBOARD TYPES ====================

export interface DashboardStats {
  cisaKevCount: number;
  complianceScore: number;
  criticalAssets: number;
  criticalVulnerabilities: number;
  exploitedVulnerabilities: number;
  fixedThisMonth: number;
  highVulnerabilities: number;
  lowVulnerabilities: number;
  meanTimeToRemediate: number; // in days
  mediumVulnerabilities: number;
  openVulnerabilities: number;
  overallRiskScore: number;
  totalAssets: number;
  totalVulnerabilities: number;
}

export interface RiskTrend {
  criticalVulns: number;
  date: string;
  highVulns: number;
  riskScore: number;
}

export interface VulnerabilitySeverityDistribution {
  count: number;
  percentage: number;
  severity: Severity;
}

export interface TopRiskyAsset {
  criticality: Criticality;
  criticalVulnCount: number;
  id: string;
  name: string;
  riskScore: number;
  type: AssetType;
  vulnerabilityCount: number;
}

export interface ComplianceOverview {
  compliancePercentage: number;
  compliant: number;
  frameworkId: string;
  frameworkName: string;
  nonCompliant: number;
  notAssessed: number;
  partiallyCompliant: number;
  totalControls: number;
}

export interface RecentActivity {
  action: string;
  entityName: string;
  entityType: string;
  id: string;
  timestamp: Date;
  userName: string;
}

export interface ExploitedVulnerability {
  affectedAssets: number;
  cisaKev: boolean;
  cveId: string;
  epssScore: number;
  exploitMaturity: ExploitMaturity;
  id: string;
  severity: Severity;
  title: string;
}
