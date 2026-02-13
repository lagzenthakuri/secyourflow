
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/security/api-auth";

export async function POST(request: NextRequest) {
    const authResult = await requireApiAuth({
        allowedRoles: [Role.MAIN_OFFICER, Role.IT_OFFICER, Role.PENTESTER],
        request,
    });
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const body = await request.json();
        const { assetId, scannerId } = body;

        if (!assetId) {
            return NextResponse.json(
                { error: "assetId is required" },
                { status: 400 }
            );
        }

        const asset = await prisma.asset.findFirst({
            where: {
                id: assetId,
                organizationId: authResult.context.organizationId,
            },
            select: { id: true },
        });
        if (!asset) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        let result;
        if (scannerId) {
            const scanner = await prisma.scannerConfig.findFirst({
                where: {
                    id: scannerId,
                    organizationId: authResult.context.organizationId,
                },
            });
            if (!scanner) {
                return NextResponse.json({ error: "Scanner not found" }, { status: 404 });
            }

            if (scanner?.type === "TENABLE" || scanner?.type === "API") {
                const { runTenableScan } = await import("@/lib/scanner-engine");
                result = await runTenableScan(assetId, scannerId, authResult.context.organizationId);
            } else {
                return NextResponse.json(
                    { error: `Scanner type '${scanner?.type}' is not supported yet for direct API scanning. Please use a Tenable scanner or a generic API connector.` },
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
    } catch (error) {
        console.error("Scan Run Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to run scan" },
            { status: 500 }
        );
    }
}
