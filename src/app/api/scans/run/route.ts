import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { runTenableScan } from "@/lib/scanner-engine";
import { getScannerAdapter } from "@/lib/scanners/registry";
import { runScan } from "@/lib/scanners/run";
import { triageInBackground } from "@/lib/scanners/triage";

const runScanSchema = z
    .object({
        scannerId: z.string().min(1),
        assetId: z.string().min(1).optional(),
        /** Explicit target; defaults to the asset's hostname or IP. */
        target: z.string().min(1).max(512).optional(),
        /** Run AI risk analysis over the findings once the scan returns. */
        aiTriage: z.boolean().default(true),
    })
    .refine((value) => value.assetId || value.target, {
        message: "Either assetId or target must be provided",
    });

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

        const { assetId, scannerId } = parsed.data;

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

        // Tenable keeps its existing dedicated path.
        if (scanner.type === "TENABLE" || scanner.type === "API") {
            if (!assetId) {
                return NextResponse.json(
                    { error: "This scanner requires an assetId" },
                    { status: 400 },
                );
            }
            const result = await runTenableScan(assetId, scannerId, organizationId);
            return NextResponse.json({ message: "Scan completed successfully", ...result });
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

        // Refuse early with a clear reason rather than failing mid-scan.
        const availability = await adapter.available({});
        if (!availability.available && adapter.execution === "LOCAL_BINARY") {
            return NextResponse.json(
                {
                    error: `${adapter.label} is not installed on the server`,
                    details: availability.error,
                },
                { status: 503 },
            );
        }

        const result = await runScan({
            scannerId: scanner.id,
            organizationId,
            target,
            assetId: asset?.id,
        });

        await prisma.auditLog.create({
            data: {
                action: "SCAN_EXECUTED",
                entityType: "ScanResult",
                entityId: result.scanResultId,
                newValue: {
                    scanner: scanner.name,
                    type: scanner.type,
                    target,
                    findings: result.findings,
                },
                userId,
                organizationId,
            },
        });

        // A local model needs seconds per finding, so analysis runs after the
        // response is sent rather than holding the request open.
        const triageRequested = parsed.data.aiTriage && result.vulnerabilityIds.length > 0;
        if (triageRequested) {
            after(async () => {
                await triageInBackground({
                    organizationId,
                    vulnerabilityIds: result.vulnerabilityIds,
                    assetId: asset?.id,
                    target,
                    userId,
                    scannerName: scanner.name,
                });
            });
        }

        return NextResponse.json({
            message: "Scan completed successfully",
            ...result,
            aiTriage: triageRequested ? "queued" : "skipped",
        });
    } catch (error) {
        console.error("Scan Run Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to run scan" },
            { status: 500 },
        );
    }
}
