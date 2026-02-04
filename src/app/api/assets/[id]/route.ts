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
    } catch (error: any) {
        console.error("Get Asset Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
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
    } catch (error: any) {
        console.error("Update Asset Error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Prisma relation for AssetVulnerability should handle cascade if configured,
        // but we'll manually ensure links are removed if needed.
        // In the schema, assetId in AssetVulnerability has onDelete: Cascade.
        
        await prisma.asset.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Asset deleted successfully" });
    } catch (error: any) {
        console.error("Delete Asset Error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
