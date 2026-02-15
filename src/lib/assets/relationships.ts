import { prisma } from "@/lib/prisma";
import type { AssetRelationshipType } from "@prisma/client";

export async function createAssetRelationship(params: {
  organizationId: string;
  parentAssetId: string;
  childAssetId: string;
  relationshipType: AssetRelationshipType;
  notes?: string;
}) {
  if (params.parentAssetId === params.childAssetId) {
    throw new Error("An asset cannot relate to itself");
  }

  const assets = await prisma.asset.findMany({
    where: {
      id: { in: [params.parentAssetId, params.childAssetId] },
      organizationId: params.organizationId,
    },
    select: { id: true },
  });

  if (assets.length !== 2) {
    throw new Error("parentAssetId and childAssetId must belong to your organization");
  }

  return prisma.assetRelationship.create({
    data: params,
  });
}

export async function deleteAssetRelationship(params: {
  organizationId: string;
  id: string;
}) {
  const existing = await prisma.assetRelationship.findFirst({
    where: {
      id: params.id,
      organizationId: params.organizationId,
    },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Relationship not found");
  }

  return prisma.assetRelationship.delete({ where: { id: existing.id } });
}

export async function listAssetRelationships(organizationId: string) {
  return prisma.assetRelationship.findMany({
    where: { organizationId },
    include: {
      parentAsset: {
        select: { id: true, name: true, type: true, criticality: true },
      },
      childAsset: {
        select: { id: true, name: true, type: true, criticality: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
