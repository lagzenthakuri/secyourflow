import type { RiskAnalysisSource, Severity } from "@prisma/client";

/**
 * Pure risk scoring.
 *
 * Deliberately free of Prisma and network imports so it can be reasoned about
 * and tested on its own — this is the code that decides what a finding is
 * worth, and it runs on every vulnerability in the system.
 */

/** CVSS v3.1 CIA impacts, mapped onto the 1-5 scale used for scoring. */
export function parseCVSSVector(vector?: string): { c: number; i: number; a: number; parsed: boolean } {
    const defaults = { c: 3, i: 3, a: 3, parsed: false };
    if (!vector) return defaults;

    const scores = { ...defaults };
    const mapImpact = (value: string) => (value === "H" ? 5 : value === "L" ? 3 : value === "N" ? 1 : 3);

    let sawImpactMetric = false;
    for (const part of vector.split("/")) {
        const [key, value] = part.split(":");
        if (!key || !value) continue;
        if (key === "C") { scores.c = mapImpact(value); sawImpactMetric = true; }
        if (key === "I") { scores.i = mapImpact(value); sawImpactMetric = true; }
        if (key === "A") { scores.a = mapImpact(value); sawImpactMetric = true; }
    }

    scores.parsed = sawImpactMetric;
    return scores;
}

export interface RiskInputVulnerability {
    title: string;
    description?: string;
    cvssVector?: string;
    cveId?: string;
    severity?: Severity | null;
    cvssScore?: number;
    isExploited?: boolean;
    cisaKev?: boolean;
    epssScore?: number | null;
}

export interface RiskInputAsset {
    name: string;
    type: string;
    criticality?: string;
    environment?: string;
    owner?: string;
}

export interface RiskAnalysis {
    risk: string;
    threat: string;
    confidentiality_impact: number;
    integrity_impact: number;
    availability_impact: number;
    likelihood_score: number;
    risk_category: string;
    risk_category_2: string;
    rationale_for_risk_rating: string;
    current_controls: string[];
    selected_controls: string[];
    controls_violated_iso27001: string[];
    treatment_option: string;
    action_plan: string;
    responsible_party: string;
    remarks: string;
    confidence: number;
}

export type RiskAssessmentOutcome =
    | {
          status: "COMPLETED";
          riskEntryId: string;
          riskScore: number;
          analysisSource: RiskAnalysisSource;
      }
    | { status: "SKIPPED"; reason: string }
    | { status: "FAILED"; reason: string };

