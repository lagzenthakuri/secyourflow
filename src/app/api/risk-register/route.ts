import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/security/api-auth";

export async function GET() {
    const authResult = await requireApiAuth();
    if ("response" in authResult) {
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
    } catch {
        console.error("Error fetching risk register");
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    const authResult = await requireApiAuth({
        allowedRoles: [Role.IT_OFFICER, Role.PENTESTER, Role.MAIN_OFFICER],
        request: req,
    });
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const body = (await req.json()) as Record<string, unknown>;
        const id = typeof body.id === "string" ? body.id : undefined;
        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

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

        const { id: _id, ...updates } = body;
        void _id;

        const allowedFields = new Set([
            "status",
            "treatmentOption",
            "responsibleParty",
            "actionPlan",
            "currentControls",
            "isResolved",
            "remarks",
            "riskCategory2",
            "selectedControls",
        ]);
        const safeUpdates = Object.fromEntries(
            Object.entries(updates).filter(([key]) => allowedFields.has(key)),
        );

        if (Object.keys(safeUpdates).length === 0) {
            return NextResponse.json({ error: "No valid fields provided for update" }, { status: 400 });
        }

        const updatedRisk = await prisma.riskRegister.update({
            where: {
                id: existing.id,
            },
            data: safeUpdates,
        });

        return NextResponse.json({ data: updatedRisk });
    } catch {
        console.error("Error updating risk");
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
