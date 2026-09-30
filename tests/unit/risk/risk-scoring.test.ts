import { describe, expect, it } from "vitest";

/**
 * Risk calculation tests.
 *
 * Tests the core risk scoring logic in the SecYourFlow platform.
 * These tests verify the deterministic risk calculation path that runs
 * when no AI provider is available.
 */

import {
  deterministicAnalysis,
  scoreFromAnalysis,
  parseCVSSVector,
  clamp,
  normalizeRiskAnalysis,
  type RiskAnalysis,
} from "@/lib/risk/scoring";

const defaultAsset = {
  name: "web-01",
  type: "SERVER",
  criticality: "HIGH",
  environment: "PRODUCTION",
};

const defaultAnalysis: RiskAnalysis = {
  action_plan: "",
  availability_impact: 3,
  confidence: 0,
  confidentiality_impact: 3,
  controls_violated_iso27001: [],
  current_controls: [],
  integrity_impact: 3,
  likelihood_score: 3,
  rationale_for_risk_rating: "test",
  remarks: "",
  responsible_party: "",
  risk: "test risk",
  risk_category: "HIGH",
  risk_category_2: "",
  selected_controls: [],
  threat: "test threat",
  treatment_option: "",
};

describe("parseCVSSVector", () => {
  it("returns defaults when vector is undefined", () => {
    const result = parseCVSSVector(undefined);
    expect(result).toEqual({ c: 3, i: 3, a: 3, parsed: false });
  });

  it("returns defaults when vector is empty", () => {
    const result = parseCVSSVector("");
    expect(result).toEqual({ c: 3, i: 3, a: 3, parsed: false });
  });

  it("parses all-high CVSS vector", () => {
    const result = parseCVSSVector(
      "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"
    );
    expect(result.c).toBe(5);
    expect(result.i).toBe(5);
    expect(result.a).toBe(5);
    expect(result.parsed).toBe(true);
  });

  it("parses all-low CVSS vector", () => {
    const result = parseCVSSVector(
      "CVSS:3.1/AV:P/AC:H/PR:H/UI:R/S:U/C:L/I:L/A:L"
    );
    expect(result.c).toBe(3);
    expect(result.i).toBe(3);
    expect(result.a).toBe(3);
    expect(result.parsed).toBe(true);
  });

  it("parses all-none CVSS vector", () => {
    const result = parseCVSSVector(
      "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N"
    );
    expect(result.c).toBe(1);
    expect(result.i).toBe(1);
    expect(result.a).toBe(1);
    expect(result.parsed).toBe(true);
  });

  it("parses mixed CVSS vector", () => {
    const result = parseCVSSVector(
      "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N"
    );
    expect(result.c).toBe(5);
    expect(result.i).toBe(3);
    expect(result.a).toBe(1);
    expect(result.parsed).toBe(true);
  });

  it("handles malformed vectors gracefully", () => {
    const result = parseCVSSVector("not-a-vector");
    expect(result).toEqual({ c: 3, i: 3, a: 3, parsed: false });
  });

  it("handles partial vectors", () => {
    const result = parseCVSSVector("CVSS:3.1/C:H");
    expect(result.c).toBe(5);
    expect(result.i).toBe(3);
    expect(result.a).toBe(3);
    expect(result.parsed).toBe(true);
  });

  it("ignores unknown metrics", () => {
    const result = parseCVSSVector(
      "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H/E:F/RL:O/RC:C"
    );
    expect(result.c).toBe(5);
    expect(result.i).toBe(5);
    expect(result.a).toBe(5);
    expect(result.parsed).toBe(true);
  });
});

describe("clamp", () => {
  it("clamps values within range", () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(1, 1, 10)).toBe(1);
    expect(clamp(10, 1, 10)).toBe(10);
  });

  it("clamps values below minimum", () => {
    expect(clamp(0, 1, 10)).toBe(1);
    expect(clamp(-5, 1, 10)).toBe(1);
  });

  it("clamps values above maximum", () => {
    expect(clamp(11, 1, 10)).toBe(10);
    expect(clamp(100, 1, 10)).toBe(10);
  });

  it("handles edge cases", () => {
    expect(clamp(1, 1, 1)).toBe(1);
    expect(clamp(0, 0, 0)).toBe(0);
  });
});

