import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AssetType, AssetStatus, Criticality } from "@prisma/client";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const criticality = searchParams.get("criticality");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    try {
        const where: Record<string, unknown> = {};

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
                by: ['type'],
                _count: { _all: true }
            }),
            prisma.asset.groupBy({
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

    } catch (error) {
        console.error("Assets API Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch assets" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // In a real app, organizationId should come from the session
        // For now, we'll use a constant or the first org found
        const org = await prisma.organization.findFirst();
        if (!org) throw new Error("No organization found");

        const newAsset = await prisma.asset.create({
            data: {
                ...body,
                organizationId: org.id,
            },
        });

        return NextResponse.json(newAsset, { status: 201 });
    } catch (error) {
        console.error("Create Asset Error:", error);
        return NextResponse.json(
            { error: "Failed to create asset" },
            { status: 400 }
        );
    }
}
