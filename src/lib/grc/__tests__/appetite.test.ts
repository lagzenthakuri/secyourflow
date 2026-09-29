import { describe, expect, it } from "vitest";
import type { RiskAppetite } from "@prisma/client";
import {
    appetiteLevelLabel,
    evaluateAppetite,
    evaluateRiskAppetite,
    matchAppetite,
    normalizeAppetiteCategory,
    riskLevelForScore,
    worstAppetiteStatus,
} from "@/lib/grc/appetite";

type Statement = Pick<RiskAppetite, "category" | "toleranceMax" | "appetiteLevel">;

const statements: Statement[] = [
    { category: "Privacy", toleranceMax: 10, appetiteLevel: "AVERSE" },
    { category: "all", toleranceMax: 16, appetiteLevel: "MODERATE" },
];

describe("normalizeAppetiteCategory", () => {
    it("trims and upper-cases", () => {
        expect(normalizeAppetiteCategory("  privacy ")).toBe("PRIVACY");
        expect(normalizeAppetiteCategory(null)).toBe("");
        expect(normalizeAppetiteCategory(undefined)).toBe("");
    });
});

describe("matchAppetite", () => {
    it("matches the risk's primary category case-insensitively", () => {
        expect(matchAppetite(statements, ["PRIVACY"])?.category).toBe("Privacy");
        expect(matchAppetite(statements, ["privacy"])?.category).toBe("Privacy");
    });

    it("falls back to the secondary category before the catch-all", () => {
        expect(matchAppetite(statements, ["Unknown", "Privacy"])?.category).toBe("Privacy");
    });

    it("uses ALL as the catch-all when no category matches", () => {
        expect(matchAppetite(statements, ["Operational"])?.category).toBe("all");
    });

    it("returns null when nothing matches at all", () => {
        expect(matchAppetite([{ category: "Privacy", toleranceMax: 5, appetiteLevel: "AVERSE" }], ["Operational"])).toBeNull();
        expect(matchAppetite([], ["Privacy"])).toBeNull();
    });

    it("skips empty candidate categories", () => {
        expect(matchAppetite(statements, [null, "", "  ", "Privacy"])?.category).toBe("Privacy");
    });
});

describe("evaluateAppetite", () => {
    it("is WITHIN below 80% of tolerance", () => {
        expect(evaluateAppetite(7, 10)).toBe("WITHIN");
        expect(evaluateAppetite(0, 10)).toBe("WITHIN");
    });

    it("is APPROACHING from 80% of tolerance up to the tolerance", () => {
        expect(evaluateAppetite(8, 10)).toBe("APPROACHING");
        expect(evaluateAppetite(9.5, 10)).toBe("APPROACHING");
        expect(evaluateAppetite(10, 10)).toBe("APPROACHING");
    });

    it("is EXCEEDED only above the tolerance", () => {
        expect(evaluateAppetite(10.1, 10)).toBe("EXCEEDED");
        expect(evaluateAppetite(25, 10)).toBe("EXCEEDED");
    });

    it("handles the full 1-25 scale", () => {
        expect(evaluateAppetite(25, 25)).toBe("APPROACHING");
        expect(evaluateAppetite(17, 20)).toBe("APPROACHING");
        expect(evaluateAppetite(24, 20)).toBe("EXCEEDED");
        expect(evaluateAppetite(21, 20)).toBe("EXCEEDED");
        expect(evaluateAppetite(1, 1)).toBe("APPROACHING");
    });
});

describe("evaluateRiskAppetite", () => {
    it("evaluates against the matching statement", () => {
        const result = evaluateRiskAppetite(12, ["Privacy"], statements);
        expect(result.status).toBe("EXCEEDED");
        expect(result.statement?.category).toBe("Privacy");
        expect(result.toleranceMax).toBe(10);
    });

    it("returns NOT_EVALUATED when no statement matches", () => {
        const result = evaluateRiskAppetite(20, ["Operational"], [
            { category: "Privacy", toleranceMax: 10, appetiteLevel: "AVERSE" },
        ]);
        expect(result.status).toBe("NOT_EVALUATED");
        expect(result.statement).toBeNull();
        expect(result.toleranceMax).toBeNull();
        expect(result.score).toBe(20);
    });

    it("evaluates against the catch-all when only ALL matches", () => {
        const result = evaluateRiskAppetite(17, ["Operational"], statements);
        expect(result.statement?.category).toBe("all");
        expect(result.status).toBe("EXCEEDED");
    });
});

describe("worstAppetiteStatus", () => {
    it("ranks EXCEEDED worst, then APPROACHING, NOT_EVALUATED, WITHIN", () => {
        expect(worstAppetiteStatus(["WITHIN", "APPROACHING"])).toBe("APPROACHING");
        expect(worstAppetiteStatus(["WITHIN", "EXCEEDED", "APPROACHING"])).toBe("EXCEEDED");
        expect(worstAppetiteStatus(["WITHIN", "NOT_EVALUATED"])).toBe("NOT_EVALUATED");
        expect(worstAppetiteStatus(["NOT_EVALUATED", "APPROACHING"])).toBe("APPROACHING");
    });

    it("defaults to WITHIN for an empty set", () => {
        expect(worstAppetiteStatus([])).toBe("WITHIN");
    });
});

describe("riskLevelForScore", () => {
    it("bands the 1-25 scale", () => {
        expect(riskLevelForScore(25)).toBe("CRITICAL");
        expect(riskLevelForScore(20)).toBe("CRITICAL");
        expect(riskLevelForScore(19.9)).toBe("HIGH");
        expect(riskLevelForScore(12)).toBe("HIGH");
        expect(riskLevelForScore(11.9)).toBe("MEDIUM");
        expect(riskLevelForScore(6)).toBe("MEDIUM");
        expect(riskLevelForScore(5.9)).toBe("LOW");
        expect(riskLevelForScore(0)).toBe("LOW");
    });
});

describe("appetiteLevelLabel", () => {
    it("labels every declared level", () => {
        expect(appetiteLevelLabel("AVERSE")).toBe("Risk averse");
        expect(appetiteLevelLabel("CAUTIOUS")).toBe("Cautious");
        expect(appetiteLevelLabel("MODERATE")).toBe("Moderate");
        expect(appetiteLevelLabel("OPEN")).toBe("Open");
        expect(appetiteLevelLabel("HUNGRY")).toBe("Risk hungry");
    });
});
