import type { RiskAppetite, RiskAppetiteLevel, RiskAppetiteStatus } from "@prisma/client";

/**
 * Risk appetite evaluation.
 *
 * Statements are matched to a risk by category (case-insensitive) and the
 * risk's score is compared against that statement's tolerance. Status is
 * derived at read time — never stored — so editing a tolerance immediately
 * propagates to every risk, vendor and asset view.
 */

/** A score is "approaching" appetite once it reaches 80% of the tolerance. */
export const APPROACHING_RATIO = 0.8;

/** Score bands on the 1-25 (impact x likelihood) scale. */
export const RISK_LEVEL_THRESHOLDS = { CRITICAL: 20, HIGH: 12, MEDIUM: 6 } as const;

export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

/** The subset of a statement the evaluator needs. */
export type AppetiteStatement = Pick<RiskAppetite, "category" | "toleranceMax" | "appetiteLevel">;

export interface AppetiteEvaluation<T extends AppetiteStatement = AppetiteStatement> {
    status: RiskAppetiteStatus;
    /** The statement that governed the evaluation, or null when none matched. */
    statement: T | null;
    toleranceMax: number | null;
    score: number;
}

export function normalizeAppetiteCategory(category: string | null | undefined): string {
    return (category ?? "").trim().toUpperCase();
}

/**
 * Pick the statement governing a risk. Candidates are tried in order (the
 * risk's primary category first), then the literal "ALL" catch-all. Returns
 * null when nothing matches, which evaluates to NOT_EVALUATED.
 */
export function matchAppetite<T extends AppetiteStatement>(
    statements: readonly T[],
    categories: readonly (string | null | undefined)[],
): T | null {
    const wanted = categories
        .map(normalizeAppetiteCategory)
        .filter((category): category is string => category.length > 0);

    for (const category of wanted) {
        const hit = statements.find(
            (statement) => normalizeAppetiteCategory(statement.category) === category,
        );
        if (hit) return hit;
    }

    return (
        statements.find(
            (statement) => normalizeAppetiteCategory(statement.category) === "ALL",
        ) ?? null
    );
}

/** Where a score sits relative to a tolerance. */
export function evaluateAppetite(score: number, toleranceMax: number): RiskAppetiteStatus {
    if (score > toleranceMax) return "EXCEEDED";
    if (score >= toleranceMax * APPROACHING_RATIO) return "APPROACHING";
    return "WITHIN";
}

/**
 * Evaluate a risk against its matching statement. A risk whose score exceeds
 * the tolerance is EXCEEDED even if it only matched the catch-all.
 */
export function evaluateRiskAppetite<T extends AppetiteStatement>(
    score: number,
    categories: readonly (string | null | undefined)[],
    statements: readonly T[],
): AppetiteEvaluation<T> {
    const statement = matchAppetite(statements, categories);

    if (!statement) {
        return { status: "NOT_EVALUATED", statement: null, toleranceMax: null, score };
    }

    return {
        status: evaluateAppetite(score, statement.toleranceMax),
        statement,
        toleranceMax: statement.toleranceMax,
        score,
    };
}

const STATUS_SEVERITY: Record<RiskAppetiteStatus, number> = {
    WITHIN: 0,
    NOT_EVALUATED: 1,
    APPROACHING: 2,
    EXCEEDED: 3,
};

/** The worst status in a set — used to summarize a vendor, asset or portfolio. */
export function worstAppetiteStatus(
    statuses: readonly RiskAppetiteStatus[],
): RiskAppetiteStatus {
    return statuses.reduce<RiskAppetiteStatus>(
        (worst, status) => (STATUS_SEVERITY[status] > STATUS_SEVERITY[worst] ? status : worst),
        "WITHIN",
    );
}

/** Band a 1-25 score into the displayable risk level. */
export function riskLevelForScore(score: number): RiskLevel {
    if (score >= RISK_LEVEL_THRESHOLDS.CRITICAL) return "CRITICAL";
    if (score >= RISK_LEVEL_THRESHOLDS.HIGH) return "HIGH";
    if (score >= RISK_LEVEL_THRESHOLDS.MEDIUM) return "MEDIUM";
    return "LOW";
}

/**
 * Candidate appetite categories for a stored risk row, in priority order:
 * the analysis' primary category first, then its secondary category, then the
 * register's editable `riskCategory2`.
 */
export function riskCategoriesFrom(risk: {
    aiAnalysis?: unknown;
    riskCategory2?: string | null;
}): string[] {
    const analysis = (risk.aiAnalysis ?? {}) as Record<string, unknown>;
    const primary = typeof analysis.risk_category === "string" ? analysis.risk_category : "";
    const secondary = typeof analysis.risk_category_2 === "string" ? analysis.risk_category_2 : "";
    return [primary, secondary, risk.riskCategory2 ?? ""];
}

const APPETITE_LEVEL_LABELS: Record<RiskAppetiteLevel, string> = {
    AVERSE: "Risk averse",
    CAUTIOUS: "Cautious",
    MODERATE: "Moderate",
    OPEN: "Open",
    HUNGRY: "Risk hungry",
};

export function appetiteLevelLabel(level: RiskAppetiteLevel): string {
    return APPETITE_LEVEL_LABELS[level];
}
