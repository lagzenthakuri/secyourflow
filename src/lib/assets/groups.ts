import { prisma } from "@/lib/prisma";

function normalizeAssetIds(assetIds: string[]): string[] {
  return [...new Set(assetIds.map((assetId) => assetId.trim()).filter((assetId) => assetId.length > 0))];
}

async function assertAssetIdsInOrganization(assetIds: string[], organizationId: string) {
  if (assetIds.length === 0) {
    return;
  }

  const normalizedAssetIds = normalizeAssetIds(assetIds);
  const assets = await prisma.asset.findMany({
    where: {
      id: { in: normalizedAssetIds },
      organizationId,
    },
    select: { id: true },
  });

  if (assets.length !== normalizedAssetIds.length) {
    throw new Error("One or more assetIds are invalid for this organization");
  }
}

export async function listAssetGroups(organizationId: string) {
  return prisma.assetGroup.findMany({
    where: { organizationId },
    include: {
      members: {
        include: {
          asset: {
            select: {
              id: true,
              name: true,
              type: true,
              criticality: true,
              status: true,
            },
          },
        },
      },
      _count: {
        select: { members: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createAssetGroup(params: {
  organizationId: string;
  createdById?: string;
  name: string;
  description?: string;
  color?: string;
  assetIds?: string[];
}) {
  const { assetIds = [], ...rest } = params;
  const normalizedAssetIds = normalizeAssetIds(assetIds);
  await assertAssetIdsInOrganization(normalizedAssetIds, params.organizationId);

  return prisma.assetGroup.create({
    data: {
      ...rest,
      members: normalizedAssetIds.length
        ? {
            createMany: {
              data: normalizedAssetIds.map((assetId) => ({ assetId })),
            },
          }
        : undefined,
    },
    include: {
      members: {
        include: {
          asset: true,
        },
      },
    },
  });
}

export async function updateAssetGroup(params: {
  organizationId: string;
  id: string;
  name?: string;
  description?: string;
  color?: string;
  assetIds?: string[];
}) {
  const existing = await prisma.assetGroup.findFirst({
    where: { id: params.id, organizationId: params.organizationId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Asset group not found");
  }

  const { assetIds, id, ...groupData } = params;

  if (Array.isArray(assetIds)) {
    const normalizedAssetIds = normalizeAssetIds(assetIds);
    await assertAssetIdsInOrganization(normalizedAssetIds, params.organizationId);

    await prisma.assetGroupMember.deleteMany({ where: { groupId: id } });

    if (normalizedAssetIds.length > 0) {
      await prisma.assetGroupMember.createMany({
        data: normalizedAssetIds.map((assetId) => ({ groupId: id, assetId })),
        skipDuplicates: true,
      });
    }
  }

  return prisma.assetGroup.update({
    where: { id },
    data: groupData,
    include: {
      members: {
        include: {
          asset: true,
        },
      },
    },
  });
}

export async function deleteAssetGroup(params: { organizationId: string; id: string }) {
  const existing = await prisma.assetGroup.findFirst({
    where: { id: params.id, organizationId: params.organizationId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Asset group not found");
  }

  return prisma.assetGroup.delete({ where: { id: params.id } });
}
