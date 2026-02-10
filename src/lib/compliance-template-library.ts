import type { ControlFrequency, ControlType, NistCsfFunction } from "@prisma/client";

export type ComplianceTemplateId =
  | "iso27001_2022"
  | "nist_csf_2_0"
  | "pci_dss_4_0"
  | "soc2_type_ii";

export interface ComplianceTemplateControl {
  controlId: string;
  title: string;
  description: string;
  category: string;
  objective: string;
  controlType: ControlType;
  frequency: ControlFrequency;
  nistCsfFunction?: NistCsfFunction;
  ownerRole: string;
  evidenceRequired: string[];
}

export interface ComplianceTemplate {
  id: ComplianceTemplateId;
  name: string;
  version: string;
  description: string;
  controls: ComplianceTemplateControl[];
}

const ISO_27001_2022: ComplianceTemplate = {
  id: "iso27001_2022",
  name: "ISO 27001",
  version: "2022",
  description: "ISO/IEC 27001:2022 Annex A starter control set for operational deployment.",
  controls: [
    {
      controlId: "A.5.1",
      title: "Policies for information security",
      description: "Information security policy set is approved, published, and reviewed.",
      category: "Organizational",
      objective: "Define and govern enterprise security expectations.",
      controlType: "PREVENTIVE",
      frequency: "ANNUAL",
      nistCsfFunction: "GOVERN",
      ownerRole: "CISO",
      evidenceRequired: ["Policy document", "Approval records"],
    },
    {
      controlId: "A.5.15",
      title: "Access control",
      description: "Access rights are provisioned using least privilege.",
      category: "Identity and Access",
      objective: "Reduce unauthorized access risk.",
      controlType: "PREVENTIVE",
      frequency: "MONTHLY",
      nistCsfFunction: "PROTECT",
      ownerRole: "IAM Manager",
      evidenceRequired: ["Access review log", "Role matrix"],
    },
    {
      controlId: "A.5.17",
      title: "Authentication information",
      description: "Authentication secrets are protected and rotated.",
      category: "Identity and Access",
      objective: "Protect user credentials and secrets.",
      controlType: "PREVENTIVE",
      frequency: "QUARTERLY",
      nistCsfFunction: "PROTECT",
      ownerRole: "IT Security",
      evidenceRequired: ["Secret rotation report", "MFA settings"],
    },
    {
      controlId: "A.8.7",
      title: "Protection against malware",
      description: "Anti-malware controls are deployed and updated.",
      category: "Endpoint Security",
      objective: "Prevent malware infection and propagation.",
      controlType: "PREVENTIVE",
      frequency: "CONTINUOUS",
      nistCsfFunction: "PROTECT",
      ownerRole: "Endpoint Security Team",
      evidenceRequired: ["AV deployment list", "Definition update logs"],
    },
    {
      controlId: "A.8.8",
      title: "Management of technical vulnerabilities",
      description: "Vulnerabilities are identified and remediated on schedule.",
      category: "Vulnerability Management",
      objective: "Reduce exploitable exposure.",
      controlType: "CORRECTIVE",
      frequency: "WEEKLY",
      nistCsfFunction: "IDENTIFY",
      ownerRole: "Vulnerability Manager",
      evidenceRequired: ["Scan reports", "Patch evidence"],
    },
    {
      controlId: "A.8.15",
      title: "Logging",
      description: "Security-relevant events are logged and protected.",
      category: "Monitoring",
      objective: "Enable detection and investigation.",
      controlType: "DETECTIVE",
      frequency: "CONTINUOUS",
      nistCsfFunction: "DETECT",
      ownerRole: "SOC Lead",
      evidenceRequired: ["SIEM dashboard", "Log retention policy"],
    },
    {
      controlId: "A.8.16",
      title: "Monitoring activities",
      description: "Monitoring alerts are triaged and escalated.",
      category: "Monitoring",
      objective: "Detect suspicious activity quickly.",
      controlType: "DETECTIVE",
      frequency: "DAILY",
      nistCsfFunction: "DETECT",
      ownerRole: "SOC Analyst",
      evidenceRequired: ["Alert triage records", "Incident tickets"],
    },
    {
      controlId: "A.8.13",
      title: "Information backup",
      description: "Critical data is backed up and tested for restoration.",
      category: "Resilience",
      objective: "Maintain recoverability.",
      controlType: "CORRECTIVE",
      frequency: "MONTHLY",
      nistCsfFunction: "RECOVER",
      ownerRole: "Infrastructure Manager",
      evidenceRequired: ["Backup logs", "Restore test results"],
    },
  ],
};

