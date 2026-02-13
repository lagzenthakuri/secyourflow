import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AssetType, AssetStatus, Criticality, Environment, Role } from "@prisma/client";
import { z } from "zod";

import { requireApiAuth } from "@/lib/security/api-auth";

const createAssetSchema = z.object({
    name: z.string().trim().min(1).max(120),
    type: z.nativeEnum(AssetType),
    ipAddress: z.string().trim().max(128).optional().nullable(),
    hostname: z.string().trim().max(255).optional().nullable(),
    criticality: z.nativeEnum(Criticality).optional(),
    status: z.nativeEnum(AssetStatus).optional(),
    environment: z.nativeEnum(Environment).optional(),
    owner: z.string().trim().max(120).optional().nullable(),
    location: z.string().trim().max(120).optional().nullable(),
    metadata: z.unknown().optional(),
});

export async function GET(request: NextRequest) {
    const authResult = await requireApiAuth();
    if ("response" in authResult) {
        return authResult.response;
    }
    const orgId = authResult.context.organizationId;

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const criticality = searchParams.get("criticality");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20"))); // Max 100 per page

    try {
        const where: Record<string, unknown> = {
            organizationId: orgId
        };

        if (type) where.type = type as AssetType;
        if (status) where.status = status as AssetStatus;
        if (criticality) where.criticality = criticality as Criticality;

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { ipAddress: { contains: search, mode: 'insensitive' } },
                { hostname: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [assets, total, typeDistribution, envDistribution] = await Promise.all([
            prisma.asset.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { vulnerabilities: true }
                    }
                }
            }),
            prisma.asset.count({ where }),
            prisma.asset.groupBy({
                where: { organizationId: orgId },
                by: ['type'],
                _count: { _all: true }
            }),
            prisma.asset.groupBy({
                where: { organizationId: orgId },
                by: ['environment'],
                _count: { _all: true }
            })
        ]);

        const formattedAssets = assets.map(asset => ({
            ...asset,
            vulnerabilityCount: asset._count.vulnerabilities,
        }));

        const typeDist = typeDistribution.map(t => ({
            type: t.type,
            count: t._count._all,
            percentage: total > 0 ? (t._count._all / total) * 100 : 0
        }));

        const envDist = envDistribution.map(e => ({
            name: e.environment,
            count: e._count._all,
            percentage: total > 0 ? (e._count._all / total) * 100 : 0
        }));

        return NextResponse.json({
            data: formattedAssets,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            summary: {
                typeDistribution: typeDist,
                environmentBreakdown: envDist,
            }
        });

    } catch {
        console.error("Assets API Error");
        return NextResponse.json(
            { error: "Failed to fetch assets" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const authResult = await requireApiAuth({
        allowedRoles: [Role.IT_OFFICER, Role.PENTESTER, Role.MAIN_OFFICER],
        request,
    });
    if ("response" in authResult) {
        return authResult.response;
    }
    const orgId = authResult.context.organizationId;

    try {
        const body = await request.json();
        const parsed = createAssetSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid asset payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const sanitizedData = {
            name: sanitizeInput(parsed.data.name) as string,
            type: parsed.data.type,
            ipAddress: parsed.data.ipAddress ?? null,
            hostname: sanitizeInput(parsed.data.hostname) ?? null,
            criticality: parsed.data.criticality ?? Criticality.MEDIUM,
            status: parsed.data.status ?? AssetStatus.ACTIVE,
            environment: parsed.data.environment ?? Environment.PRODUCTION,
            owner: sanitizeInput(parsed.data.owner) ?? null,
            location: sanitizeInput(parsed.data.location) ?? null,
            metadata: parsed.data.metadata as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined,
            organizationId: orgId,
        };

        const newAsset = await prisma.asset.create({
            data: sanitizedData,
        });

        return NextResponse.json(newAsset, { status: 201 });
    } catch {
        console.error("Create Asset Error");
        return NextResponse.json(
            { error: "Failed to create asset" },
            { status: 400 }
        );
    }
}

// Helper function to sanitize inputs
function sanitizeInput(input: unknown): string | undefined {
    if (typeof input !== 'string') return undefined;
    // Remove HTML tags and dangerous characters
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();
}
