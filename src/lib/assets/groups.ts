import { prisma } from "@/lib/prisma";

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

  return prisma.assetGroup.create({
    data: {
      ...rest,
      members: assetIds.length
        ? {
            createMany: {
              data: assetIds.map((assetId) => ({ assetId })),
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
    await prisma.assetGroupMember.deleteMany({ where: { groupId: id } });

    if (assetIds.length > 0) {
      await prisma.assetGroupMember.createMany({
        data: assetIds.map((assetId) => ({ groupId: id, assetId })),
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
