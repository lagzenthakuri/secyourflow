import { NextRequest, NextResponse } from "next/server";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { SCANNER_ADAPTERS, listScanners } from "@/lib/scanners/registry";

/**
 * Lists every supported scanner and, for locally executed ones, whether the
 * binary is actually present on this server. Lets the UI show "Nmap 7.99
 * ready" versus "Trivy not installed" instead of failing at scan time.
 */
export async function GET(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const descriptors = listScanners();

        const data = await Promise.all(
            descriptors.map(async (descriptor) => {
                const adapter = SCANNER_ADAPTERS[descriptor.type];

                // Remote adapters need per-scanner credentials, so they are
                // only probed from the scanner detail view, not here.
                if (!adapter || adapter.execution !== "LOCAL_BINARY") {
                    return { ...descriptor, installed: null as boolean | null, version: null };
                }

                const availability = await adapter.available({});
                return {
                    ...descriptor,
                    installed: availability.available,
                    version: availability.version ?? null,
                    error: availability.error ?? null,
                };
            }),
        );

        return NextResponse.json({ data });
    } catch (error) {
        console.error("Error listing scanners:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
