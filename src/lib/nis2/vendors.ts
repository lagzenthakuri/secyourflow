import type { Nis2DataAccessLevel, Nis2VendorCriticality } from "@prisma/client";

/**
 * Art. 18 / Art. 21(2)(d) supplier risk scoring.
 *
 * The formula is published rather than hidden so an auditor can reproduce any
 * score by hand. Five components sum to 100 points; a vendor starts at 0 and
 * earns points for demonstrated assurance.
 */
export interface ScoreComponent {
    key: string;
    label: string;
    maxPoints: number;
    awarded: number;
    rationale: string;
}

export interface VendorScore {
    score: number;
    band: "LOW" | "MODERATE" | "ELEVATED" | "HIGH";
    components: ScoreComponent[];
    /** Conditions that materially weaken the score, surfaced to the reviewer. */
    flags: string[];
}

/** Recognised certification identifiers and their assurance weight. */
const CERTIFICATION_POINTS: Record<string, number> = {
    ISO27001: 12,
    ISO22301: 6,
    SOC2: 10,
    "CSA-STAR": 6,
    "ISO9001": 3,
    PCIDSS: 6,
    TISAX: 6,
};

export const CERTIFICATION_OPTIONS = Object.keys(CERTIFICATION_POINTS);

const MAX_CERTIFICATION_POINTS = 25;
const MAX_CONTRACT_POINTS = 30;
const MAX_AUDIT_POINTS = 20;
const MAX_DATA_ACCESS_POINTS = 15;
const MAX_GEOGRAPHY_POINTS = 10;

/** Data access inverts: the less the vendor can reach, the more points. */
const DATA_ACCESS_POINTS: Record<Nis2DataAccessLevel, number> = {
    NONE: 15,
    PUBLIC: 13,
    INTERNAL: 9,
    CONFIDENTIAL: 4,
    RESTRICTED: 0,
};

