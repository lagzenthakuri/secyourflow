import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";

/**
 * The organization-wide data catalog. One row per data type, shared by every
 * vendor and asset that handles it — relationships are stored on the join
 * tables, never duplicated here.
 */

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

const createDataAssetSchema = z.object({
    name: z.string().min(2).max(200),
    category: z.enum(DATA_CATEGORIES).default("BUSINESS_SENSITIVE"),
    classification: z.enum(DATA_CLASSIFICATIONS).default("INTERNAL"),
    description: z.string().max(4000).nullable().optional(),
    retentionNotes: z.string().max(4000).nullable().optional(),
    tags: z.array(z.string().max(50)).max(20).default([]),
});

const listQuerySchema = z.object({
    category: z.enum(DATA_CATEGORIES).optional(),
    classification: z.enum(DATA_CLASSIFICATIONS).optional(),
});

export async function GET(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    const parsedQuery = listQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsedQuery.success) {
        return NextResponse.json(
            { error: "Invalid query", details: parsedQuery.error.flatten() },
            { status: 400 },
        );
    }

    try {
        const dataAssets = await prisma.dataAsset.findMany({
            where: {
                organizationId: authResult.context.organizationId,
                ...(parsedQuery.data.category && { category: parsedQuery.data.category }),
                ...(parsedQuery.data.classification && {
                    classification: parsedQuery.data.classification,
                }),
            },
            include: {
                _count: { select: { vendorLinks: true, assetLinks: true, policyLinks: true } },
            },
            orderBy: [{ category: "asc" }, { name: "asc" }],
        });

        return NextResponse.json({
            data: dataAssets.map((item) => ({
                id: item.id,
                name: item.name,
                category: item.category,
                classification: item.classification,
                description: item.description,
                retentionNotes: item.retentionNotes,
                tags: item.tags,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                counts: {
                    vendors: item._count.vendorLinks,
                    assets: item._count.assetLinks,
                    policies: item._count.policyLinks,
                },
            })),
        });
    } catch (error) {
        console.error("Error fetching data assets:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request, {
        allowedRoles: ["MAIN_OFFICER", "IT_OFFICER"],
    });
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId, userId } = authResult.context;

    try {
        const parsed = createDataAssetSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid data asset payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const dataAsset = await prisma.dataAsset.create({
            data: { ...parsed.data, organizationId },
        });

        await prisma.auditLog.create({
            data: {
                action: "DATA_ASSET_CREATED",
                entityType: "DataAsset",
                entityId: dataAsset.id,
                newValue: {
                    name: dataAsset.name,
                    category: dataAsset.category,
                    classification: dataAsset.classification,
                },
                userId,
                organizationId,
            },
        });

        return NextResponse.json({ data: dataAsset }, { status: 201 });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json(
                { error: "A data record with that name already exists" },
                { status: 409 },
            );
        }
        console.error("Error creating data asset:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
