import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";

const DATA_CATEGORIES = [
    "CUSTOMER_PII",
    "EMPLOYEE_DATA",
    "FINANCIAL_DATA",
    "AUTHENTICATION_CREDENTIALS",
    "BUSINESS_SENSITIVE",
    "HEALTH_DATA",
    "TELEMETRY",
    "OTHER",
] as const;

const DATA_CLASSIFICATIONS = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"] as const;

const updateDataAssetSchema = z.object({
    name: z.string().min(2).max(200).optional(),
    category: z.enum(DATA_CATEGORIES).optional(),
    classification: z.enum(DATA_CLASSIFICATIONS).optional(),
    description: z.string().max(4000).nullable().optional(),
    retentionNotes: z.string().max(4000).nullable().optional(),
    tags: z.array(z.string().max(50)).max(20).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const { id } = await params;
        const dataAsset = await prisma.dataAsset.findFirst({
            where: { id, organizationId: authResult.context.organizationId },
            include: {
                vendorLinks: {
                    include: {
                        vendor: { select: { id: true, name: true, criticality: true } },
                    },
                    orderBy: { createdAt: "asc" },
                },
                assetLinks: {
                    include: {
                        asset: { select: { id: true, name: true, type: true, criticality: true } },
                    },
                    orderBy: { createdAt: "asc" },
                },
                policyLinks: {
                    include: {
                        policy: { select: { id: true, title: true, status: true, type: true } },
                    },
                    orderBy: { createdAt: "asc" },
                },
            },
        });

        if (!dataAsset) {
            return NextResponse.json({ error: "Data record not found" }, { status: 404 });
        }

        return NextResponse.json({
            data: {
                ...dataAsset,
                vendors: dataAsset.vendorLinks.map((link) => ({
                    id: link.vendor.id,
                    name: link.vendor.name,
                    criticality: link.vendor.criticality,
                    accessType: link.accessType,
                })),
                assets: dataAsset.assetLinks.map((link) => ({
                    id: link.asset.id,
                    name: link.asset.name,
                    type: link.asset.type,
                    criticality: link.asset.criticality,
                    dataRole: link.dataRole,
                })),
                policies: dataAsset.policyLinks.map((link) => link.policy),
            },
        });
    } catch (error) {
        console.error("Error fetching data asset:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authResult = await requireSessionWithOrg(request, {
        allowedRoles: ["MAIN_OFFICER", "IT_OFFICER"],
    });
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId, userId } = authResult.context;

    try {
        const { id } = await params;
        const parsed = updateDataAssetSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid data asset payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const existing = await prisma.dataAsset.findFirst({ where: { id, organizationId } });
        if (!existing) {
            return NextResponse.json({ error: "Data record not found" }, { status: 404 });
        }

        const updated = await prisma.dataAsset.update({
            where: { id: existing.id },
            data: parsed.data,
        });

        await prisma.auditLog.create({
            data: {
                action: "DATA_ASSET_UPDATED",
                entityType: "DataAsset",
                entityId: updated.id,
                oldValue: { name: existing.name, classification: existing.classification },
                newValue: { name: updated.name, classification: updated.classification },
                userId,
                organizationId,
            },
        });

        return NextResponse.json({ data: updated });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json(
                { error: "A data record with that name already exists" },
                { status: 409 },
            );
        }
        console.error("Error updating data asset:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER"] });
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId, userId } = authResult.context;

    try {
        const { id } = await params;
        const existing = await prisma.dataAsset.findFirst({
            where: { id, organizationId },
            select: { id: true, name: true },
        });
        if (!existing) {
            return NextResponse.json({ error: "Data record not found" }, { status: 404 });
        }

        await prisma.dataAsset.delete({ where: { id: existing.id } });

        await prisma.auditLog.create({
            data: {
                action: "DATA_ASSET_DELETED",
                entityType: "DataAsset",
                entityId: existing.id,
                oldValue: { name: existing.name },
                userId,
                organizationId,
            },
        });

        return NextResponse.json({ data: { id: existing.id } });
    } catch (error) {
        console.error("Error deleting data asset:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