describe("scoreFromAnalysis", () => {
  it("calculates impact as mean of CIA scores", () => {
    const result = scoreFromAnalysis({
      ...defaultAnalysis,
      confidentiality_impact: 5,
      integrity_impact: 3,
      availability_impact: 1,
    });
    expect(result.impactScore).toBe(3);
  });

  it("calculates risk as impact x likelihood", () => {
    const result = scoreFromAnalysis({
      ...defaultAnalysis,
      confidentiality_impact: 5,
      integrity_impact: 5,
      availability_impact: 5,
      likelihood_score: 4,
    });
    expect(result.impactScore).toBe(5);
    expect(result.riskScore).toBe(20);
  });

  it("produces scores within 1-25 range", () => {
    for (let c = 1; c <= 5; c++) {
      for (let i = 1; i <= 5; i++) {
        for (let a = 1; a <= 5; a++) {
          for (let l = 1; l <= 5; l++) {
            const result = scoreFromAnalysis({
              ...defaultAnalysis,
              confidentiality_impact: c,
              integrity_impact: i,
              availability_impact: a,
              likelihood_score: l,
            });
            expect(result.riskScore).toBeGreaterThanOrEqual(1);
            expect(result.riskScore).toBeLessThanOrEqual(25);
          }
        }
      }
    }
  });

  it("rounds to 2 decimal places", () => {
    const result = scoreFromAnalysis({
      ...defaultAnalysis,
      confidentiality_impact: 4,
      integrity_impact: 3,
      availability_impact: 2,
      likelihood_score: 3,
    });
    // (4+3+2)/3 = 3, 3*3 = 9
    expect(result.impactScore).toBe(3);
    expect(result.riskScore).toBe(9);
  });
});

describe("deterministicAnalysis", () => {
  it("produces zero confidence", () => {
    const result = deterministicAnalysis(
      { title: "test", severity: "HIGH" },
      defaultAsset
    );
    expect(result.confidence).toBe(0);
  });

  it("invents no controls", () => {
    const result = deterministicAnalysis(
      { title: "test", severity: "CRITICAL" },
      defaultAsset
    );
    expect(result.current_controls).toEqual([]);
    expect(result.selected_controls).toEqual([]);
    expect(result.controls_violated_iso27001).toEqual([]);
  });

  it("invents no treatment or owner", () => {
    const result = deterministicAnalysis(
      { title: "test", severity: "HIGH" },
      defaultAsset
    );
    expect(result.treatment_option).toBe("");
    expect(result.responsible_party).toBe("");
    expect(result.action_plan).toBe("");
  });

  it("sets likelihood based on severity", () => {
    const critical = deterministicAnalysis(
      { title: "test", severity: "CRITICAL" },
      { ...defaultAsset, criticality: "LOW" }
    );
    const high = deterministicAnalysis(
      { title: "test", severity: "HIGH" },
      { ...defaultAsset, criticality: "LOW" }
    );
    const medium = deterministicAnalysis(
      { title: "test", severity: "MEDIUM" },
      { ...defaultAsset, criticality: "LOW" }
    );
    const low = deterministicAnalysis(
      { title: "test", severity: "LOW" },
      { ...defaultAsset, criticality: "LOW" }
    );

    expect(critical.likelihood_score).toBeGreaterThan(high.likelihood_score);
    expect(high.likelihood_score).toBeGreaterThanOrEqual(medium.likelihood_score);
    expect(medium.likelihood_score).toBeGreaterThanOrEqual(low.likelihood_score);
  });

  it("increases likelihood for CISA KEV vulnerabilities", () => {
    const base = deterministicAnalysis(
      { title: "test", severity: "MEDIUM" },
      { ...defaultAsset, criticality: "LOW" }
    );
    const kev = deterministicAnalysis(
      { title: "test", severity: "MEDIUM", cisaKev: true },
      { ...defaultAsset, criticality: "LOW" }
    );
    expect(kev.likelihood_score).toBeGreaterThan(base.likelihood_score);
  });

  it("increases likelihood for exploited vulnerabilities", () => {
    const base = deterministicAnalysis(
      { title: "test", severity: "MEDIUM" },
      { ...defaultAsset, criticality: "LOW" }
    );
    const exploited = deterministicAnalysis(
      { title: "test", severity: "MEDIUM", isExploited: true },
      { ...defaultAsset, criticality: "LOW" }
    );
    expect(exploited.likelihood_score).toBeGreaterThan(base.likelihood_score);
  });

  it("increases likelihood for high EPSS scores", () => {
    const base = deterministicAnalysis(
      { title: "test", severity: "MEDIUM" },
      { ...defaultAsset, criticality: "LOW" }
    );
    const highEpss = deterministicAnalysis(
      { title: "test", severity: "MEDIUM", epssScore: 0.8 },
      { ...defaultAsset, criticality: "LOW" }
    );
    expect(highEpss.likelihood_score).toBeGreaterThan(base.likelihood_score);
  });

  it("does not increase likelihood for low EPSS scores", () => {
    const base = deterministicAnalysis(
      { title: "test", severity: "MEDIUM" },
      { ...defaultAsset, criticality: "LOW" }
    );
    const lowEpss = deterministicAnalysis(
      { title: "test", severity: "MEDIUM", epssScore: 0.1 },
      { ...defaultAsset, criticality: "LOW" }
    );
    expect(lowEpss.likelihood_score).toBe(base.likelihood_score);
  });

  it("increases likelihood for critical assets", () => {
    const low = deterministicAnalysis(
      { title: "test", severity: "MEDIUM" },
      { ...defaultAsset, criticality: "LOW" }
    );
    const critical = deterministicAnalysis(
      { title: "test", severity: "MEDIUM" },
      { ...defaultAsset, criticality: "CRITICAL" }
    );
    expect(critical.likelihood_score).toBeGreaterThan(low.likelihood_score);
  });

  it("clamps likelihood to 1-5 range", () => {
    const result = deterministicAnalysis(
      {
        title: "test",
        severity: "CRITICAL",
        cisaKev: true,
        isExploited: true,
        epssScore: 0.99,
      },
      { ...defaultAsset, criticality: "CRITICAL" }
    );
    expect(result.likelihood_score).toBeLessThanOrEqual(5);
    expect(result.likelihood_score).toBeGreaterThanOrEqual(1);
  });

  it("derives CIA impacts from CVSS vector", () => {
    const result = deterministicAnalysis(
      {
        title: "test",
        severity: "HIGH",
        cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N",
      },
      defaultAsset
    );
    expect(result.confidentiality_impact).toBe(5);
    expect(result.integrity_impact).toBe(3);
    expect(result.availability_impact).toBe(1);
  });

  it("uses default impacts when no CVSS vector", () => {
    const result = deterministicAnalysis(
      { title: "test", severity: "HIGH" },
      defaultAsset
    );
    expect(result.confidentiality_impact).toBe(3);
    expect(result.integrity_impact).toBe(3);
    expect(result.availability_impact).toBe(3);
  });

  it("produces deterministic results", () => {
    const input = {
      title: "test",
      severity: "HIGH" as const,
      cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N",
    };
    const result1 = deterministicAnalysis(input, defaultAsset);
    const result2 = deterministicAnalysis(input, defaultAsset);
    expect(result1).toEqual(result2);
  });

  it("includes severity in risk category", () => {
    const result = deterministicAnalysis(
      { title: "test", severity: "CRITICAL" },
      defaultAsset
    );
    expect(result.risk_category).toBe("CRITICAL");
  });

  it("handles unknown severity", () => {
    const result = deterministicAnalysis(
      { title: "test", severity: null },
      defaultAsset
    );
    expect(result.risk_category).toBe("UNKNOWN");
  });
});

