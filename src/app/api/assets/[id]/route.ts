import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const asset = await prisma.asset.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { vulnerabilities: true }
                }
            }
        });

        if (!asset) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        return NextResponse.json({
            ...asset,
            vulnerabilityCount: asset._count.vulnerabilities
        });
    } catch (error) {
        console.error("Get Asset Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Update the asset
        const updatedAsset = await prisma.asset.update({
            where: { id },
            data: body,
        });

        return NextResponse.json(updatedAsset);
    } catch (error) {
        console.error("Update Asset Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 400 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Find vulnerabilities currently linked to this asset
        const linkedVulns = await prisma.assetVulnerability.findMany({
            where: { assetId: id },
            select: { vulnerabilityId: true }
        });

        const vulnIds = linkedVulns.map(v => v.vulnerabilityId);

        // 2. Delete the asset 
        // This will cascade and delete AssetVulnerability, RiskRegister, and AssetComplianceControl entries
        await prisma.asset.delete({
            where: { id },
        });

        // 3. Cleanup orphaned vulnerabilities
        // We only delete vulnerabilities that were linked to this asset AND have no other asset links remaining
        if (vulnIds.length > 0) {
            const stillLinkedVulns = await prisma.assetVulnerability.findMany({
                where: { vulnerabilityId: { in: vulnIds } },
                select: { vulnerabilityId: true }
            });

            const stillLinkedIds = new Set(stillLinkedVulns.map(v => v.vulnerabilityId));
            const orphanIds = vulnIds.filter(vid => !stillLinkedIds.has(vid));

            if (orphanIds.length > 0) {
                console.log(`Cleaning up ${orphanIds.length} orphaned vulnerabilities`);
                await prisma.vulnerability.deleteMany({
                    where: { id: { in: orphanIds } }
                });
            }
        }

        return NextResponse.json({ message: "Asset and associated data deleted successfully" });
    } catch (error) {
        console.error("Delete Asset Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 400 });
    }
}