const NIST_CSF_2_0: ComplianceTemplate = {
  id: "nist_csf_2_0",
  name: "NIST CSF",
  version: "2.0",
  description: "NIST Cybersecurity Framework 2.0 operational baseline controls.",
  controls: [
    {
      controlId: "GV.OC-01",
      title: "Organizational context is established",
      description: "Mission, stakeholder, and risk context are documented.",
      category: "Govern",
      objective: "Align cyber risk decisions with business context.",
      controlType: "PREVENTIVE",
      frequency: "ANNUAL",
      nistCsfFunction: "GOVERN",
      ownerRole: "Risk Officer",
      evidenceRequired: ["Risk charter", "Governance meeting minutes"],
    },
    {
      controlId: "ID.AM-01",
      title: "Asset inventory is maintained",
      description: "Assets and data stores are inventoried and current.",
      category: "Identify",
      objective: "Maintain visibility of security scope.",
      controlType: "PREVENTIVE",
      frequency: "WEEKLY",
      nistCsfFunction: "IDENTIFY",
      ownerRole: "Asset Manager",
      evidenceRequired: ["CMDB export", "Asset onboarding records"],
    },
    {
      controlId: "PR.AA-01",
      title: "Identity and access are managed",
      description: "Identity lifecycle and privileged access are enforced.",
      category: "Protect",
      objective: "Limit unauthorized use of assets.",
      controlType: "PREVENTIVE",
      frequency: "MONTHLY",
      nistCsfFunction: "PROTECT",
      ownerRole: "IAM Team",
      evidenceRequired: ["Access review", "Privileged access audit"],
    },
    {
      controlId: "PR.DS-01",
      title: "Data-at-rest and in-transit is protected",
      description: "Encryption and key handling controls are implemented.",
      category: "Protect",
      objective: "Prevent data compromise.",
      controlType: "PREVENTIVE",
      frequency: "QUARTERLY",
      nistCsfFunction: "PROTECT",
      ownerRole: "Data Protection Officer",
      evidenceRequired: ["Encryption inventory", "KMS policy"],
    },
    {
      controlId: "DE.CM-01",
      title: "Security continuous monitoring is active",
      description: "Telemetry and alerts cover critical environments.",
      category: "Detect",
      objective: "Detect cybersecurity events.",
      controlType: "DETECTIVE",
      frequency: "CONTINUOUS",
      nistCsfFunction: "DETECT",
      ownerRole: "SOC Lead",
      evidenceRequired: ["SIEM health report", "Alert coverage"],
    },
    {
      controlId: "DE.AE-01",
      title: "Anomalies are analyzed",
      description: "Events are analyzed for cybersecurity incident potential.",
      category: "Detect",
      objective: "Distinguish normal from anomalous behavior.",
      controlType: "DETECTIVE",
      frequency: "DAILY",
      nistCsfFunction: "DETECT",
      ownerRole: "Threat Detection Team",
      evidenceRequired: ["Triage queue", "Escalation records"],
    },
    {
      controlId: "RS.MI-01",
      title: "Incident containment and mitigation",
      description: "Response plans are executed to contain incidents.",
      category: "Respond",
      objective: "Limit incident impact.",
      controlType: "CORRECTIVE",
      frequency: "MONTHLY",
      nistCsfFunction: "RESPOND",
      ownerRole: "Incident Response Manager",
      evidenceRequired: ["Incident timeline", "Containment actions"],
    },
    {
      controlId: "RC.RP-01",
      title: "Recovery plans are tested",
      description: "Recovery activities are rehearsed and improved.",
      category: "Recover",
      objective: "Restore operations efficiently.",
      controlType: "CORRECTIVE",
      frequency: "QUARTERLY",
      nistCsfFunction: "RECOVER",
      ownerRole: "Business Continuity Lead",
      evidenceRequired: ["DR test report", "Recovery runbooks"],
    },
  ],
};