export function toNumber(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function toStringValue(value: unknown, fallback: string): string {
    return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

export function toStringArray(value: unknown, fallback: string[] = []): string[] {
    if (!Array.isArray(value)) return fallback;
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export function normalizeRiskAnalysis(raw: unknown, fallback: RiskAnalysis): RiskAnalysis {
    if (!raw || typeof raw !== "object") return fallback;

    const value = raw as Record<string, unknown>;
    return {
        risk: toStringValue(value.risk, fallback.risk),
        threat: toStringValue(value.threat, fallback.threat),
        // Impacts are computed from the CVSS vector, not taken from the model.
        confidentiality_impact: fallback.confidentiality_impact,
        integrity_impact: fallback.integrity_impact,
        availability_impact: fallback.availability_impact,
        likelihood_score: clamp(
            Math.round(toNumber(value.likelihood_score, fallback.likelihood_score)),
            1,
            5,
        ),
        risk_category: toStringValue(value.risk_category, fallback.risk_category),
        risk_category_2: toStringValue(value.risk_category_2, fallback.risk_category_2),
        rationale_for_risk_rating: toStringValue(
            value.rationale_for_risk_rating,
            fallback.rationale_for_risk_rating,
        ),
        current_controls: toStringArray(value.current_controls, fallback.current_controls),
        selected_controls: toStringArray(value.selected_controls, fallback.selected_controls),
        controls_violated_iso27001: toStringArray(
            value.controls_violated_iso27001,
            fallback.controls_violated_iso27001,
        ),
        treatment_option: toStringValue(value.treatment_option, fallback.treatment_option),
        action_plan: toStringValue(value.action_plan, fallback.action_plan),
        responsible_party: toStringValue(value.responsible_party, fallback.responsible_party),
        remarks: toStringValue(value.remarks, fallback.remarks),
        confidence: clamp(toNumber(value.confidence, fallback.confidence), 0, 1),
    };
}

const CRITICALITY_LIKELIHOOD_BONUS: Record<string, number> = {
    CRITICAL: 1,
    HIGH: 1,
    MEDIUM: 0,
    LOW: 0,
    INFORMATIONAL: 0,
};

/**
 * Deterministic scoring, used when no model is available.
 *
 * It states only what the input data supports. The previous version returned
 * invented values — `["Firewall"]`, `["MFA", "Encryption"]`, ISO controls
 * `A.9.1`/`A.13.1` — with `confidence: 0.8`, and the UI rendered them as a real
 * AI assessment. Those fabricated control IDs were also fed to the compliance
 * engine, which failed real controls on the strength of them.
 */
export function deterministicAnalysis(
    vulnerability: RiskInputVulnerability,
    asset: RiskInputAsset,
): RiskAnalysis {
    const cia = parseCVSSVector(vulnerability.cvssVector);

    let likelihood: number;
    switch (vulnerability.severity) {
        case "CRITICAL": likelihood = 4; break;
        case "HIGH": likelihood = 3; break;
        case "MEDIUM": likelihood = 2; break;
        case "LOW": likelihood = 2; break;
        default: likelihood = 1;
    }

    // Observed exploitation is evidence about likelihood, unlike severity which
    // only describes impact if exploited.
    if (vulnerability.cisaKev || vulnerability.isExploited) {
        likelihood += 1;
    }
    if (typeof vulnerability.epssScore === "number" && vulnerability.epssScore >= 0.5) {
        likelihood += 1;
    }
    likelihood += CRITICALITY_LIKELIHOOD_BONUS[asset.criticality?.toUpperCase() ?? ""] ?? 0;
    likelihood = clamp(likelihood, 1, 5);

    const signals = [
        `severity ${vulnerability.severity ?? "unknown"}`,
        cia.parsed ? `CVSS vector ${vulnerability.cvssVector}` : "no CVSS vector (impact defaulted to moderate)",
        vulnerability.cisaKev ? "listed in CISA KEV" : null,
        vulnerability.isExploited ? "known exploitation in the wild" : null,
        typeof vulnerability.epssScore === "number"
            ? `EPSS ${(vulnerability.epssScore * 100).toFixed(1)}%`
            : null,
        asset.criticality ? `asset criticality ${asset.criticality}` : null,
        asset.environment ? `${asset.environment} environment` : null,
    ].filter(Boolean);

    return {
        risk: `${vulnerability.title} on ${asset.name}`,
        threat: vulnerability.title,
        confidentiality_impact: cia.c,
        integrity_impact: cia.i,
        availability_impact: cia.a,
        likelihood_score: likelihood,
        risk_category: vulnerability.severity ? String(vulnerability.severity) : "UNKNOWN",
        risk_category_2: "",
        rationale_for_risk_rating:
            `Scored deterministically from ${signals.join(", ")}. ` +
            "No AI provider was available, so no control mapping or remediation plan was produced.",
        // Left empty on purpose: inventing these is worse than omitting them.
        current_controls: [],
        selected_controls: [],
        controls_violated_iso27001: [],
        treatment_option: "",
        action_plan: "",
        responsible_party: "",
        remarks: "",
        // Not a probability — a marker that this is a rules-based score.
        confidence: 0,
    };
}

/** Impact is the mean CIA score; risk is impact x likelihood, on a 1-25 scale. */
export function scoreFromAnalysis(analysis: RiskAnalysis): { impactScore: number; riskScore: number } {
    const impactScore =
        (analysis.confidentiality_impact + analysis.integrity_impact + analysis.availability_impact) / 3;
    return {
        impactScore: Number(impactScore.toFixed(2)),
        riskScore: Number((impactScore * analysis.likelihood_score).toFixed(2)),
    };
}
