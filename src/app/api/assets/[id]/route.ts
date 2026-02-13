import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { logAssetChange } from "@/lib/assets/lifecycle";

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
    const body = await request.json();

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
      where: { id },
      data: body,
    });

    for (const key of Object.keys(body)) {
      await logAssetChange({
        organizationId: authResult.context.organizationId,
        assetId: id,
        changedById: authResult.context.userId,
        field: key,
        oldValue: (existing as Record<string, unknown>)[key],
        newValue: (updatedAsset as Record<string, unknown>)[key],
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
      where: { id },
    });

    if (vulnIds.length > 0) {
      const stillLinkedVulns = await prisma.assetVulnerability.findMany({
        where: { vulnerabilityId: { in: vulnIds } },
        select: { vulnerabilityId: true },
      });

      const stillLinkedIds = new Set(stillLinkedVulns.map((v) => v.vulnerabilityId));
      const orphanIds = vulnIds.filter((vid) => !stillLinkedIds.has(vid));

      if (orphanIds.length > 0) {
        await prisma.vulnerability.deleteMany({
          where: { id: { in: orphanIds } },
        });
      }
    }

    return NextResponse.json({ message: "Asset and associated data deleted successfully" });
  } catch (error) {
    console.error("Delete Asset Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}
