import { NextRequest, NextResponse } from "next/server";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { buildVendorList } from "@/lib/grc/overviews";

/**
 * GRC vendor surface: every vendor with its asset, data, policy and risk
 * interconnections. Vendor creation and field edits live on /api/nis2/vendors.
 */
export async function GET(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const vendors = await buildVendorList(authResult.context.organizationId);
        return NextResponse.json({ data: vendors });
    } catch (error) {
        console.error("Error fetching vendor overview list:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
