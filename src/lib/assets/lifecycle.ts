import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { Environment, LifecycleEventType } from "@prisma/client";

function toNullableJsonValue(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
}

export async function logAssetLifecycleEvent(params: {
  organizationId: string;
  assetId: string;
  actorId?: string;
  eventType: LifecycleEventType;
  fromEnvironment?: Environment;
  toEnvironment?: Environment;
  fromOwner?: string;
  toOwner?: string;
  notes?: string;
}) {
  return prisma.assetLifecycleEvent.create({
    data: params,
  });
}

export async function logAssetChange(params: {
  organizationId: string;
  assetId: string;
  changedById?: string;
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  return prisma.assetChangeLog.create({
    data: {
      organizationId: params.organizationId,
      assetId: params.assetId,
      changedById: params.changedById,
      field: params.field,
      oldValue: toNullableJsonValue(params.oldValue),
      newValue: toNullableJsonValue(params.newValue),
    },
  });
}

export async function transferAssetEnvironment(params: {
  organizationId: string;
  assetId: string;
  actorId?: string;
  toEnvironment: Environment;
  notes?: string;
}) {
  const asset = await prisma.asset.findFirst({
    where: { id: params.assetId, organizationId: params.organizationId },
  });

  if (!asset) {
    throw new Error("Asset not found");
  }

  const updated = await prisma.asset.update({
    where: { id: asset.id },
    data: {
      environment: params.toEnvironment,
    },
  });

  await logAssetLifecycleEvent({
    organizationId: params.organizationId,
    assetId: asset.id,
    actorId: params.actorId,
    eventType: "TRANSFERRED",
    fromEnvironment: asset.environment,
    toEnvironment: params.toEnvironment,
    notes: params.notes,
  });

  await logAssetChange({
    organizationId: params.organizationId,
    assetId: asset.id,
    changedById: params.actorId,
    field: "environment",
    oldValue: asset.environment,
    newValue: params.toEnvironment,
  });

  return updated;
}

export async function decommissionAsset(params: {
  organizationId: string;
  assetId: string;
  actorId?: string;
  notes?: string;
}) {
  const asset = await prisma.asset.findFirst({
    where: { id: params.assetId, organizationId: params.organizationId },
  });

  if (!asset) {
    throw new Error("Asset not found");
  }

  const updated = await prisma.asset.update({
    where: { id: asset.id },
    data: {
      status: "DECOMMISSIONED",
    },
  });

  await logAssetLifecycleEvent({
    organizationId: params.organizationId,
    assetId: asset.id,
    actorId: params.actorId,
    eventType: "DECOMMISSIONED",
    fromOwner: asset.owner || undefined,
    notes: params.notes,
  });

  await logAssetChange({
    organizationId: params.organizationId,
    assetId: asset.id,
    changedById: params.actorId,
    field: "status",
    oldValue: asset.status,
    newValue: "DECOMMISSIONED",
  });

  return updated;
}
