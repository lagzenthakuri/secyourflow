import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/logger";
import { aiChatJson } from "@/lib/ai";
import type { Prisma } from "@prisma/client";
import {
    type RiskAnalysis,
    type RiskInputAsset,
    type RiskInputVulnerability,
    deterministicAnalysis,
    normalizeRiskAnalysis,
    parseCVSSVector,
    scoreFromAnalysis,
} from "@/lib/risk/scoring";
import type { RiskAnalysisSource } from "@prisma/client";

export * from "@/lib/risk/scoring";

/**
 * Risk scoring pipeline.
 *
 * Risk is a property of a vulnerability *on an asset*: impact comes from the
 * CVSS vector and the asset's business context, likelihood from a model when
 * one is configured. The score is `impact x likelihood` on a 1-25 scale.
 *
 * Two rules this module exists to enforce:
 *  1. Exactly one live entry per (organization, asset, vulnerability). It used
 *     to `create` unconditionally, so every re-run left another duplicate.
 *  2. A deterministic fallback is never presented as a model assessment. The
 *     outcome carries `analysisSource`, and it is persisted.
 */

function buildPrompt(
    vulnerability: RiskInputVulnerability,
    asset: RiskInputAsset,
    cia: { c: number; i: number; a: number },
): string {
    return `Assess the risk this vulnerability poses to this asset.

Asset:
- Name: ${asset.name}
- Type: ${asset.type}
- Environment: ${asset.environment ?? "Unknown"}
- Business criticality: ${asset.criticality ?? "Unknown"}
- Owner: ${asset.owner || "Unknown"}

Vulnerability:
- Title: ${vulnerability.title}
- CVE: ${vulnerability.cveId || "N/A"}
- Severity: ${vulnerability.severity ?? "Unknown"}
- CVSS base score: ${vulnerability.cvssScore ?? "N/A"}
- CVSS vector: ${vulnerability.cvssVector || "N/A"}
- Known exploited: ${vulnerability.isExploited ? "yes" : "no"}
- CISA KEV: ${vulnerability.cisaKev ? "yes" : "no"}
- EPSS: ${typeof vulnerability.epssScore === "number" ? vulnerability.epssScore : "N/A"}
- Description: ${vulnerability.description || "N/A"}

The CIA impact values are already derived from the CVSS vector
(confidentiality ${cia.c}/5, integrity ${cia.i}/5, availability ${cia.a}/5) and
are not yours to set. Judge likelihood, and map controls.

Base every field on the evidence above. If you cannot support a field, return
an empty string or empty array for it rather than a plausible guess — in
particular, do not list ISO 27001 controls unless this specific vulnerability
genuinely violates them.

Respond with JSON only:
{
  "risk": "what could happen, in business terms",
  "threat": "the threat being realised",
  "likelihood_score": 1-5,
  "risk_category": "Critical|High|Medium|Low",
  "risk_category_2": "secondary category, e.g. AppSec or Privacy",
  "rationale_for_risk_rating": "why this likelihood, citing the evidence",
  "current_controls": ["controls evident from the context"],
  "selected_controls": ["controls to add"],
  "controls_violated_iso27001": ["A.5.1"],
  "treatment_option": "Mitigate|Avoid|Transfer|Accept",
  "action_plan": "concrete remediation steps",
  "responsible_party": "role or team",
  "remarks": "",
  "confidence": 0.0-1.0
}`;
}

