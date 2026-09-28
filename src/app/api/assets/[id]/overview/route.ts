import { NextRequest, NextResponse } from "next/server";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { buildAssetOverview } from "@/lib/grc/overviews";

/**
 * The asset's side of the graph: connected vendors, data handled, risks,
 * policies, controls, appetite status and compliance status.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const { id } = await params;
        const overview = await buildAssetOverview(authResult.context.organizationId, id);

        if (!overview) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        return NextResponse.json({ data: overview });
    } catch (error) {
        console.error("Error fetching asset overview:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
