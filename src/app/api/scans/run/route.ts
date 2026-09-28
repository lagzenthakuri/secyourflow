import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { getScannerAdapter } from "@/lib/scanners/registry";
import { enqueue } from "@/lib/queue";

const runScanSchema = z
    .object({
        scannerId: z.string().min(1),
        assetId: z.string().min(1).optional(),
        /** Explicit target; defaults to the asset's IP or hostname. */
        target: z.string().min(1).max(512).optional(),
        /** Run AI risk analysis over the findings once the scan returns. */
        aiTriage: z.boolean().default(true),
    })
    .refine((value) => value.assetId || value.target, {
        message: "Either assetId or target must be provided",
    });

/**
 * Queues a scan.
 *
 * Scans shell out to nmap/trivy/openvas or poll a vendor API; neither belongs
 * in an HTTP request. The route validates what it can answer for immediately —
 * the scanner exists, the target resolves, the binary is installed — and hands
 * the rest to a worker.
 */
export async function POST(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request, {
        allowedRoles: ["MAIN_OFFICER", "IT_OFFICER", "PENTESTER"],
    });
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId, userId } = authResult.context;

    try {
        const parsed = runScanSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid scan request payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { assetId, scannerId, aiTriage } = parsed.data;

        const [asset, scanner] = await Promise.all([
            assetId
                ? prisma.asset.findFirst({
                      where: { id: assetId, organizationId },
                      select: { id: true, name: true, hostname: true, ipAddress: true },
                  })
                : Promise.resolve(null),
            prisma.scannerConfig.findFirst({
                where: { id: scannerId, organizationId },
                select: { id: true, type: true, name: true },
            }),
        ]);

        if (assetId && !asset) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }
        if (!scanner) {
            return NextResponse.json({ error: "Scanner not found" }, { status: 404 });
        }

        const adapter = getScannerAdapter(scanner.type);
        if (!adapter) {
            return NextResponse.json(
                { error: `Scanner type '${scanner.type}' has no integration available` },
                { status: 400 },
            );
        }

        const target = parsed.data.target ?? asset?.ipAddress ?? asset?.hostname ?? asset?.name;
        if (!target) {
            return NextResponse.json(
                { error: "No scan target: supply `target`, or give the asset a hostname or IP address" },
                { status: 400 },
            );
        }

        // Fail fast with a clear reason rather than queueing work that cannot run.
        if (adapter.execution === "LOCAL_BINARY") {
            const availability = await adapter.available({});
            if (!availability.available) {
                return NextResponse.json(
                    {
                        error: `${adapter.label} is not installed on the server`,
                        details: availability.error,
                    },
                    { status: 503 },
                );
            }
        }

        const { jobRunId, queued } = await enqueue(
            "scan.run",
            { organizationId, scannerId: scanner.id, target, assetId: asset?.id, userId, aiTriage },
            { organizationId, entityType: "ScannerConfig", entityId: scanner.id },
        );

        return NextResponse.json(
            {
                message: queued ? "Scan queued." : "Scan started in-process (no job queue configured).",
                jobRunId,
                queued,
                scanner: scanner.name,
                target,
                aiTriage,
            },
            { status: 202 },
        );
    } catch (error) {
        console.error("Scan Run Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to queue scan" },
            { status: 500 },
        );
    }
}
