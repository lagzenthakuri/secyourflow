
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { assetId, scannerId, apiKey, model } = body;

        if (!assetId) {
            return NextResponse.json(
                { error: "assetId is required" },
                { status: 400 }
            );
        }

        let result;
        if (scannerId) {
            const { prisma } = await import("@/lib/prisma");
            const scanner = await prisma.scannerConfig.findUnique({ where: { id: scannerId } });

            if ((scanner?.type as string) === "TENABLE") {
                const { runTenableScan } = await import("@/lib/scanner-engine");
                result = await runTenableScan(assetId, scannerId);
            } else {
                return NextResponse.json(
                    { error: "Selected scanner is not supported or requires manual configuration" },
                    { status: 400 }
                );
            }
        } else {
            return NextResponse.json(
                { error: "scannerId is required for Tenable API scanning" },
                { status: 400 }
            );
        }

        return NextResponse.json({
            message: "Scan completed successfully",
            ...result
        });
    } catch (error: any) {
        console.error("Scan Run Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to run scan" },
            { status: 500 }
        );
    }
}
