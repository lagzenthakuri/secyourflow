import { NextRequest, NextResponse } from "next/server";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { getGovernanceSummary, seedChecklist } from "@/lib/nis2/governance";

/**
 * Materialises any missing baseline checklist items and refreshes the template
 * text on existing ones. Owner, status, notes, and due dates are preserved.
 */
export async function POST(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER"] });
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId } = authResult.context;

    try {
        const result = await seedChecklist(organizationId);
        return NextResponse.json({
            data: result,
            summary: await getGovernanceSummary(organizationId),
        });
    } catch (error) {
        console.error("Error seeding NIS2 checklist:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
