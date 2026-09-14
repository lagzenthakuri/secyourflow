import { describe, expect, it } from "vitest";
import { deterministicAnalysis } from "@/lib/risk/scoring";

/**
 * The deterministic path is what runs whenever no AI provider answers, so it is
 * on the critical path far more often than the name suggests.
 */

const asset = { name: "web-01", type: "SERVER", criticality: "HIGH", environment: "PRODUCTION" };

describe("deterministicAnalysis", () => {
  it("invents no controls, treatment or owner", () => {
    // The previous implementation returned ["Firewall"], ["MFA","Encryption"]
    // and ISO controls A.9.1/A.13.1 for every finding, and those fabricated
    // control IDs were fed to the compliance engine to fail real controls.
    const analysis = deterministicAnalysis(
      { title: "SQL injection", severity: "CRITICAL" },
      asset,
    );

    expect(analysis.current_controls).toEqual([]);
    expect(analysis.selected_controls).toEqual([]);
    expect(analysis.controls_violated_iso27001).toEqual([]);
    expect(analysis.treatment_option).toBe("");
    expect(analysis.responsible_party).toBe("");
    expect(analysis.action_plan).toBe("");
  });

  it("reports zero confidence rather than a plausible-looking score", () => {
    const analysis = deterministicAnalysis({ title: "x", severity: "HIGH" }, asset);
    expect(analysis.confidence).toBe(0);
  });

  it("says so when it had no CVSS vector to work from", () => {
    const analysis = deterministicAnalysis({ title: "x", severity: "HIGH" }, asset);
    expect(analysis.rationale_for_risk_rating).toMatch(/no CVSS vector/i);
    // Impacts fall back to the middle of the scale.
    expect(analysis.confidentiality_impact).toBe(3);
  });

  it("derives CIA impacts from the CVSS vector", () => {
    const analysis = deterministicAnalysis(
      { title: "x", severity: "HIGH", cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N" },
      asset,
    );

    expect(analysis.confidentiality_impact).toBe(5); // H
    expect(analysis.integrity_impact).toBe(3); // L
    expect(analysis.availability_impact).toBe(1); // N
    expect(analysis.rationale_for_risk_rating).toMatch(/CVSS vector/);
  });

  it("raises likelihood on evidence of real-world exploitation", () => {
    const base = deterministicAnalysis({ title: "x", severity: "MEDIUM" }, { ...asset, criticality: "LOW" });
    const kev = deterministicAnalysis(
      { title: "x", severity: "MEDIUM", cisaKev: true },
      { ...asset, criticality: "LOW" },
    );

    expect(kev.likelihood_score).toBeGreaterThan(base.likelihood_score);
  });

  it("keeps likelihood inside the 1-5 scale however many signals stack up", () => {
    const analysis = deterministicAnalysis(
      { title: "x", severity: "CRITICAL", cisaKev: true, isExploited: true, epssScore: 0.99 },
      { ...asset, criticality: "CRITICAL" },
    );

    expect(analysis.likelihood_score).toBeLessThanOrEqual(5);
    expect(analysis.likelihood_score).toBeGreaterThanOrEqual(1);
  });

  it("produces a score inside the documented 1-25 range", () => {
    for (const severity of ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"] as const) {
      const a = deterministicAnalysis({ title: "x", severity }, asset);
      const impact = (a.confidentiality_impact + a.integrity_impact + a.availability_impact) / 3;
      const score = impact * a.likelihood_score;
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(25);
    }
  });

  it("ignores a malformed CVSS vector instead of throwing", () => {
    const analysis = deterministicAnalysis(
      { title: "x", severity: "HIGH", cvssVector: "not-a-vector" },
      asset,
    );
    expect(analysis.confidentiality_impact).toBe(3);
  });
});
