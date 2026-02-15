import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AssetStatus, AssetType, Criticality, Prisma } from "@prisma/client";
import { requireSessionWithOrg } from "@/lib/api-auth";

const createAssetSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.enum([
    "SERVER",
    "WORKSTATION",
    "NETWORK_DEVICE",
    "CLOUD_INSTANCE",
    "CONTAINER",
    "DATABASE",
    "APPLICATION",
    "API",
    "DOMAIN",
    "CERTIFICATE",
    "IOT_DEVICE",
    "MOBILE_DEVICE",
    "OTHER",
  ]),
  hostname: z.string().optional(),
  ipAddress: z.string().optional(),
  macAddress: z.string().optional(),
  operatingSystem: z.string().optional(),
  version: z.string().optional(),
  environment: z.enum(["PRODUCTION", "STAGING", "DEVELOPMENT", "TESTING", "DR"]).optional(),
  criticality: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DECOMMISSIONED", "MAINTENANCE"]).optional(),
  owner: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  cloudProvider: z.enum(["AWS", "AZURE", "GCP", "ORACLE", "IBM", "ALIBABA", "OTHER"]).optional(),
  cloudRegion: z.string().optional(),
  cloudAccountId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const criticality = searchParams.get("criticality");
  const owner = searchParams.get("owner");
  const tag = searchParams.get("tag");
  const groupId = searchParams.get("groupId");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  try {
    const where: Record<string, unknown> = {
      organizationId: authResult.context.organizationId,
    };

    if (type) where.type = type as AssetType;
    if (status) where.status = status as AssetStatus;
    if (criticality) where.criticality = criticality as Criticality;

    if (owner) {
      where.owner = { contains: owner, mode: "insensitive" };
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (groupId) {
      where.groupMembers = {
        some: {
          groupId,
        },
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { ipAddress: { contains: search, mode: "insensitive" } },
        { hostname: { contains: search, mode: "insensitive" } },
      ];
    }

    const [assets, total, typeDistribution, envDistribution] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { vulnerabilities: true },
          },
          groupMembers: {
            include: {
              group: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      }),
      prisma.asset.count({ where }),
      prisma.asset.groupBy({
        by: ["type"],
        where: { organizationId: authResult.context.organizationId },
        _count: { _all: true },
      }),
      prisma.asset.groupBy({
        by: ["environment"],
        where: { organizationId: authResult.context.organizationId },
        _count: { _all: true },
      }),
    ]);

    const formattedAssets = assets.map((asset) => ({
      ...asset,
      vulnerabilityCount: asset._count.vulnerabilities,
      groups: asset.groupMembers.map((member) => member.group),
    }));

    const typeDist = typeDistribution.map((item) => ({
      type: item.type,
      count: item._count._all,
      percentage: total > 0 ? (item._count._all / total) * 100 : 0,
    }));

    const envDist = envDistribution.map((item) => ({
      name: item.environment,
      count: item._count._all,
      percentage: total > 0 ? (item._count._all / total) * 100 : 0,
    }));

    return NextResponse.json({
      data: formattedAssets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      summary: {
        typeDistribution: typeDist,
        environmentBreakdown: envDist,
      },
    });
  } catch (error) {
    console.error("Assets API Error:", error);
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = createAssetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const { metadata, ...rest } = parsed.data;

    const newAsset = await prisma.asset.create({
      data: {
        ...rest,
        metadata: metadata as Prisma.InputJsonValue | undefined,
        organizationId: authResult.context.organizationId,
      },
    });

    return NextResponse.json(newAsset, { status: 201 });
  } catch (error) {
    console.error("Create Asset Error:", error);
    return NextResponse.json({ error: "Failed to create asset" }, { status: 400 });
  }
}
