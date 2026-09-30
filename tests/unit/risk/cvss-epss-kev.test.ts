import { describe, expect, it } from "vitest";

/**
 * CVSS, EPSS, and CISA KEV tests.
 *
 * Tests how these external security metrics influence the risk model.
 * Uses the actual implementation from the codebase.
 */

import { deterministicAnalysis, scoreFromAnalysis } from "@/lib/risk/scoring";

const baseAsset = {
  name: "web-01",
  type: "SERVER",
  criticality: "MEDIUM",
  environment: "PRODUCTION",
};

describe("CVSS influence on risk", () => {
  it("all-high CVSS produces maximum impact", () => {
    const result = deterministicAnalysis(
      {
        title: "test",
        severity: "CRITICAL",
        cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
      },
      baseAsset
    );
    expect(result.confidentiality_impact).toBe(5);
    expect(result.integrity_impact).toBe(5);
    expect(result.availability_impact).toBe(5);
  });

  it("all-none CVSS produces minimum impact", () => {
    const result = deterministicAnalysis(
      {
        title: "test",
        severity: "LOW",
        cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N",
      },
      baseAsset
    );
    expect(result.confidentiality_impact).toBe(1);
    expect(result.integrity_impact).toBe(1);
    expect(result.availability_impact).toBe(1);
  });

  it("mixed CVSS produces varied impact", () => {
    const result = deterministicAnalysis(
      {
        title: "test",
        severity: "HIGH",
        cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N",
      },
      baseAsset
    );
    expect(result.confidentiality_impact).toBe(5);
    expect(result.integrity_impact).toBe(3);
    expect(result.availability_impact).toBe(1);
  });

  it("CVSS scope change affects impact", () => {
    const unchanged = deterministicAnalysis(
      {
        title: "test",
        severity: "HIGH",
        cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
      },
      baseAsset
    );
    const changed = deterministicAnalysis(
      {
        title: "test",
        severity: "HIGH",
        cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
      },
      baseAsset
    );
    // Both should have same CIA scores (scope doesn't affect CIA in this model)
    expect(unchanged.confidentiality_impact).toBe(
      changed.confidentiality_impact
    );
    expect(unchanged.integrity_impact).toBe(changed.integrity_impact);
    expect(unchanged.availability_impact).toBe(changed.availability_impact);
  });

  it("CVSS attack vector does not affect CIA scores", () => {
    const network = deterministicAnalysis(
      {
        title: "test",
        severity: "HIGH",
        cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
      },
      baseAsset
    );
    const physical = deterministicAnalysis(
      {
        title: "test",
        severity: "HIGH",
        cvssVector: "CVSS:3.1/AV:P/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
      },
      baseAsset
    );
    expect(network.confidentiality_impact).toBe(
      physical.confidentiality_impact
    );
    expect(network.integrity_impact).toBe(physical.integrity_impact);
    expect(network.availability_impact).toBe(physical.availability_impact);
  });

  it("missing CVSS vector defaults to moderate impact", () => {
    const result = deterministicAnalysis(
      { title: "test", severity: "HIGH" },
      baseAsset
    );
    expect(result.confidentiality_impact).toBe(3);
    expect(result.integrity_impact).toBe(3);
    expect(result.availability_impact).toBe(3);
  });

  it("malformed CVSS vector defaults to moderate impact", () => {
    const result = deterministicAnalysis(
      { title: "test", severity: "HIGH", cvssVector: "garbage" },
      baseAsset
    );
    expect(result.confidentiality_impact).toBe(3);
    expect(result.integrity_impact).toBe(3);
    expect(result.availability_impact).toBe(3);
  });
});

describe("EPSS influence on risk", () => {
  it("high EPSS increases likelihood", () => {
    const base = deterministicAnalysis(
      { title: "test", severity: "MEDIUM" },
      baseAsset
    );
    const highEpss = deterministicAnalysis(
      { title: "test", severity: "MEDIUM", epssScore: 0.9 },
      baseAsset
    );
    expect(highEpss.likelihood_score).toBeGreaterThan(base.likelihood_score);
  });

  it("low EPSS does not increase likelihood", () => {
    const base = deterministicAnalysis(
      { title: "test", severity: "MEDIUM" },
      baseAsset
    );
    const lowEpss = deterministicAnalysis(
      { title: "test", severity: "MEDIUM", epssScore: 0.1 },
      baseAsset
    );
    expect(lowEpss.likelihood_score).toBe(base.likelihood_score);
  });

  it("EPSS of exactly 0.5 increases likelihood", () => {
    const base = deterministicAnalysis(
      { title: "test", severity: "MEDIUM" },
      baseAsset
    );
    const threshold = deterministicAnalysis(
      { title: "test", severity: "MEDIUM", epssScore: 0.5 },
      baseAsset
    );
    expect(threshold.likelihood_score).toBeGreaterThan(base.likelihood_score);
  });

  it("EPSS just below 0.5 does not increase likelihood", () => {
    const base = deterministicAnalysis(
      { title: "test", severity: "MEDIUM" },
      baseAsset
    );
    const below = deterministicAnalysis(
      { title: "test", severity: "MEDIUM", epssScore: 0.49 },
      baseAsset
    );
    expect(below.likelihood_score).toBe(base.likelihood_score);
  });

  it("EPSS of 0 does not increase likelihood", () => {
    const base = deterministicAnalysis(
      { title: "test", severity: "MEDIUM" },
      baseAsset
    );
    const zero = deterministicAnalysis(
      { title: "test", severity: "MEDIUM", epssScore: 0 },
      baseAsset
    );
    expect(zero.likelihood_score).toBe(base.likelihood_score);
  });

  it("EPSS of 1 increases likelihood", () => {
    const base = deterministicAnalysis(
      { title: "test", severity: "MEDIUM" },
      baseAsset
    );
    const max = deterministicAnalysis(
      { title: "test", severity: "MEDIUM", epssScore: 1 },
      baseAsset
    );
    expect(max.likelihood_score).toBeGreaterThan(base.likelihood_score);
  });

  it("null EPSS does not increase likelihood", () => {
    const base = deterministicAnalysis(
      { title: "test", severity: "MEDIUM" },
      baseAsset
    );
    const nullEpss = deterministicAnalysis(
      { title: "test", severity: "MEDIUM", epssScore: null },
      baseAsset
    );
    expect(nullEpss.likelihood_score).toBe(base.likelihood_score);
  });

  it("undefined EPSS does not increase likelihood", () => {
    const base = deterministicAnalysis(
      { title: "test", severity: "MEDIUM" },
      baseAsset
    );
    const undefinedEpss = deterministicAnalysis(
      { title: "test", severity: "MEDIUM", epssScore: undefined },
      baseAsset
    );
    expect(undefinedEpss.likelihood_score).toBe(base.likelihood_score);
  });
});