const PCI_DSS_4_0: ComplianceTemplate = {
  id: "pci_dss_4_0",
  name: "PCI DSS",
  version: "4.0",
  description: "PCI DSS 4.0 starter control set for payment environment coverage.",
  controls: [
    {
      controlId: "1.2.5",
      title: "Network segmentation and traffic control",
      description: "Inbound/outbound traffic to CDE is restricted.",
      category: "Network Security",
      objective: "Limit cardholder data environment exposure.",
      controlType: "PREVENTIVE",
      frequency: "MONTHLY",
      nistCsfFunction: "PROTECT",
      ownerRole: "Network Security Engineer",
      evidenceRequired: ["Firewall rule review", "Segmentation diagram"],
    },
    {
      controlId: "2.2.4",
      title: "Secure configuration standards",
      description: "System hardening baselines are defined and enforced.",
      category: "Secure Configuration",
      objective: "Reduce misconfiguration risk.",
      controlType: "PREVENTIVE",
      frequency: "QUARTERLY",
      nistCsfFunction: "PROTECT",
      ownerRole: "Platform Engineering",
      evidenceRequired: ["Baseline standard", "Configuration scans"],
    },
    {
      controlId: "5.2.3",
      title: "Anti-malware is deployed",
      description: "Anti-malware mechanisms are active and managed.",
      category: "Malware Defense",
      objective: "Protect payment systems from malware.",
      controlType: "PREVENTIVE",
      frequency: "CONTINUOUS",
      nistCsfFunction: "PROTECT",
      ownerRole: "Endpoint Security Team",
      evidenceRequired: ["AV console export", "Policy settings"],
    },
    {
      controlId: "6.3.3",
      title: "Vulnerability management program",
      description: "Risk-ranked remediation timelines are enforced.",
      category: "Vulnerability Management",
      objective: "Resolve vulnerabilities before exploitation.",
      controlType: "CORRECTIVE",
      frequency: "WEEKLY",
      nistCsfFunction: "IDENTIFY",
      ownerRole: "Vulnerability Manager",
      evidenceRequired: ["Remediation SLA dashboard", "Ticket history"],
    },
    {
      controlId: "8.6.1",
      title: "MFA for administrative access",
      description: "MFA is required for administrative console access.",
      category: "Access Control",
      objective: "Strengthen authentication.",
      controlType: "PREVENTIVE",
      frequency: "MONTHLY",
      nistCsfFunction: "PROTECT",
      ownerRole: "IAM Team",
      evidenceRequired: ["MFA enforcement logs", "Privileged account list"],
    },
    {
      controlId: "10.4.1",
      title: "Audit logging and review",
      description: "Critical security events are logged and reviewed.",
      category: "Logging",
      objective: "Support monitoring and forensic analysis.",
      controlType: "DETECTIVE",
      frequency: "DAILY",
      nistCsfFunction: "DETECT",
      ownerRole: "SOC Analyst",
      evidenceRequired: ["Log review checklist", "SIEM report"],
    },
    {
      controlId: "11.5.1",
      title: "File integrity monitoring",
      description: "Critical file changes are detected and investigated.",
      category: "Monitoring",
      objective: "Identify unauthorized modifications.",
      controlType: "DETECTIVE",
      frequency: "CONTINUOUS",
      nistCsfFunction: "DETECT",
      ownerRole: "Security Operations",
      evidenceRequired: ["FIM alerts", "Investigation tickets"],
    },
    {
      controlId: "12.10.2",
      title: "Incident response testing",
      description: "IR plan is tested and lessons learned are tracked.",
      category: "Incident Response",
      objective: "Ensure readiness for payment incidents.",
      controlType: "CORRECTIVE",
      frequency: "SEMI_ANNUAL",
      nistCsfFunction: "RESPOND",
      ownerRole: "IR Manager",
      evidenceRequired: ["Tabletop report", "Action tracker"],
    },
  ],
};

