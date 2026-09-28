import { NextRequest, NextResponse } from "next/server";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { getScoreFormula } from "@/lib/nis2/vendors";

/**
 * Publishes the Art. 18 supplier scoring formula so an auditor can reproduce
 * any recorded score by hand.
 */
export async function GET(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    return NextResponse.json({ data: getScoreFormula() });
}
