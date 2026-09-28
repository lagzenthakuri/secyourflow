import { NextRequest, NextResponse } from "next/server";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { buildVendorOverview } from "@/lib/grc/overviews";

/**
 * The full vendor overview: details, connected assets, all data handled,
 * related risks, policies, controls, the security assessment, risk level,
 * appetite status and compliance status.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const { id } = await params;
        const overview = await buildVendorOverview(authResult.context.organizationId, id);

        if (!overview) {
            return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
        }

        return NextResponse.json({ data: overview });
    } catch (error) {
        console.error("Error fetching vendor overview:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