const SOC2_TYPE_II: ComplianceTemplate = {
  id: "soc2_type_ii",
  name: "SOC 2",
  version: "Type II",
  description: "SOC 2 Type II Trust Services Criteria starter controls.",
  controls: [
    {
      controlId: "CC1.1",
      title: "Integrity and ethical values",
      description: "Organization demonstrates commitment to integrity.",
      category: "Control Environment",
      objective: "Establish trustworthy governance.",
      controlType: "PREVENTIVE",
      frequency: "ANNUAL",
      nistCsfFunction: "GOVERN",
      ownerRole: "Executive Leadership",
      evidenceRequired: ["Code of conduct", "Policy attestation"],
    },
    {
      controlId: "CC2.1",
      title: "Board oversight",
      description: "Board/leadership oversees internal controls.",
      category: "Governance",
      objective: "Provide accountability and direction.",
      controlType: "PREVENTIVE",
      frequency: "QUARTERLY",
      nistCsfFunction: "GOVERN",
      ownerRole: "Board Secretary",
      evidenceRequired: ["Board minutes", "Risk committee updates"],
    },
    {
      controlId: "CC6.1",
      title: "Logical access security",
      description: "Logical access controls restrict unauthorized users.",
      category: "Access Security",
      objective: "Protect system boundaries.",
      controlType: "PREVENTIVE",
      frequency: "MONTHLY",
      nistCsfFunction: "PROTECT",
      ownerRole: "IAM Team",
      evidenceRequired: ["Provisioning records", "Access review"],
    },
    {
      controlId: "CC6.6",
      title: "Data transmission and disposal",
      description: "Data is protected during transfer and disposal.",
      category: "Data Security",
      objective: "Prevent unauthorized disclosure.",
      controlType: "PREVENTIVE",
      frequency: "QUARTERLY",
      nistCsfFunction: "PROTECT",
      ownerRole: "Data Governance Team",
      evidenceRequired: ["Encryption standards", "Data disposal logs"],
    },
    {
      controlId: "CC7.2",
      title: "System monitoring",
      description: "Monitors detect anomalies and potential security events.",
      category: "Monitoring",
      objective: "Detect control failures quickly.",
      controlType: "DETECTIVE",
      frequency: "CONTINUOUS",
      nistCsfFunction: "DETECT",
      ownerRole: "SOC Lead",
      evidenceRequired: ["Monitoring dashboard", "Alert tuning history"],
    },
    {
      controlId: "CC7.3",
      title: "Change detection",
      description: "Unauthorized changes are detected and investigated.",
      category: "Change Monitoring",
      objective: "Maintain system integrity.",
      controlType: "DETECTIVE",
      frequency: "DAILY",
      nistCsfFunction: "DETECT",
      ownerRole: "Security Engineering",
      evidenceRequired: ["Change audit log", "Incident tickets"],
    },
    {
      controlId: "CC8.1",
      title: "Change management",
      description: "Changes are authorized, tested, and approved.",
      category: "Change Management",
      objective: "Reduce operational and security risk.",
      controlType: "CORRECTIVE",
      frequency: "WEEKLY",
      nistCsfFunction: "RESPOND",
      ownerRole: "Change Manager",
      evidenceRequired: ["CAB approvals", "Rollback plans"],
    },
    {
      controlId: "A1.2",
      title: "Availability and recovery",
      description: "Recovery procedures are tested for service continuity.",
      category: "Availability",
      objective: "Sustain service commitments.",
      controlType: "CORRECTIVE",
      frequency: "SEMI_ANNUAL",
      nistCsfFunction: "RECOVER",
      ownerRole: "SRE Lead",
      evidenceRequired: ["DR test output", "Post-incident review"],
    },
  ],
};

const TEMPLATE_LIBRARY: Record<ComplianceTemplateId, ComplianceTemplate> = {
  iso27001_2022: ISO_27001_2022,
  nist_csf_2_0: NIST_CSF_2_0,
  pci_dss_4_0: PCI_DSS_4_0,
  soc2_type_ii: SOC2_TYPE_II,
};

export function listComplianceTemplates() {
  return Object.values(TEMPLATE_LIBRARY).map((template) => ({
    id: template.id,
    name: template.name,
    version: template.version,
    description: template.description,
    controlCount: template.controls.length,
  }));
}

export function getComplianceTemplate(id: ComplianceTemplateId): ComplianceTemplate {
  const template = TEMPLATE_LIBRARY[id];
  if (!template) {
    throw new Error(`Unknown compliance template: ${id}`);
  }
  return template;
}

export function isComplianceTemplateId(value: string): value is ComplianceTemplateId {
  return value in TEMPLATE_LIBRARY;
}
