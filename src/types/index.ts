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

export type Environment = "PRODUCTION" | "STAGING" | "DEVELOPMENT" | "TESTING" | "DR";

export type Criticality = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";

export type AssetStatus = "ACTIVE" | "INACTIVE" | "DECOMMISSIONED" | "MAINTENANCE";

export type CloudProvider = "AWS" | "AZURE" | "GCP" | "ORACLE" | "IBM" | "ALIBABA" | "OTHER";

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";

export type VulnStatus =
    | "OPEN"
    | "IN_PROGRESS"
    | "MITIGATED"
    | "FIXED"
    | "ACCEPTED"
    | "FALSE_POSITIVE";

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

export type ExploitMaturity = "NOT_DEFINED" | "UNPROVEN" | "POC" | "FUNCTIONAL" | "HIGH";

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
    id: string;
    email: string;
    name?: string;
    role: Role;
    avatar?: string;
    organizationId?: string;
}

export interface Asset {
    id: string;
    name: string;
    type: AssetType;
    hostname?: string;
    ipAddress?: string;
    operatingSystem?: string;
    environment: Environment;
    criticality: Criticality;
    status: AssetStatus;
    owner?: string;
    department?: string;
    cloudProvider?: CloudProvider;
    tags: string[];
    lastSeen?: Date;
    createdAt: Date;
    vulnerabilityCount?: number;
}

export interface Vulnerability {
    id: string;
    cveId?: string;
    title: string;
    description?: string;
    severity: Severity;
    cvssScore?: number;
    cvssVector?: string;
    epssScore?: number;
    epssPercentile?: number;
    isExploited: boolean;
    exploitMaturity?: ExploitMaturity;
    cisaKev: boolean;
    source: VulnSource;
    status: VulnStatus;
    solution?: string;
    riskScore?: number;
    affectedAssets?: number;
    firstDetected: Date;
    lastSeen: Date;
    riskEntries?: any[];
}

export interface ComplianceFramework {
    id: string;
    name: string;
    version?: string;
    description?: string;
    isActive: boolean;
    controlCount?: number;
    compliantCount?: number;
    nonCompliantCount?: number;
}

export interface ComplianceControl {
    id: string;
    controlId: string;
    title: string;
    description?: string;
    category?: string;
    status: ComplianceStatus;
    implementationStatus: ImplementationStatus;
    frameworkId: string;
    frameworkName?: string;
}

export interface ThreatIndicator {
    id: string;
    type: string;
    value: string;
    confidence?: number;
    severity?: Severity;
    firstSeen: Date;
    lastSeen: Date;
    source?: string;
    description?: string;
    tags: string[];
}

// ==================== DASHBOARD TYPES ====================

export interface DashboardStats {
    totalAssets: number;
    criticalAssets: number;
    totalVulnerabilities: number;
    criticalVulnerabilities: number;
    highVulnerabilities: number;
    mediumVulnerabilities: number;
    lowVulnerabilities: number;
    exploitedVulnerabilities: number;
    cisaKevCount: number;
    overallRiskScore: number;
    complianceScore: number;
    openVulnerabilities: number;
    fixedThisMonth: number;
    meanTimeToRemediate: number; // in days
}

export interface RiskTrend {
    date: string;
    riskScore: number;
    criticalVulns: number;
    highVulns: number;
}

export interface VulnerabilitySeverityDistribution {
    severity: Severity;
    count: number;
    percentage: number;
}

export interface TopRiskyAsset {
    id: string;
    name: string;
    type: AssetType;
    criticality: Criticality;
    vulnerabilityCount: number;
    criticalVulnCount: number;
    riskScore: number;
}

export interface ComplianceOverview {
    frameworkId: string;
    frameworkName: string;
    totalControls: number;
    compliant: number;
    nonCompliant: number;
    partiallyCompliant: number;
    notAssessed: number;
    compliancePercentage: number;
}

export interface RecentActivity {
    id: string;
    action: string;
    entityType: string;
    entityName: string;
    userName: string;
    timestamp: Date;
}

export interface ExploitedVulnerability {
    id: string;
    cveId: string;
    title: string;
    severity: Severity;
    epssScore: number;
    affectedAssets: number;
    cisaKev: boolean;
    exploitMaturity: ExploitMaturity;
}
