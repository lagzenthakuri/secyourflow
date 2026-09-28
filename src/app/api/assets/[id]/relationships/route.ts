import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import {
    RelationshipError,
    replaceAssetDataLinks,
    replaceAssetVendorLinks,
} from "@/lib/grc/relationships";

const VENDOR_ASSET_RELATIONSHIPS = ["PROVIDES", "MANAGES", "HOSTS", "OPERATES", "SUPPORTS"] as const;
const ASSET_DATA_ROLES = ["STORES", "PROCESSES", "TRANSITS"] as const;

/**
 * Replaces the asset's vendor and data relationships wholesale. Omitted keys
 * are left untouched.
 */
const relationshipsSchema = z
    .object({
        vendors: z
            .array(
                z.object({
                    vendorId: z.string().min(1),
                    relationshipType: z.enum(VENDOR_ASSET_RELATIONSHIPS).default("MANAGES"),
                }),
            )
            .max(500)
            .optional(),
        data: z
            .array(
                z.object({
                    dataAssetId: z.string().min(1),
                    dataRole: z.enum(ASSET_DATA_ROLES).default("STORES"),
                }),
            )
            .max(500)
            .optional(),
    })
    .refine((value) => value.vendors !== undefined || value.data !== undefined, {
        message: "Provide at least one of vendors or data",
    });

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authResult = await requireSessionWithOrg(request, {
        allowedRoles: ["MAIN_OFFICER", "IT_OFFICER"],
    });
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId, userId } = authResult.context;

    try {
        const { id } = await params;

        const asset = await prisma.asset.findFirst({
            where: { id, organizationId },
            select: { id: true, name: true },
        });
        if (!asset) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        const parsed = relationshipsSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid relationship payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const counts = {
            vendors:
                parsed.data.vendors === undefined
                    ? undefined
                    : await replaceAssetVendorLinks(asset.id, organizationId, parsed.data.vendors),
            data:
                parsed.data.data === undefined
                    ? undefined
                    : await replaceAssetDataLinks(asset.id, organizationId, parsed.data.data),
        };

        await prisma.auditLog.create({
            data: {
                action: "ASSET_RELATIONSHIPS_UPDATED",
                entityType: "Asset",
                entityId: asset.id,
                newValue: { vendors: counts.vendors ?? "unchanged", data: counts.data ?? "unchanged" },
                userId,
                organizationId,
            },
        });

        return NextResponse.json({ data: { assetId: asset.id, counts } });
    } catch (error) {
        if (error instanceof RelationshipError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Error updating asset relationships:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