describe("CISA KEV influence on risk", () => {
  it("KEV vulnerability increases likelihood", () => {
    const base = deterministicAnalysis(
      { title: "test", severity: "MEDIUM" },
      baseAsset
    );
    const kev = deterministicAnalysis(
      { title: "test", severity: "MEDIUM", cisaKev: true },
      baseAsset
    );
    expect(kev.likelihood_score).toBeGreaterThan(base.likelihood_score);
  });

  it("non-KEV vulnerability does not increase likelihood", () => {
    const base = deterministicAnalysis(
      { title: "test", severity: "MEDIUM" },
      baseAsset
    );
    const nonKev = deterministicAnalysis(
      { title: "test", severity: "MEDIUM", cisaKev: false },
      baseAsset
    );
    expect(nonKev.likelihood_score).toBe(base.likelihood_score);
  });

  it("KEV with high EPSS stacks likelihood bonuses", () => {
    const base = deterministicAnalysis(
      { title: "test", severity: "MEDIUM" },
      baseAsset
    );
    const kevAndEpss = deterministicAnalysis(
      { title: "test", severity: "MEDIUM", cisaKev: true, epssScore: 0.9 },
      baseAsset
    );
    expect(kevAndEpss.likelihood_score).toBeGreaterThan(base.likelihood_score);
    // Should be at least 2 higher than base (KEV +1, EPSS +1)
    expect(
      kevAndEpss.likelihood_score - base.likelihood_score
    ).toBeGreaterThanOrEqual(2);
  });

  it("KEV with critical asset stacks likelihood bonuses", () => {
    const base = deterministicAnalysis(
      { title: "test", severity: "MEDIUM" },
      { ...baseAsset, criticality: "LOW" }
    );
    const kevCritical = deterministicAnalysis(
      { title: "test", severity: "MEDIUM", cisaKev: true },
      { ...baseAsset, criticality: "CRITICAL" }
    );
    expect(kevCritical.likelihood_score).toBeGreaterThan(base.likelihood_score);
  });

  it("KEV is mentioned in rationale", () => {
    const result = deterministicAnalysis(
      { title: "test", severity: "MEDIUM", cisaKev: true },
      baseAsset
    );
    expect(result.rationale_for_risk_rating).toMatch(CISA_KEV_PATTERN);
  });

  it("non-KEV is not mentioned in rationale", () => {
    const result = deterministicAnalysis(
      { title: "test", severity: "MEDIUM", cisaKev: false },
      baseAsset
    );
    expect(result.rationale_for_risk_rating).not.toMatch(CISA_KEV_PATTERN);
  });
});

describe("combined risk scoring", () => {
  it("produces maximum risk with all high inputs", () => {
    const analysis = deterministicAnalysis(
      {
        title: "test",
        severity: "CRITICAL",
        cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
        cisaKev: true,
        isExploited: true,
        epssScore: 0.99,
      },
      { ...baseAsset, criticality: "CRITICAL" }
    );
    const score = scoreFromAnalysis(analysis);
    expect(score.riskScore).toBeGreaterThanOrEqual(20);
    expect(score.riskScore).toBeLessThanOrEqual(25);
  });

  it("produces minimum risk with all low inputs", () => {
    const analysis = deterministicAnalysis(
      {
        title: "test",
        severity: "LOW",
        cvssVector: "CVSS:3.1/AV:P/AC:H/PR:H/UI:R/S:U/C:N/I:N/A:N",
      },
      { ...baseAsset, criticality: "LOW" }
    );
    const score = scoreFromAnalysis(analysis);
    expect(score.riskScore).toBeGreaterThanOrEqual(1);
    expect(score.riskScore).toBeLessThanOrEqual(5);
  });

  it("risk score is deterministic", () => {
    const input = {
      title: "test",
      severity: "HIGH" as const,
      cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N",
      cisaKev: true,
      epssScore: 0.7,
    };
    const result1 = deterministicAnalysis(input, baseAsset);
    const result2 = deterministicAnalysis(input, baseAsset);
    expect(result1).toEqual(result2);
  });

  it("risk score increases with severity", () => {
    const severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
    const scores = severities.map((severity) => {
      const analysis = deterministicAnalysis(
        { title: "test", severity },
        { ...baseAsset, criticality: "LOW" }
      );
      return scoreFromAnalysis(analysis).riskScore;
    });
    // Scores should generally increase with severity
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
    }
  });
});

const CISA_KEV_PATTERN = /CISA KEV/;