describe("normalizeRiskAnalysis", () => {
  it("returns fallback for null input", () => {
    const result = normalizeRiskAnalysis(null, defaultAnalysis);
    expect(result).toEqual(defaultAnalysis);
  });

  it("returns fallback for non-object input", () => {
    const result = normalizeRiskAnalysis("string", defaultAnalysis);
    expect(result).toEqual(defaultAnalysis);
  });

  it("clamps likelihood_score to 1-5", () => {
    const result = normalizeRiskAnalysis(
      { likelihood_score: 10 },
      defaultAnalysis
    );
    expect(result.likelihood_score).toBe(5);
  });

  it("clamps confidence to 0-1", () => {
    const result = normalizeRiskAnalysis(
      { confidence: 2 },
      defaultAnalysis
    );
    expect(result.confidence).toBe(1);
  });

  it("uses fallback for missing string fields", () => {
    const result = normalizeRiskAnalysis({}, defaultAnalysis);
    expect(result.risk).toBe(defaultAnalysis.risk);
    expect(result.threat).toBe(defaultAnalysis.threat);
  });

  it("filters non-string items from arrays", () => {
    const result = normalizeRiskAnalysis(
      { current_controls: ["valid", 123, null, "also-valid"] },
      defaultAnalysis
    );
    expect(result.current_controls).toEqual(["valid", "also-valid"]);
  });

  it("uses fallback for non-array fields", () => {
    const result = normalizeRiskAnalysis(
      { current_controls: "not-an-array" },
      defaultAnalysis
    );
    expect(result.current_controls).toEqual(defaultAnalysis.current_controls);
  });
});
