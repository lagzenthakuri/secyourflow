import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { runTenableScan } from "@/lib/scanner-engine";

const runScanSchema = z.object({
    assetId: z.string().min(1),
    scannerId: z.string().min(1),
});

export async function POST(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request, {
        allowedRoles: ["MAIN_OFFICER", "IT_OFFICER", "PENTESTER"],
    });
    if (!authResult.ok) {
        return authResult.response;
    }

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
            prisma.asset.findFirst({
                where: {
                    id: assetId,
                    organizationId: authResult.context.organizationId,
                },
                select: { id: true },
            }),
            prisma.scannerConfig.findFirst({
                where: {
                    id: scannerId,
                    organizationId: authResult.context.organizationId,
                },
                select: { id: true, type: true },
            }),
        ]);

        if (!asset) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        if (!scanner) {
            return NextResponse.json({ error: "Scanner not found" }, { status: 404 });
        }

        if (scanner.type !== "TENABLE" && scanner.type !== "API") {
            return NextResponse.json(
                {
                    error: `Scanner type '${scanner.type}' is not supported yet for direct API scanning. Please use a Tenable scanner or a generic API connector.`,
                },
                { status: 400 },
            );
        }

        const result = await runTenableScan(assetId, scannerId, authResult.context.organizationId);

        return NextResponse.json({
            message: "Scan completed successfully",
            ...result,
        });
    } catch (error) {
        console.error("Scan Run Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to run scan" },
            { status: 500 },
        );
    }
}
