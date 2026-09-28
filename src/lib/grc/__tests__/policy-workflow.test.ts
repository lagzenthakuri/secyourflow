import { describe, expect, it } from "vitest";
import {
    addMonths,
    allowedPolicyTransitions,
    assertValidPolicyTransition,
    canTransitionPolicyStatus,
    policyReviewStampForTransition,
    policyReviewState,
    POLICY_REVIEW_INTERVAL_MONTHS,
    POLICY_STATUSES,
} from "@/lib/grc/policy-workflow";

const NOW = new Date("2026-09-23T12:00:00.000Z");

describe("canTransitionPolicyStatus", () => {
    it("follows the draft -> review -> active lifecycle", () => {
        expect(canTransitionPolicyStatus("DRAFT", "UNDER_REVIEW")).toBe(true);
        expect(canTransitionPolicyStatus("UNDER_REVIEW", "ACTIVE")).toBe(true);
    });

    it("allows review cycles and retirement from ACTIVE", () => {
        expect(canTransitionPolicyStatus("ACTIVE", "UNDER_REVIEW")).toBe(true);
        expect(canTransitionPolicyStatus("ACTIVE", "ARCHIVED")).toBe(true);
    });

    it("sends a rejected draft back and restarts a retired policy as a draft", () => {
        expect(canTransitionPolicyStatus("UNDER_REVIEW", "DRAFT")).toBe(true);
        expect(canTransitionPolicyStatus("ARCHIVED", "DRAFT")).toBe(true);
    });

    it("rejects skipping review and self-transitions", () => {
        expect(canTransitionPolicyStatus("DRAFT", "ACTIVE")).toBe(false);
        expect(canTransitionPolicyStatus("DRAFT", "ARCHIVED")).toBe(false);
        expect(canTransitionPolicyStatus("ARCHIVED", "ACTIVE")).toBe(false);
        expect(canTransitionPolicyStatus("ACTIVE", "ACTIVE")).toBe(false);
        expect(canTransitionPolicyStatus("UNDER_REVIEW", "UNDER_REVIEW")).toBe(false);
    });

    it("never throws for any pair of declared statuses", () => {
        for (const from of POLICY_STATUSES) {
            for (const to of POLICY_STATUSES) {
                expect(() => canTransitionPolicyStatus(from, to)).not.toThrow();
            }
        }
    });

    it("throws with the pair in the message", () => {
        expect(() => assertValidPolicyTransition("DRAFT", "ACTIVE")).toThrow(
            /Invalid policy transition: DRAFT -> ACTIVE/,
        );
        expect(() => assertValidPolicyTransition("DRAFT", "UNDER_REVIEW")).not.toThrow();
    });
});

describe("allowedPolicyTransitions", () => {
    it("lists the actions offered from each status", () => {
        expect(allowedPolicyTransitions("DRAFT")).toEqual(["UNDER_REVIEW"]);
        expect(allowedPolicyTransitions("UNDER_REVIEW")).toEqual(["ACTIVE", "DRAFT"]);
        expect(allowedPolicyTransitions("ACTIVE")).toEqual(["UNDER_REVIEW", "ARCHIVED"]);
        expect(allowedPolicyTransitions("ARCHIVED")).toEqual(["DRAFT"]);
    });
});

describe("policyReviewStampForTransition", () => {
    it("starts a fresh annual cycle when a policy is approved", () => {
        const stamp = policyReviewStampForTransition("UNDER_REVIEW", "ACTIVE", NOW);
        expect(stamp.lastReview).toEqual(NOW);
        expect(stamp.nextReview?.getUTCFullYear()).toBe(
            NOW.getUTCFullYear() + POLICY_REVIEW_INTERVAL_MONTHS / 12,
        );
    });

    it("leaves review dates untouched for every other transition", () => {
        expect(policyReviewStampForTransition("DRAFT", "UNDER_REVIEW", NOW)).toEqual({
            lastReview: null,
            nextReview: null,
        });
        expect(policyReviewStampForTransition("ACTIVE", "ARCHIVED", NOW)).toEqual({
            lastReview: null,
            nextReview: null,
        });
        expect(policyReviewStampForTransition("ACTIVE", "UNDER_REVIEW", NOW)).toEqual({
            lastReview: null,
            nextReview: null,
        });
    });
});

describe("addMonths", () => {
    it("rolls over year boundaries", () => {
        expect(addMonths(new Date("2026-11-30T00:00:00Z"), 2)).toEqual(
            new Date("2027-01-30T00:00:00Z"),
        );
    });
});

describe("policyReviewState", () => {
    const day = 24 * 60 * 60 * 1000;

    it("is UNSCHEDULED without a next review date", () => {
        expect(policyReviewState({ status: "ACTIVE", nextReview: null }, NOW)).toBe("UNSCHEDULED");
    });

    it("is OVERDUE past the date", () => {
        expect(
            policyReviewState({ status: "ACTIVE", nextReview: new Date(NOW.getTime() - day) }, NOW),
        ).toBe("OVERDUE");
    });

    it("is DUE_SOON within 30 days", () => {
        expect(
            policyReviewState({ status: "ACTIVE", nextReview: new Date(NOW.getTime() + 29 * day) }, NOW),
        ).toBe("DUE_SOON");
    });

    it("is CURRENT beyond the horizon", () => {
        expect(
            policyReviewState({ status: "ACTIVE", nextReview: new Date(NOW.getTime() + 31 * day) }, NOW),
        ).toBe("CURRENT");
    });
});
