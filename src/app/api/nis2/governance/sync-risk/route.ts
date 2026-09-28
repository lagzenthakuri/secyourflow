import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { getGovernanceSummary, syncRiskFromFindings } from "@/lib/nis2/governance";

/**
 * Art. 21(2)(a) bridge — reconciles the governance checklist against open
 * HIGH/CRITICAL technical findings.
 */
export async function POST(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request, {
        allowedRoles: ["MAIN_OFFICER", "IT_OFFICER"],
    });
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId, userId } = authResult.context;

    try {
        const result = await syncRiskFromFindings(organizationId);

        if (result.escalated.length > 0 || result.cleared.length > 0) {
            await prisma.auditLog.create({
                data: {
                    action: "NIS2_GOVERNANCE_RISK_SYNC",
                    entityType: "Nis2ChecklistItem",
                    entityId: organizationId,
                    newValue: {
                        openHighCritical: result.openHighCritical,
                        escalated: result.escalated,
                        cleared: result.cleared,
                    },
                    userId,
                    organizationId,
                },
            });
        }

        return NextResponse.json({
            data: result,
            summary: await getGovernanceSummary(organizationId),
        });
    } catch (error) {
        console.error("Error syncing NIS2 governance risk:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
