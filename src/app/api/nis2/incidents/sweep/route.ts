import { NextRequest, NextResponse } from "next/server";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { sweepDeadlines } from "@/lib/nis2/incidents";

/**
 * Dispatches pre-deadline and breach alerts for open Art. 23 obligations.
 * Alerts are deduplicated per (incident, phase, kind), so this is safe to call
 * on a schedule as well as on demand.
 */
export async function POST(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request, {
        allowedRoles: ["MAIN_OFFICER", "IT_OFFICER"],
    });
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const result = await sweepDeadlines(authResult.context.organizationId);
        return NextResponse.json({ data: result });
    } catch (error) {
        console.error("Error sweeping NIS2 incident deadlines:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
