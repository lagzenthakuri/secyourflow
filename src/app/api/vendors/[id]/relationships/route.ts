import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import {
    RelationshipError,
    replaceVendorAssetLinks,
    replaceVendorDataLinks,
} from "@/lib/grc/relationships";

const VENDOR_ASSET_RELATIONSHIPS = ["PROVIDES", "MANAGES", "HOSTS", "OPERATES", "SUPPORTS"] as const;
const VENDOR_DATA_ACCESS = ["COLLECTS", "ACCESSES", "STORES", "PROCESSES", "SHARES"] as const;

/**
 * Replaces the vendor's asset and data relationships wholesale. Omitted keys
 * are left untouched, so an editor can save one side at a time.
 */
const relationshipsSchema = z
    .object({
        assets: z
            .array(
                z.object({
                    assetId: z.string().min(1),
                    relationshipType: z.enum(VENDOR_ASSET_RELATIONSHIPS).default("MANAGES"),
                }),
            )
            .max(500)
            .optional(),
        data: z
            .array(
                z.object({
                    dataAssetId: z.string().min(1),
                    accessType: z.enum(VENDOR_DATA_ACCESS).default("ACCESSES"),
                }),
            )
            .max(500)
            .optional(),
    })
    .refine((value) => value.assets !== undefined || value.data !== undefined, {
        message: "Provide at least one of assets or data",
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

        const vendor = await prisma.nis2Vendor.findFirst({
            where: { id, organizationId },
            select: { id: true, name: true },
        });
        if (!vendor) {
            return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
        }

        const parsed = relationshipsSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid relationship payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const counts = {
            assets:
                parsed.data.assets === undefined
                    ? undefined
                    : await replaceVendorAssetLinks(vendor.id, organizationId, parsed.data.assets),
            data:
                parsed.data.data === undefined
                    ? undefined
                    : await replaceVendorDataLinks(vendor.id, organizationId, parsed.data.data),
        };

        await prisma.auditLog.create({
            data: {
                action: "VENDOR_RELATIONSHIPS_UPDATED",
                entityType: "Nis2Vendor",
                entityId: vendor.id,
                newValue: { assets: counts.assets ?? "unchanged", data: counts.data ?? "unchanged" },
                userId,
                organizationId,
            },
        });

        return NextResponse.json({ data: { vendorId: vendor.id, counts } });
    } catch (error) {
        if (error instanceof RelationshipError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Error updating vendor relationships:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
