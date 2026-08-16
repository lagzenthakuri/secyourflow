import type { Nis2Article21Measure, Nis2VerificationMode } from "@prisma/client";

/**
 * NIS2 Directive (EU 2022/2555) Art. 21(2) risk-management measures.
 *
 * Sub-paragraphs (a) through (j) are the ten measures every essential and
 * important entity must adopt. Several of them require human judgement by
 * design of the directive and cannot be evaluated by a scanner — those are
 * marked MANUAL and stay owner-assigned in the checklist.
 */
export interface Nis2MeasureDefinition {
    measure: Nis2Article21Measure;
    /** Directive sub-paragraph letter, e.g. "a". */
    letter: string;
    label: string;
    /** Verbatim scope from Art. 21(2). */
    scope: string;
    /** How much of this measure the platform can observe automatically. */
    verificationMode: Nis2VerificationMode;
}

export const NIS2_ARTICLE_21_MEASURES: readonly Nis2MeasureDefinition[] = [
    {
        measure: "RISK_ANALYSIS",
        letter: "a",
        label: "Risk analysis and information system security policies",
        scope: "Risk assessment methodology, security policy set, periodic review cycle.",
        verificationMode: "PARTIAL",
    },
    {
        measure: "INCIDENT_HANDLING",
        letter: "b",
        label: "Incident handling",
        scope: "Detection, triage, response, and CSIRT notification under Art. 23.",
        verificationMode: "AUTOMATED",
    },
    {
        measure: "BUSINESS_CONTINUITY",
        letter: "c",
        label: "Business continuity and crisis management",
        scope: "Backup management, disaster recovery, continuity plans and their testing.",
        verificationMode: "PARTIAL",
    },
    {
        measure: "SUPPLY_CHAIN",
        letter: "d",
        label: "Supply chain security",
        scope: "Security of relationships with direct suppliers and service providers.",
        verificationMode: "PARTIAL",
    },
    {
        measure: "SECURE_ACQUISITION",
        letter: "e",
        label: "Security in acquisition, development and maintenance",
        scope: "Secure SDLC, vulnerability handling and disclosure.",
        verificationMode: "PARTIAL",
    },
    {
        measure: "EFFECTIVENESS_ASSESSMENT",
        letter: "f",
        label: "Assessment of effectiveness of risk-management measures",
        scope: "Internal audit programme, KPIs, penetration testing.",
        verificationMode: "PARTIAL",
    },
    {
        measure: "CYBER_HYGIENE",
        letter: "g",
        label: "Cyber hygiene practices and security training",
        scope: "Baseline hygiene practices and role-appropriate awareness training.",
        verificationMode: "MANUAL",
    },
    {
        measure: "CRYPTOGRAPHY",
        letter: "h",
        label: "Cryptography and encryption",
        scope: "Policies on the use of cryptography and, where appropriate, encryption.",
        verificationMode: "PARTIAL",
    },
    {
        measure: "HUMAN_RESOURCES",
        letter: "i",
        label: "Human resources security, access control and asset management",
        scope: "Screening, onboarding/offboarding, asset ownership.",
        verificationMode: "MANUAL",
    },
    {
        measure: "ACCESS_CONTROL",
        letter: "j",
        label: "Multi-factor authentication and secured communications",
        scope: "MFA or continuous authentication, secured voice/video/text, emergency comms.",
        verificationMode: "PARTIAL",
    },
] as const;

const MEASURES_BY_KEY = new Map(NIS2_ARTICLE_21_MEASURES.map((m) => [m.measure, m]));

export function getMeasureDefinition(measure: Nis2Article21Measure): Nis2MeasureDefinition {
    const definition = MEASURES_BY_KEY.get(measure);
    if (!definition) {
        throw new Error(`Unknown NIS2 Art. 21 measure: ${measure}`);
    }
    return definition;
}

export interface Nis2ChecklistTemplateItem {
    /** Stable code, e.g. "A.1" — unique per organization. */
    code: string;
    measure: Nis2Article21Measure;
    title: string;
    description: string;
    verificationMode: Nis2VerificationMode;
}

/**
 * Baseline checklist covering all ten Art. 21(2) sub-paragraphs. Codes are
 * stable: re-seeding an organization upserts by code and never clobbers
 * owner, status, notes, or due date.
 */
