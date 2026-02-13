import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/security/api-auth";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await requireApiAuth();
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const { id } = await params;
        const orgId = authResult.context.organizationId;

        // Authorization check - ensure asset belongs to user's organization
        const asset = await prisma.asset.findFirst({
            where: { 
                id,
                organizationId: orgId
            },
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
    } catch {
        console.error("Get Asset Error");
        return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await requireApiAuth({
        allowedRoles: [Role.IT_OFFICER, Role.PENTESTER, Role.MAIN_OFFICER],
        request,
    });
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const orgId = authResult.context.organizationId;

        // Verify asset belongs to user's organization
        const existingAsset = await prisma.asset.findFirst({
            where: { id, organizationId: orgId }
        });

        if (!existingAsset) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        // Only allow specific fields to be updated (prevent mass assignment)
        const allowedFields = [
            'name', 'type', 'ipAddress', 'hostname',
            'criticality', 'status', 'environment', 'owner', 'location', 'metadata'
        ];

        const updateData: Record<string, unknown> = {};
        for (const field of allowedFields) {
            if (field in body) {
                const value = body[field];
                // Sanitize string inputs
                if (typeof value === 'string') {
                    updateData[field] = value
                        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                        .replace(/<[^>]+>/g, '')
                        .trim();
                } else {
                    updateData[field] = value;
                }
            }
        }

        // Update the asset
        const updatedAsset = await prisma.asset.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(updatedAsset);
    } catch {
        console.error("Update Asset Error");
        return NextResponse.json({ error: 'Failed to update asset' }, { status: 400 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await requireApiAuth({
        allowedRoles: [Role.IT_OFFICER, Role.PENTESTER, Role.MAIN_OFFICER],
        request,
    });
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const { id } = await params;
        const orgId = authResult.context.organizationId;

        // Verify asset belongs to user's organization
        const existingAsset = await prisma.asset.findFirst({
            where: { id, organizationId: orgId }
        });

        if (!existingAsset) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

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
                await prisma.vulnerability.deleteMany({
                    where: { id: { in: orphanIds } }
                });
            }
        }

        return NextResponse.json({ message: "Asset and associated data deleted successfully" });
    } catch {
        console.error("Delete Asset Error");
        return NextResponse.json({ error: 'Failed to delete asset' }, { status: 400 });
    }
}
