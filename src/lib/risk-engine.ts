
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/logger";

// Type definition for the AI Risk Analysis Output
interface AIRiskAnalysis {
    c_impact: number; // 1-5
    i_impact: number; // 1-5
    a_impact: number; // 1-5
    likelihood: number; // 1-5
    summary: string; // "Unauthorized access...", etc.
    rationale: string;
    affectedControls: string[]; // List of Control IDs (e.g., ISO-27001-A.9.2.1)
}

/**
 * Mocks the AI Risk Engine API call (e.g. to OpenRouter)
 * Calculates C/I/A and Likelihood based on inputs.
 */
async function analyzeRiskWithAI(
    vulnerability: any,
    asset: any
): Promise<AIRiskAnalysis> {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Intelligence Logic:
    // Confidentiality (C): High if DB or Auth related.
    // Integrity (I): High if Write access potential.
    // Availability (A): High if DoS potential.

    let c = 3, i = 3, a = 3;
    let likelihood = 3;

    // 1. Determine Factors based on Vulnerability Severity
    if (vulnerability.severity === 'CRITICAL') {
        c = 5; i = 5; a = 4;
        likelihood = 5;
    } else if (vulnerability.severity === 'HIGH') {
        c = 4; i = 4; a = 3;
        likelihood = 4;
    } else if (vulnerability.severity === 'MEDIUM') {
        c = 3; i = 3; a = 3;
        likelihood = 3;
    } else {
        c = 2; i = 2; a = 1;
        likelihood = 2;
    }

    // 2. Adjust based on Asset Criticality
    if (asset.criticality === 'CRITICAL') {
        c = Math.min(5, c + 1);
        likelihood = Math.min(5, likelihood + 1);
    }

    // 3. Specific Keywords adjustments
    const title = vulnerability.title.toLowerCase();
    if (title.includes("database") || title.includes("sql") || title.includes("postgre")) {
        c = 5; // DB leaks are critical for Confidentiality
    }
    if (title.includes("dos") || title.includes("denial")) {
        a = 5; // Availability impact
    }

    return {
        c_impact: c,
        i_impact: i,
        a_impact: a,
        likelihood: likelihood,
        summary: `Risk of ${title.includes("database") ? "Data Exfiltration" : "System Compromise"} via ${vulnerability.title}`,
        rationale: `Asset ${asset.name} is ${asset.criticality} criticality. Vulnerability severity is ${vulnerability.severity}. High likelihood due to exposed vectors.`,
        affectedControls: ["ISO-27001-A.9.1.2", "ISO-27001-A.12.6.1", "ISO-27001-A.14.2.1"] // Mock ISO controls
    };
}

/**
 * Main Pipeline Function
 * Flow: Asset+Context -> AI Analysis -> Calc Scores -> DB Insert -> Compliance Logic
 */
