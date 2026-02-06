
import { prisma } from "@/lib/prisma";

/**
 * Updates the compliance status of controls based on risk assessment findings.
 * This is the "Controls -> Compliance" glue.
 */
export async function updateComplianceFromRisk(
    riskEntry: any,
    vulnerability: any,
    asset: any
) {
    const analysis = riskEntry.aiAnalysis;
    const violatedControlIds = analysis.controls_violated_iso27001 || [];

    // Ensure we have a threat feed for the AI indicators
    let aiFeed = await prisma.threatFeed.findFirst({
        where: { source: "AI_RISK_ENGINE" }
    });

    if (!aiFeed) {
        aiFeed = await prisma.threatFeed.create({
            data: {
                name: "AI Risk Insights",
                source: "AI_RISK_ENGINE",
                type: "CVE",
                isActive: true,
            }
        });
    }

    // 0. CREATE THREAT INDICATOR (Vulnerability -> Threat Pipeline)
    if (riskEntry.riskScore >= 10 || analysis.likelihood_score >= 4) {
        await prisma.threatIndicator.create({
            data: {
                type: "CVE",
                value: vulnerability.cveId || vulnerability.title,
                confidence: Math.round(analysis.confidence * 100),
                severity: vulnerability.severity,
                description: `[AI-THREAT] ${analysis.threat}. Rationale: ${analysis.rationale_for_risk_rating}`,
                source: "AI_RISK_ENGINE",
                tags: [analysis.risk_category, "AI_GENERATED"],
                feedId: aiFeed.id
            }
        }).catch(err => console.error("[ComplianceEngine] Failed to create threat indicator:", err));
    }

    if (violatedControlIds.length === 0) {
        console.log(`[ComplianceEngine] No ISO controls violated for '${vulnerability.title}'`);
        return;
    }

    // Ensure at least one framework exists to link controls to
    let framework = await prisma.complianceFramework.findFirst({
        where: { organizationId: riskEntry.organizationId }
    });

    if (!framework) {
        console.log("[ComplianceEngine] No framework found, creating default ISO 27001 framework");
        framework = await prisma.complianceFramework.create({
            data: {
                name: "ISO 27001:2022",
                description: "Auto-generated framework for AI risk mapping",
                organizationId: riskEntry.organizationId,
                isActive: true,
            }
        });
    }

    console.log(`[ComplianceEngine] Processing ${violatedControlIds.length} potentially violated controls for asset ${asset.name}`);

    for (const controlCode of violatedControlIds) {
        // 1. Find or Create the compliance control that matches this code
        let control = await prisma.complianceControl.findFirst({
            where: {
                controlId: { contains: controlCode, mode: 'insensitive' },
                frameworkId: framework.id
            }
        });

        // If control doesn't exist, create it so the user can see it in compliance
        if (!control) {
            control = await prisma.complianceControl.create({
                data: {
                    controlId: `ISO-${controlCode}`,
                    title: `Security Control ${controlCode}`,
                    description: `Automatically identified by AI as relevant to ${vulnerability.title}`,
                    frameworkId: framework.id,
                    status: "NOT_ASSESSED"
                }
            });
        }

        if (control) {
            // 2. Mark Asset-Specific link as NON_COMPLIANT
            await prisma.assetComplianceControl.upsert({
                where: {
                    assetId_controlId: {
                        assetId: asset.id,
                        controlId: (control as any).id
                    }
                },
                update: {
                    status: "NON_COMPLIANT",
                    evidence: `[AI-ASSESSMENT] Violated by '${vulnerability.title}'. Rationale: ${analysis.rationale_for_risk_rating}`,
                    assessedAt: new Date()
                },
                create: {
                    assetId: asset.id,
                    controlId: (control as any).id,
                    status: "NON_COMPLIANT",
                    evidence: `[AI-ASSESSMENT] Violated by '${vulnerability.title}'. Rationale: ${analysis.rationale_for_risk_rating}`,
                    assessedAt: new Date()
                }
            });

            // 3. Mark the global control as NON_COMPLIANT if risk is high
            if (riskEntry.riskScore >= 12) {
                await prisma.complianceControl.update({
                    where: { id: (control as any).id },
                    data: {
                        status: "NON_COMPLIANT",
                        notes: `Automatically flagged as NON_COMPLIANT due to high risk assessment on asset ${asset.name}. Ref: ${riskEntry.id}`,
                        lastAssessed: new Date()
                    }
                });
            }

            // 4. Auto-generate Evidence Task
            await createEvidenceTask(control, asset, riskEntry);
        }
    }
}

async function createEvidenceTask(control: any, asset: any, riskEntry: any) {
    const analysis = riskEntry.aiAnalysis;
    const recommendations = analysis.selected_controls?.join(", ") || "No specific controls recommended";

    // Create a notification for the asset owner or IT security
    const recipient = await prisma.user.findFirst({
        where: {
            organizationId: riskEntry.organizationId,
            role: 'IT_OFFICER'
        }
    });

    if (recipient) {
        await prisma.notification.create({
            data: {
                userId: recipient.id,
                title: "Evidence Required: Control Failure",
                message: `Control ${control.controlId} marked NON_COMPLIANT for ${asset.name}. AI recommends: ${recommendations}.`,
                type: "WARNING",
                link: `/compliance`
            }
        });
    }

    // Also log it as a comment on the risk entry for auditability
    await prisma.comment.create({
        data: {
            content: `EVIDENCE TASK: Mitigation required for ${control.controlId}. AI Recommendation: ${recommendations}. Task triggered by risk ${riskEntry.riskScore}/25.`,
            entityType: "RiskRegister",
            entityId: riskEntry.id,
            userId: recipient?.id || "SYSTEM"
        }
    }).catch(() => { });
}