const AUDIT_RECENCY_DAYS = [
    { withinDays: 365, points: 20, label: "audited within 12 months" },
    { withinDays: 730, points: 12, label: "audited within 24 months" },
    { withinDays: 1095, points: 5, label: "audited within 36 months" },
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The subset of vendor fields the formula reads. Kept structural rather than
 * a Prisma `Pick` so both persisted rows and not-yet-created input can be
 * scored with the same function.
 */
export interface ScorableVendor {
    certifications: string[];
    slaDefined: boolean;
    auditRights: boolean;
    securityClauses: boolean;
    breachNotifiedIn?: number | null;
    contractEnd?: Date | null;
    lastAuditAt?: Date | null;
    dataAccessLevel: Nis2DataAccessLevel;
    euBased: boolean;
    criticality: Nis2VendorCriticality;
    country?: string | null;
}

function scoreCertifications(certifications: string[]): ScoreComponent {
    const recognised = certifications.filter((cert) => cert in CERTIFICATION_POINTS);
    const raw = recognised.reduce((sum, cert) => sum + CERTIFICATION_POINTS[cert], 0);
    const awarded = Math.min(raw, MAX_CERTIFICATION_POINTS);

    return {
        key: "certifications",
        label: "Certifications",
        maxPoints: MAX_CERTIFICATION_POINTS,
        awarded,
        rationale: recognised.length
            ? `${recognised.join(", ")} (capped at ${MAX_CERTIFICATION_POINTS})`
            : "No recognised certification on record",
    };
}

function scoreContract(vendor: ScorableVendor, now: Date): ScoreComponent {
    let awarded = 0;
    const held: string[] = [];

    if (vendor.securityClauses) {
        awarded += 12;
        held.push("security clauses");
    }
    if (vendor.auditRights) {
        awarded += 10;
        held.push("audit rights");
    }
    if (vendor.slaDefined) {
        awarded += 5;
        held.push("defined SLA");
    }
    if (vendor.breachNotifiedIn != null && vendor.breachNotifiedIn <= 24) {
        awarded += 3;
        held.push(`${vendor.breachNotifiedIn}h breach notification`);
    }

    // An expired contract voids the clauses it carried.
    if (vendor.contractEnd && vendor.contractEnd < now) {
        awarded = 0;
        return {
            key: "contract",
            label: "Contractual controls",
            maxPoints: MAX_CONTRACT_POINTS,
            awarded,
            rationale: "Contract expired — contractual controls are not enforceable",
        };
    }

    return {
        key: "contract",
        label: "Contractual controls",
        maxPoints: MAX_CONTRACT_POINTS,
        awarded: Math.min(awarded, MAX_CONTRACT_POINTS),
        rationale: held.length ? held.join(", ") : "No security terms recorded in the contract",
    };
}

function scoreAuditRecency(lastAuditAt: Date | null, now: Date): ScoreComponent {
    if (!lastAuditAt) {
        return {
            key: "audit",
            label: "Assessment recency",
            maxPoints: MAX_AUDIT_POINTS,
            awarded: 0,
            rationale: "Never assessed",
        };
    }

    const ageDays = Math.floor((now.getTime() - lastAuditAt.getTime()) / DAY_MS);
    const band = AUDIT_RECENCY_DAYS.find((entry) => ageDays <= entry.withinDays);

    return {
        key: "audit",
        label: "Assessment recency",
        maxPoints: MAX_AUDIT_POINTS,
        awarded: band?.points ?? 0,
        rationale: band ? `Last ${band.label} (${ageDays} days ago)` : `Last assessed ${ageDays} days ago — stale`,
    };
}

function scoreDataAccess(level: Nis2DataAccessLevel): ScoreComponent {
    return {
        key: "dataAccess",
        label: "Data exposure",
        maxPoints: MAX_DATA_ACCESS_POINTS,
        awarded: DATA_ACCESS_POINTS[level],
        rationale: `Vendor data access level: ${level}`,
    };
}

function scoreGeography(euBased: boolean, country: string | null | undefined): ScoreComponent {
    return {
        key: "geography",
        label: "Jurisdiction",
        maxPoints: MAX_GEOGRAPHY_POINTS,
        awarded: euBased ? MAX_GEOGRAPHY_POINTS : 3,
        rationale: euBased
            ? `EU/EEA jurisdiction${country ? ` (${country})` : ""}`
            : `Third-country jurisdiction${country ? ` (${country})` : ""} — transfer safeguards required`,
    };
}

function bandFor(score: number): VendorScore["band"] {
    if (score >= 80) return "LOW";
    if (score >= 60) return "MODERATE";
    if (score >= 40) return "ELEVATED";
    return "HIGH";
}

/** Suppliers this critical are expected to clear a higher bar. */
const CRITICALITY_EXPECTED_SCORE: Record<Nis2VendorCriticality, number> = {
    LEVEL_1: 80,
    LEVEL_2: 65,
    LEVEL_3: 50,
    LEVEL_4: 0,
};

export function scoreVendor(vendor: ScorableVendor, now = new Date()): VendorScore {
    const components = [
        scoreCertifications(vendor.certifications),
        scoreContract(vendor, now),
        scoreAuditRecency(vendor.lastAuditAt ?? null, now),
        scoreDataAccess(vendor.dataAccessLevel),
        scoreGeography(vendor.euBased, vendor.country),
    ];

    const score = components.reduce((sum, component) => sum + component.awarded, 0);

    const flags: string[] = [];
    const expected = CRITICALITY_EXPECTED_SCORE[vendor.criticality];
    if (score < expected) {
        flags.push(
            `Score ${score} is below the ${expected}-point expectation for a ${vendor.criticality.replace("_", " ")} supplier`,
        );
    }
    if (vendor.contractEnd && vendor.contractEnd < now) {
        flags.push("Contract has expired");
    }
    if (!vendor.auditRights && (vendor.criticality === "LEVEL_1" || vendor.criticality === "LEVEL_2")) {
        flags.push("Critical supplier without contractual audit rights");
    }
    if (
        (vendor.dataAccessLevel === "RESTRICTED" || vendor.dataAccessLevel === "CONFIDENTIAL") &&
        !vendor.securityClauses
    ) {
        flags.push("Access to sensitive data without contractual security clauses");
    }
    if (!vendor.euBased && vendor.dataAccessLevel !== "NONE") {
        flags.push("Third-country supplier with data access — verify transfer mechanism");
    }

    return { score, band: bandFor(score), components, flags };
}

/** Machine-readable formula description for auditors. */
export function getScoreFormula() {
    return {
        version: "1.0",
        totalPoints: 100,
        components: [
            {
                key: "certifications",
                maxPoints: MAX_CERTIFICATION_POINTS,
                weights: CERTIFICATION_POINTS,
                note: "Sum of recognised certifications, capped at the component maximum.",
            },
            {
                key: "contract",
                maxPoints: MAX_CONTRACT_POINTS,
                weights: {
                    securityClauses: 12,
                    auditRights: 10,
                    slaDefined: 5,
                    breachNotificationWithin24h: 3,
                },
                note: "Zeroed entirely when the contract end date has passed.",
            },
            {
                key: "audit",
                maxPoints: MAX_AUDIT_POINTS,
                weights: Object.fromEntries(
                    AUDIT_RECENCY_DAYS.map((entry) => [`within${entry.withinDays}Days`, entry.points]),
                ),
                note: "Zero when never assessed or last assessed over 36 months ago.",
            },
            {
                key: "dataAccess",
                maxPoints: MAX_DATA_ACCESS_POINTS,
                weights: DATA_ACCESS_POINTS,
                note: "Inverted: less vendor access to data scores higher.",
            },
            {
                key: "geography",
                maxPoints: MAX_GEOGRAPHY_POINTS,
                weights: { euBased: MAX_GEOGRAPHY_POINTS, thirdCountry: 3 },
                note: "Third-country suppliers require documented transfer safeguards.",
            },
        ],
        bands: {
            LOW: ">= 80",
            MODERATE: "60 - 79",
            ELEVATED: "40 - 59",
            HIGH: "< 40",
        },
        criticalityExpectations: CRITICALITY_EXPECTED_SCORE,
    };
}
