import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";

const updateRiskRegisterSchema = z.object({
    id: z.string().min(1),
    status: z.string().max(64).optional(),
    treatmentOption: z.string().max(255).optional().nullable(),
    responsibleParty: z.string().max(255).optional().nullable(),
    actionPlan: z.string().max(8000).optional().nullable(),
    currentControls: z.string().max(8000).optional().nullable(),
    isResolved: z.boolean().optional(),
    remarks: z.string().max(8000).optional().nullable(),
    riskCategory2: z.string().max(255).optional().nullable(),
    selectedControls: z.string().max(8000).optional().nullable(),
});

export async function GET(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const risks = await prisma.riskRegister.findMany({
            where: {
                organizationId: authResult.context.organizationId,
            },
            include: {
                vulnerability: {
                    select: {
                        title: true,
                        cveId: true,
                        severity: true,
                        description: true,
                    },
                },
                asset: {
                    select: {
                        name: true,
                        type: true,
                    },
                },
            },
            orderBy: {
                riskScore: "desc",
            },
        });

        const formattedRisks = risks.map((risk, index) => {
            const analysis = (risk.aiAnalysis as Record<string, unknown>) || {};

            return {
                id: risk.id,
                displayId: `R${String(index + 1).padStart(3, "0")}`,
                threat: analysis.threat || risk.vulnerability.title,
                confidentiality: analysis.confidentiality_impact || 0,
                integrity: analysis.integrity_impact || 0,
                availability: analysis.availability_impact || 0,
                impactScore: risk.impactScore,
                likelihoodScore: risk.likelihoodScore,
                riskCategory: analysis.risk_category || "Unknown",
                rationale: analysis.rationale_for_risk_rating || "",
                currentControls: risk.currentControls || analysis.current_controls || "",
                riskCategory2: risk.riskCategory2 || "",
                treatmentOption: risk.treatmentOption || analysis.treatment_option || "Mitigate",
                selectedControls:
                    risk.selectedControls ||
                    (Array.isArray(analysis.selected_controls) ? analysis.selected_controls.join(", ") : "") ||
                    "",
                actionPlan: risk.actionPlan || "",
                responsibleParty: risk.responsibleParty || "Development Team",
                controlsViolated:
                    (Array.isArray(analysis.controls_violated_iso27001)
                        ? analysis.controls_violated_iso27001.join(", ")
                        : "") || "",
                remarks: risk.remarks || "",
                isResolved: risk.isResolved,
                vulnerabilityTitle: risk.vulnerability.title,
                assetName: risk.asset.name,
            };
        });

        return NextResponse.json({ data: formattedRisks });
    } catch (error) {
        console.error("Error fetching risk register:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const authResult = await requireSessionWithOrg(req, { allowedRoles: ["MAIN_OFFICER", "IT_OFFICER"] });
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const parsed = updateRiskRegisterSchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid risk register update payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }
        const { id, ...updates } = parsed.data;

        const existing = await prisma.riskRegister.findFirst({
            where: {
                id,
                organizationId: authResult.context.organizationId,
            },
            select: { id: true },
        });

        if (!existing) {
            return NextResponse.json({ error: "Risk entry not found" }, { status: 404 });
        }

        const updatedRisk = await prisma.riskRegister.update({
            where: {
                id: existing.id,
            },
            data: {
                ...updates,
                treatmentOption: updates.treatmentOption === undefined ? undefined : updates.treatmentOption || null,
                responsibleParty: updates.responsibleParty === undefined ? undefined : updates.responsibleParty || null,
                actionPlan: updates.actionPlan === undefined ? undefined : updates.actionPlan || null,
                currentControls: updates.currentControls === undefined ? undefined : updates.currentControls || null,
                remarks: updates.remarks === undefined ? undefined : updates.remarks || null,
                riskCategory2: updates.riskCategory2 === undefined ? undefined : updates.riskCategory2 || null,
                selectedControls: updates.selectedControls === undefined ? undefined : updates.selectedControls || null,
            },
        });

        return NextResponse.json({ data: updatedRisk });
    } catch (error) {
        console.error("Error updating risk:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