export async function processRiskAssessment(
    vulnerabilityId: string,
    assetId: string,
    organizationId: string
) {
    try {
        console.log(`[RiskEngine] Starting specific assessment flow for Vuln ${vulnerabilityId}`);

        // 1. Fetch Asset + Context
        const asset = await prisma.asset.findUnique({
            where: { id: assetId },
            include: { complianceControls: true }
        });

        const vulnerability = await prisma.vulnerability.findUnique({
            where: { id: vulnerabilityId }
        });

        if (!asset || !vulnerability) {
            console.error("[RiskEngine] Asset or Vulnerability not found");
            return;
        }

        // 2. AI Risk Engine (OpenRouter) -> Validate JSON
        const analysis = await analyzeRiskWithAI(vulnerability, asset);

        // 3. Calculate Impact Score = (C + I + A) / 3
        const impactScore = (analysis.c_impact + analysis.i_impact + analysis.a_impact) / 3;

        // 4. Calculate Final Risk Score = Impact * Likelihood
        const riskScore = impactScore * analysis.likelihood; // Range 1-25

        console.log(`[RiskEngine] Scores - C:${analysis.c_impact} I:${analysis.i_impact} A:${analysis.a_impact} => Impact:${impactScore.toFixed(2)} * Likelihood:${analysis.likelihood} = Risk:${riskScore.toFixed(2)}`);

        // 5. INSERT INTO risk_register
        const riskEntry = await prisma.riskRegister.create({
            data: {
                assetId,
                vulnerabilityId,
                organizationId,
                riskScore: parseFloat(riskScore.toFixed(2)),
                impactScore: parseFloat(impactScore.toFixed(2)),
                likelihoodScore: parseFloat(analysis.likelihood.toString()),
                aiAnalysis: {
                    c: analysis.c_impact,
                    i: analysis.i_impact,
                    a: analysis.a_impact,
                    rationale: analysis.rationale,
                    risk_statement: analysis.summary,
                    violated_controls: analysis.affectedControls
                },
                status: "ACTIVE"
            }
        });

        // 6. Compliance Engine Updates ISO Status
        // Logic: specific controls_violated_iso27001[] -> Mark ISO Controls as FAILED

        if (riskScore >= 9) { // Threshold for "High" risk (e.g., 3*3)
            console.log(`[RiskEngine] High Risk detected. Triggering definition of failure for controls.`);

            // 1. Identify which controls are relevant for this asset (Mocking logic - normally we match by control code)
            // We find all controls currently linked to this asset.
            const attachedControls = await prisma.assetComplianceControl.findMany({
                where: { assetId },
                select: { controlId: true }
            });

            const controlIds = attachedControls.map(c => c.controlId);

            if (controlIds.length > 0) {
                // 2. Mark Asset-Specific Controls as FAILED
                const updateResult = await prisma.assetComplianceControl.updateMany({
                    where: {
                        assetId: assetId,
                        controlId: { in: controlIds }
                    },
                    data: {
                        status: "NON_COMPLIANT",
                        evidence: `[AUTO-RISK] FAILED due to Risk ${riskScore.toFixed(1)}/25. ${analysis.summary}`
                    }
                });
                console.log(`[RiskEngine] Asset Controls marked FAILED: ${updateResult.count}`);

                // 3. Mark Global Controls as FAILED (to ensure Dashboard Compliance % Drops)
                // If an asset fails a control, the control itself is considered failing in this context.
                const globalUpdate = await prisma.complianceControl.updateMany({
                    where: { id: { in: controlIds } },
                    data: {
                        status: "NON_COMPLIANT",
                        notes: `Automatically flagged as NON_COMPLIANT due to high risk vulnerability on asset ${asset.name}.`
                    }
                });
                console.log(`[RiskEngine] Global Compliance Controls updated: ${globalUpdate.count}`);
            }

            // "Evidence Tasks Created" - Log via Comment
            await prisma.comment.create({
                data: {
                    content: `EVIDENCE TASK: Provide mitigation evidence for impacted controls. Triggered by Risk #${riskEntry.id}.`,
                    entityType: "RiskRegister",
                    entityId: riskEntry.id,
                    userId: asset.owner || "SYSTEM", // Fallback if owner not UUID. Ideally we query a system user.
                }
            }).catch(async () => {
                // Fallback: find any admin
                const admin = await prisma.user.findFirst({ where: { role: 'MAIN_OFFICER' } });
                if (admin) {
                    await prisma.comment.create({
                        data: {
                            content: `EVIDENCE TASK: Provide mitigation evidence for impacted controls. Triggered by Risk #${riskEntry.id}.`,
                            entityType: "RiskRegister",
                            entityId: riskEntry.id,
                            userId: admin.id
                        }
                    });
                }
            });
        }

        // 7. Report Cache Refresh / Log
        console.log(`[RiskEngine] Pipeline Complete. Compliance % should reflect drop.`);

        await logActivity(
            "RISK_ASSESSMENT_COMPLETED",
            "RiskRegister",
            riskEntry.id,
            null,
            { riskScore, impactScore },
            `Risk calculated: ${riskScore.toFixed(1)}/25. ${analysis.summary}`
        );

    } catch (error) {
        console.error("[RiskEngine] Pipeline Failed:", error);
    }
}
