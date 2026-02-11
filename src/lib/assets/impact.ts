import { prisma } from "@/lib/prisma";

export async function buildAssetImpactAnalysis(organizationId: string, assetId: string) {
  const rootAsset = await prisma.asset.findFirst({
    where: { id: assetId, organizationId },
    include: {
      _count: {
        select: { vulnerabilities: true },
      },
    },
  });

  if (!rootAsset) {
    throw new Error("Asset not found");
  }

  const relationships = await prisma.assetRelationship.findMany({
    where: {
      organizationId,
      OR: [{ parentAssetId: assetId }, { childAssetId: assetId }],
    },
    include: {
      parentAsset: {
        select: { id: true, name: true, type: true, criticality: true, status: true },
      },
      childAsset: {
        select: { id: true, name: true, type: true, criticality: true, status: true },
      },
    },
  });

  const connectedAssetIds = new Set<string>();
  for (const rel of relationships) {
    connectedAssetIds.add(rel.parentAssetId);
    connectedAssetIds.add(rel.childAssetId);
  }
  connectedAssetIds.delete(assetId);

  const connectedAssets = connectedAssetIds.size
    ? await prisma.asset.findMany({
        where: {
          organizationId,
          id: { in: [...connectedAssetIds] },
        },
        include: {
          _count: {
            select: { vulnerabilities: true },
          },
        },
      })
    : [];

  const criticalDependencies = connectedAssets.filter((asset) => asset.criticality === "CRITICAL").length;
  const connectedOpenVulns = connectedAssets.reduce((sum, asset) => sum + asset._count.vulnerabilities, 0);

  return {
    root: {
      id: rootAsset.id,
      name: rootAsset.name,
      type: rootAsset.type,
      criticality: rootAsset.criticality,
      status: rootAsset.status,
      vulnerabilities: rootAsset._count.vulnerabilities,
    },
    summary: {
      relationships: relationships.length,
      connectedAssets: connectedAssets.length,
      criticalDependencies,
      connectedOpenVulns,
    },
    relationships,
    connectedAssets: connectedAssets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      criticality: asset.criticality,
      status: asset.status,
      vulnerabilityCount: asset._count.vulnerabilities,
    })),
  };
}