async function analyzeRisk(
    vulnerability: RiskInputVulnerability,
    asset: RiskInputAsset,
    organizationId: string,
): Promise<{ analysis: RiskAnalysis; source: RiskAnalysisSource }> {
    const fallback = deterministicAnalysis(vulnerability, asset);
    const cia = parseCVSSVector(vulnerability.cvssVector);

    const result = await aiChatJson<Record<string, unknown>>(organizationId, {
        messages: [
            {
                role: "system",
                content:
                    "You are a cybersecurity risk analyst. Output only valid JSON matching the requested shape, with no commentary.",
            },
            { role: "user", content: buildPrompt(vulnerability, asset, cia) },
        ],
    });

    if (!result) {
        console.warn("[RiskEngine] No AI result; using deterministic scoring.");
        return { analysis: fallback, source: "DETERMINISTIC" };
    }

    return { analysis: normalizeRiskAnalysis(result.value, fallback), source: "AI" };
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

export interface ProcessRiskAssessmentParams {
    vulnerabilityId: string;
    assetId: string;
    organizationId: string;
    userId?: string;
}

/**
 * Scores one vulnerability on one asset and records the result.
 *
 * Always returns an outcome — never `undefined` and never throws for an
 * expected condition — so callers can report honestly what happened. Intended
 * to run in a background worker: with a self-hosted model a single call can
 * take minutes.
 */
export async function processRiskAssessment(
    params: ProcessRiskAssessmentParams,
): Promise<RiskAssessmentOutcome> {
    const { vulnerabilityId, assetId, organizationId, userId } = params;

    const [asset, vulnerability] = await Promise.all([
        prisma.asset.findFirst({ where: { id: assetId, organizationId } }),
        prisma.vulnerability.findFirst({ where: { id: vulnerabilityId, organizationId } }),
    ]);

    if (!asset || !vulnerability) {
        return { status: "SKIPPED", reason: "Asset or vulnerability not found in this organization" };
    }

    // One row per (organization, asset, vulnerability), enforced by a unique
    // constraint. Re-running an assessment updates in place.
    const entry = await prisma.riskRegister.upsert({
        where: {
            organizationId_assetId_vulnerabilityId: { organizationId, assetId, vulnerabilityId },
        },
        create: {
            organizationId,
            assetId,
            vulnerabilityId,
            riskScore: 0,
            impactScore: 0,
            likelihoodScore: 0,
            status: "PROCESSING",
            analysisSource: "DETERMINISTIC",
            aiAnalysis: {},
        },
        update: { status: "PROCESSING", failureReason: null },
        select: { id: true },
    });

    try {
        const { analysis, source } = await analyzeRisk(
            {
                title: vulnerability.title,
                description: vulnerability.description ?? undefined,
                cvssVector: vulnerability.cvssVector ?? undefined,
                cveId: vulnerability.cveId ?? undefined,
                severity: vulnerability.severity,
                cvssScore: vulnerability.cvssScore ?? undefined,
                isExploited: vulnerability.isExploited,
                cisaKev: vulnerability.cisaKev,
                epssScore: vulnerability.epssScore,
            },
            {
                name: asset.name,
                type: asset.type,
                criticality: asset.criticality,
                environment: asset.environment,
                owner: asset.owner ?? undefined,
            },
            organizationId,
        );

        const { impactScore, riskScore } = scoreFromAnalysis(analysis);

        await prisma.riskRegister.update({
            where: { id: entry.id },
            data: {
                riskScore,
                impactScore,
                likelihoodScore: analysis.likelihood_score,
                aiAnalysis: analysis as unknown as Prisma.InputJsonValue,
                status: "ACTIVE",
                analysisSource: source,
                failureReason: null,
                treatmentOption: analysis.treatment_option || null,
                responsibleParty: analysis.responsible_party || null,
                currentControls: analysis.current_controls.join(", ") || null,
                riskCategory2: analysis.risk_category_2 || null,
                actionPlan: analysis.action_plan || null,
                selectedControls: analysis.selected_controls.join(", ") || null,
                remarks: analysis.remarks || null,
                confidence: analysis.confidence,
            },
        });

        // Mirror the score onto the vulnerability so the queue can sort by it.
        await prisma.vulnerability
            .update({ where: { id: vulnerabilityId }, data: { riskScore } })
            .catch(() => undefined);

        await logActivity(
            "RISK_ASSESSMENT_COMPLETED",
            "RiskRegister",
            entry.id,
            null,
            { riskScore, impactScore, analysisSource: source },
            `Risk assessed at ${riskScore.toFixed(1)}/25 (${source === "AI" ? "AI" : "deterministic"}).`,
            userId,
        );

        return {
            status: "COMPLETED",
            riskEntryId: entry.id,
            riskScore,
            analysisSource: source,
        };
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.error("[RiskEngine] Assessment failed:", reason);

        await prisma.riskRegister
            .update({
                where: { id: entry.id },
                data: { status: "FAILED", failureReason: reason.slice(0, 1000) },
            })
            .catch(() => undefined);

        return { status: "FAILED", reason };
    }
}
