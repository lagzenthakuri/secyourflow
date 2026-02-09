
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const session = await auth();
        console.log("[RiskRegister] Session:", JSON.stringify(session, null, 2));

        if (!session || !session.user) {
            console.log("[RiskRegister] No session or user");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch user with organizationId since it might not be in session
        let user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true, organizationId: true }
        });

        if (!user) {
            console.log("[RiskRegister] User not found in DB");
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Self-Correction: If user has no organization, assign them to the first available one
        if (!user.organizationId) {
            console.log("[RiskRegister] User missing organizationId. Attempting auto-assignment.");
            const firstOrg = await prisma.organization.findFirst();

            if (firstOrg) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { organizationId: firstOrg.id },
                    select: { id: true, organizationId: true }
                });
                console.log("[RiskRegister] User assigned to organization:", firstOrg.id);
            } else {
                console.log("[RiskRegister] Creating default organization.");
                const newOrg = await prisma.organization.create({
                    data: { name: "My Organization" }
                });
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { organizationId: newOrg.id },
                    select: { id: true, organizationId: true }
                });
                console.log("[RiskRegister] User assigned to new organization:", newOrg.id);
            }
        }

        if (!user || !user.organizationId) {
            // Should theoretically not happen unless update failed
            console.log("[RiskRegister] Failed to assign organization");
            return NextResponse.json({ error: "Organization not found" }, { status: 403 });
        }

        const risks = await prisma.riskRegister.findMany({
            where: {
                organizationId: user.organizationId,
            },
            include: {
                vulnerability: {
                    select: {
                        title: true,
                        cveId: true,
                        severity: true,
                        description: true,
                    }
                },
                asset: {
                    select: {
                        name: true,
                        type: true,
                    }
                }
            },
            orderBy: {
                riskScore: 'desc'
            }
        });

        // Format for the frontend
        const formattedRisks = risks.map((risk, index) => {
            const analysis = (risk.aiAnalysis as Record<string, unknown>) || {};

            return {
                id: risk.id,
                displayId: `R${String(index + 1).padStart(3, '0')}`, // R001, R002...
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
                selectedControls: risk.selectedControls || (Array.isArray(analysis.selected_controls) ? analysis.selected_controls.join(", ") : "") || "",
                actionPlan: risk.actionPlan || "",
                responsibleParty: risk.responsibleParty || "Development Team",
                controlsViolated: (Array.isArray(analysis.controls_violated_iso27001) ? analysis.controls_violated_iso27001.join(", ") : "") || "",
                remarks: risk.remarks || "",
                isResolved: risk.isResolved,
                vulnerabilityTitle: risk.vulnerability.title, // Extra context
                assetName: risk.asset.name // Extra context
            };
        });

        return NextResponse.json({ data: formattedRisks });

    } catch (error) {
        console.error("Error fetching risk register:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { organizationId: true }
        });

        if (!user || !user.organizationId) {
            return NextResponse.json({ error: "Organization not found" }, { status: 403 });
        }

        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        const updatedRisk = await prisma.riskRegister.update({
            where: {
                id: id,
                organizationId: user.organizationId // Ensure ownership
            },
            data: updates
        });

        return NextResponse.json({ data: updatedRisk });

    } catch (error) {
        console.error("Error updating risk:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