export const NIS2_CHECKLIST_TEMPLATE: readonly Nis2ChecklistTemplateItem[] = [
    // (a) Risk analysis and information system security policies
    {
        code: "A.1",
        measure: "RISK_ANALYSIS",
        title: "Documented risk assessment methodology",
        description:
            "A written methodology defines how risks are identified, scored, and accepted, including the scoring scale and the risk acceptance authority.",
        verificationMode: "MANUAL",
    },
    {
        code: "A.2",
        measure: "RISK_ANALYSIS",
        title: "Risk assessment reviewed at least annually",
        description:
            "The risk assessment is re-run on a defined cycle and after significant change to systems, services, or threat landscape.",
        verificationMode: "MANUAL",
    },
    {
        code: "A.3",
        measure: "RISK_ANALYSIS",
        title: "Information security policy approved by management",
        description:
            "A top-level security policy is formally approved by the management body, which under Art. 20 bears accountability for these measures.",
        verificationMode: "MANUAL",
    },
    {
        code: "A.4",
        measure: "RISK_ANALYSIS",
        title: "Technical findings feed the risk register",
        description:
            "Open HIGH/CRITICAL findings from the vulnerability pipeline are reflected as risks with an owner and a treatment decision.",
        verificationMode: "AUTOMATED",
    },

    // (b) Incident handling
    {
        code: "B.1",
        measure: "INCIDENT_HANDLING",
        title: "Incident response plan with defined roles",
        description:
            "A documented plan assigns detection, triage, escalation, and communication responsibilities with named deputies.",
        verificationMode: "MANUAL",
    },
    {
        code: "B.2",
        measure: "INCIDENT_HANDLING",
        title: "Art. 23 reporting deadlines tracked",
        description:
            "Every significant incident tracks the 24-hour early warning, 72-hour notification, and one-month final report deadlines.",
        verificationMode: "AUTOMATED",
    },
    {
        code: "B.3",
        measure: "INCIDENT_HANDLING",
        title: "CSIRT contact point registered",
        description:
            "The entity has registered its contact details with the national CSIRT / competent authority and keeps them current.",
        verificationMode: "MANUAL",
    },
    {
        code: "B.4",
        measure: "INCIDENT_HANDLING",
        title: "Post-incident review performed",
        description:
            "Closed incidents record root cause, lessons learned, and follow-up actions with owners.",
        verificationMode: "PARTIAL",
    },

    // (c) Business continuity and crisis management
    {
        code: "C.1",
        measure: "BUSINESS_CONTINUITY",
        title: "Business impact analysis maintained",
        description:
            "Critical business processes are inventoried with RTO, RPO, and MTPD values and reviewed periodically.",
        verificationMode: "AUTOMATED",
    },
    {
        code: "C.2",
        measure: "BUSINESS_CONTINUITY",
        title: "Business continuity plan documented",
        description:
            "A BCP exists for each vital and critical process, covering degraded-mode operation and recovery sequencing.",
        verificationMode: "AUTOMATED",
    },
    {
        code: "C.3",
        measure: "BUSINESS_CONTINUITY",
        title: "Disaster recovery plan documented and tested",
        description:
            "A DRP exists and is exercised on a defined cycle, with test results recorded against the declared RTO/RPO.",
        verificationMode: "AUTOMATED",
    },
    {
        code: "C.4",
        measure: "BUSINESS_CONTINUITY",
        title: "Backups verified by restore testing",
        description:
            "Backups are taken per the declared RPO and restore tests confirm the data is actually recoverable.",
        verificationMode: "MANUAL",
    },
    {
        code: "C.5",
        measure: "BUSINESS_CONTINUITY",
        title: "Crisis management and communication plan",
        description:
            "A crisis plan defines the crisis team, escalation thresholds, and internal/external communication channels.",
        verificationMode: "MANUAL",
    },

    // (d) Supply chain security
    {
        code: "D.1",
        measure: "SUPPLY_CHAIN",
        title: "Supplier inventory with criticality classification",
        description:
            "Direct suppliers and service providers are inventoried and classified by criticality to service delivery.",
        verificationMode: "AUTOMATED",
    },
    {
        code: "D.2",
        measure: "SUPPLY_CHAIN",
        title: "Security requirements in supplier contracts",
        description:
            "Contracts with critical suppliers carry security clauses, breach notification duties, and audit rights.",
        verificationMode: "AUTOMATED",
    },
    {
        code: "D.3",
        measure: "SUPPLY_CHAIN",
        title: "Supplier security assessed before onboarding",
        description:
            "A documented assessment precedes onboarding of any supplier with access to systems or regulated data.",
        verificationMode: "PARTIAL",
    },
    {
        code: "D.4",
        measure: "SUPPLY_CHAIN",
        title: "Critical suppliers reassessed periodically",
        description:
            "Level 1 and Level 2 suppliers are re-audited on a defined cycle; overdue audits are flagged.",
        verificationMode: "AUTOMATED",
    },

    // (e) Security in acquisition, development and maintenance
    {
        code: "E.1",
        measure: "SECURE_ACQUISITION",
        title: "Secure development lifecycle defined",
        description:
            "Security requirements, code review, and security testing are embedded in the development process.",
        verificationMode: "MANUAL",
    },
    {
        code: "E.2",
        measure: "SECURE_ACQUISITION",
        title: "Vulnerability handling process with SLAs",
        description:
            "Discovered vulnerabilities are triaged and remediated within severity-based deadlines that are actually measured.",
        verificationMode: "AUTOMATED",
    },
    {
        code: "E.3",
        measure: "SECURE_ACQUISITION",
        title: "Change management with security review",
        description:
            "Production changes pass a documented approval that includes a security impact assessment.",
        verificationMode: "MANUAL",
    },
    {
        code: "E.4",
        measure: "SECURE_ACQUISITION",
        title: "Coordinated vulnerability disclosure channel",
        description:
            "A published channel lets third parties report vulnerabilities, with defined acknowledgement and handling times.",
        verificationMode: "MANUAL",
    },

    // (f) Assessment of effectiveness
    {
        code: "F.1",
        measure: "EFFECTIVENESS_ASSESSMENT",
        title: "Internal audit programme covering security measures",
        description:
            "A planned audit programme tests the Art. 21 measures and reports findings to the management body.",
        verificationMode: "MANUAL",
    },
    {
        code: "F.2",
        measure: "EFFECTIVENESS_ASSESSMENT",
        title: "Security KPIs reported to management",
        description:
            "Defined metrics — coverage, remediation timeliness, incident volume — are reported on a regular cadence.",
        verificationMode: "PARTIAL",
    },
    {
        code: "F.3",
        measure: "EFFECTIVENESS_ASSESSMENT",
        title: "Penetration testing performed periodically",
        description:
            "Independent testing is scheduled against internet-facing and business-critical systems, with findings tracked to closure.",
        verificationMode: "PARTIAL",
    },

    // (g) Cyber hygiene and training
    {
        code: "G.1",
        measure: "CYBER_HYGIENE",
        title: "Security awareness training for all staff",
        description:
            "All personnel complete awareness training on induction and refresh it at least annually, with completion recorded.",
        verificationMode: "MANUAL",
    },
    {
        code: "G.2",
        measure: "CYBER_HYGIENE",
        title: "Management body receives specific training",
        description:
            "Art. 20(2) requires members of the management body to follow training sufficient to identify and assess cyber risks.",
        verificationMode: "MANUAL",
    },
    {
        code: "G.3",
        measure: "CYBER_HYGIENE",
        title: "Patch and update baseline enforced",
        description:
            "Operating systems and software are kept on supported versions with a defined patch cadence.",
        verificationMode: "PARTIAL",
    },

    // (h) Cryptography
    {
        code: "H.1",
        measure: "CRYPTOGRAPHY",
        title: "Cryptography policy defined",
        description:
            "A policy states approved algorithms, minimum key lengths, and where encryption is mandatory at rest and in transit.",
        verificationMode: "MANUAL",
    },
    {
        code: "H.2",
        measure: "CRYPTOGRAPHY",
        title: "TLS configuration meets the baseline",
        description:
            "Public-facing services enforce current TLS versions and cipher suites, with valid, unexpired certificates.",
        verificationMode: "AUTOMATED",
    },
    {
        code: "H.3",
        measure: "CRYPTOGRAPHY",
        title: "Key management procedures documented",
        description:
            "Key generation, storage, rotation, and revocation are documented with assigned custodians.",
        verificationMode: "MANUAL",
    },

    // (i) Human resources security
    {
        code: "I.1",
        measure: "HUMAN_RESOURCES",
        title: "Joiner/mover/leaver process with access revocation",
        description:
            "Access is provisioned on role change and revoked on departure within a defined, measured time window.",
        verificationMode: "MANUAL",
    },
    {
        code: "I.2",
        measure: "HUMAN_RESOURCES",
        title: "Background screening for sensitive roles",
        description:
            "Screening proportionate to the role is performed before granting privileged or regulated-data access.",
        verificationMode: "MANUAL",
    },

    // (j) Access control and secured communications
    {
        code: "J.1",
        measure: "ACCESS_CONTROL",
        title: "Multi-factor authentication enforced",
        description:
            "MFA or continuous authentication protects all remote, administrative, and privileged access paths.",
        verificationMode: "AUTOMATED",
    },
    {
        code: "J.2",
        measure: "ACCESS_CONTROL",
        title: "Role-based access control with least privilege",
        description:
            "Access rights follow defined roles, are reviewed periodically, and excess entitlements are removed.",
        verificationMode: "AUTOMATED",
    },
    {
        code: "J.3",
        measure: "ACCESS_CONTROL",
        title: "Privileged access management",
        description:
            "Administrative accounts are separated from daily-use accounts, inventoried, and their use is logged.",
        verificationMode: "PARTIAL",
    },
    {
        code: "J.4",
        measure: "ACCESS_CONTROL",
        title: "Secured emergency communication channel",
        description:
            "Art. 21(2)(j) requires secured voice, video, and text channels plus emergency communications that survive loss of primary systems.",
        verificationMode: "MANUAL",
    },
] as const;

export const NIS2_CHECKLIST_ITEM_COUNT = NIS2_CHECKLIST_TEMPLATE.length;
