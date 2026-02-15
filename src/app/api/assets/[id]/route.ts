import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { logAssetChange } from "@/lib/assets/lifecycle";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const updateAssetSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    type: z
      .enum([
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
      ])
      .optional(),
    hostname: z.string().optional().nullable(),
    ipAddress: z.string().optional().nullable(),
    macAddress: z.string().optional().nullable(),
    operatingSystem: z.string().optional().nullable(),
    version: z.string().optional().nullable(),
    environment: z.enum(["PRODUCTION", "STAGING", "DEVELOPMENT", "TESTING", "DR"]).optional(),
    criticality: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"]).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "DECOMMISSIONED", "MAINTENANCE"]).optional(),
    owner: z.string().optional().nullable(),
    department: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    cloudProvider: z.enum(["AWS", "AZURE", "GCP", "ORACLE", "IBM", "ALIBABA", "OTHER"]).optional().nullable(),
    cloudRegion: z.string().optional().nullable(),
    cloudAccountId: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  try {
    const { id } = await params;

    const asset = await prisma.asset.findFirst({
      where: {
        id,
        organizationId: authResult.context.organizationId,
      },
      include: {
        _count: {
          select: { vulnerabilities: true },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...asset,
      vulnerabilityCount: asset._count.vulnerabilities,
    });
  } catch (error) {
    console.error("Get Asset Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  try {
    const { id } = await params;
    const parsed = updateAssetSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid asset update payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const updateData = {
      ...body,
      metadata: body.metadata as Prisma.InputJsonValue | undefined,
    };

    const existing = await prisma.asset.findFirst({
      where: {
        id,
        organizationId: authResult.context.organizationId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const updatedAsset = await prisma.asset.update({
      where: { id: existing.id },
      data: updateData,
    });

    for (const key of Object.keys(updateData)) {
      await logAssetChange({
        organizationId: authResult.context.organizationId,
        assetId: id,
        changedById: authResult.context.userId,
        field: key,
        oldValue: (existing as Record<string, unknown>)[key],
        newValue: (updatedAsset as Record<string, unknown>)[key] ?? (updateData as Record<string, unknown>)[key],
      });
    }

    return NextResponse.json(updatedAsset);
  } catch (error) {
    console.error("Update Asset Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  try {
    const { id } = await params;

    const existing = await prisma.asset.findFirst({
      where: {
        id,
        organizationId: authResult.context.organizationId,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const linkedVulns = await prisma.assetVulnerability.findMany({
      where: { assetId: id },
      select: { vulnerabilityId: true },
    });

    const vulnIds = linkedVulns.map((v) => v.vulnerabilityId);

    await prisma.asset.delete({
      where: { id: existing.id },
    });

    if (vulnIds.length > 0) {
      const stillLinkedVulns = await prisma.assetVulnerability.findMany({
        where: {
          vulnerabilityId: { in: vulnIds },
          vulnerability: {
            organizationId: authResult.context.organizationId,
          },
        },
        select: { vulnerabilityId: true },
      });

      const stillLinkedIds = new Set(stillLinkedVulns.map((v) => v.vulnerabilityId));
      const orphanIds = vulnIds.filter((vid) => !stillLinkedIds.has(vid));

      if (orphanIds.length > 0) {
        await prisma.vulnerability.deleteMany({
          where: {
            id: { in: orphanIds },
            organizationId: authResult.context.organizationId,
          },
        });
      }
    }

    return NextResponse.json({ message: "Asset and associated data deleted successfully" });
  } catch (error) {
    console.error("Delete Asset Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
