import type { PolicyStatus } from "@prisma/client";

/**
 * Policy lifecycle: DRAFT -> UNDER_REVIEW -> ACTIVE, with review cycles back
 * through UNDER_REVIEW and retirement to ARCHIVED. Mirrors the GRC Lab
 * workflow (draft, review, approve, retire) against this schema's
 * DRAFT / UNDER_REVIEW / ACTIVE / ARCHIVED statuses.
 */

export const POLICY_STATUSES: readonly PolicyStatus[] = [
    "DRAFT",
    "UNDER_REVIEW",
    "ACTIVE",
    "ARCHIVED",
];

const TRANSITIONS: Record<PolicyStatus, readonly PolicyStatus[]> = {
    DRAFT: ["UNDER_REVIEW"],
    // Submitting for review, or sending a rejected draft back to the author.
    UNDER_REVIEW: ["ACTIVE", "DRAFT"],
    // Approve, schedule the next review, or retire.
    ACTIVE: ["UNDER_REVIEW", "ARCHIVED"],
    // A retired policy restarts as a fresh draft rather than resurrecting.
    ARCHIVED: ["DRAFT"],
};

export const POLICY_REVIEW_INTERVAL_MONTHS = 12;
export const POLICY_REVIEW_DUE_SOON_DAYS = 30;

export type PolicyReviewState = "UNSCHEDULED" | "CURRENT" | "DUE_SOON" | "OVERDUE";

export function canTransitionPolicyStatus(from: PolicyStatus, to: PolicyStatus): boolean {
    return TRANSITIONS[from]?.includes(to) ?? false;
}

export function allowedPolicyTransitions(from: PolicyStatus): readonly PolicyStatus[] {
    return TRANSITIONS[from] ?? [];
}

export function assertValidPolicyTransition(from: PolicyStatus, to: PolicyStatus): void {
    if (!canTransitionPolicyStatus(from, to)) {
        throw new Error(`Invalid policy transition: ${from} -> ${to}`);
    }
}

/** Review dates a status change implies, or null to leave them untouched. */
export interface PolicyReviewStamp {
    lastReview: Date | null;
    nextReview: Date | null;
}

export function addMonths(date: Date, months: number): Date {
    const result = new Date(date.getTime());
    result.setUTCMonth(result.getUTCMonth() + months);
    return result;
}

/**
 * Compute the review timestamps for a transition. Approving (entering ACTIVE)
 * starts a fresh annual review cycle; every other transition leaves the
 * existing dates alone.
 */
export function policyReviewStampForTransition(
    from: PolicyStatus,
    to: PolicyStatus,
    now: Date,
): PolicyReviewStamp {
    if (to === "ACTIVE" && from !== "ACTIVE") {
        return {
            lastReview: now,
            nextReview: addMonths(now, POLICY_REVIEW_INTERVAL_MONTHS),
        };
    }
    return { lastReview: null, nextReview: null };
}

/** Review freshness for display: overdue, due within 30 days, current, unscheduled. */
export function policyReviewState(
    policy: { status: PolicyStatus; nextReview: Date | null },
    now: Date = new Date(),
): PolicyReviewState {
    if (!policy.nextReview) return "UNSCHEDULED";

    const horizonMs = POLICY_REVIEW_DUE_SOON_DAYS * 24 * 60 * 60 * 1000;
    const delta = policy.nextReview.getTime() - now.getTime();

    if (delta < 0) return "OVERDUE";
    if (delta <= horizonMs) return "DUE_SOON";
    return "CURRENT";
}
