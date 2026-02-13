import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import {
  decommissionAsset,
  logAssetLifecycleEvent,
  transferAssetEnvironment,
} from "@/lib/assets/lifecycle";

const schema = z.object({
  action: z.enum(["transfer", "decommission", "ownership_change", "reactivate"]),
  toEnvironment: z.enum(["PRODUCTION", "STAGING", "DEVELOPMENT", "TESTING", "DR"]).optional(),
  toOwner: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid lifecycle payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await params;
  const payload = parsed.data;
  const { organizationId, userId } = authResult.context;

  if (payload.action === "transfer") {
    if (!payload.toEnvironment) {
      return NextResponse.json({ error: "toEnvironment is required" }, { status: 400 });
    }

    const updated = await transferAssetEnvironment({
      organizationId,
      assetId: id,
      actorId: userId,
      toEnvironment: payload.toEnvironment,
      notes: payload.notes,
    });

    return NextResponse.json(updated);
  }

  if (payload.action === "decommission") {
    const updated = await decommissionAsset({
      organizationId,
      assetId: id,
      actorId: userId,
      notes: payload.notes,
    });

    return NextResponse.json(updated);
  }

  const asset = await prisma.asset.findFirst({
    where: { id, organizationId },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  if (payload.action === "ownership_change") {
    const updated = await prisma.asset.update({
      where: { id },
      data: { owner: payload.toOwner || null },
    });

    await logAssetLifecycleEvent({
      organizationId,
      assetId: id,
      actorId: userId,
      eventType: "OWNERSHIP_CHANGED",
      fromOwner: asset.owner || undefined,
      toOwner: payload.toOwner,
      notes: payload.notes,
    });

    return NextResponse.json(updated);
  }

  // reactivate
  const updated = await prisma.asset.update({
    where: { id },
    data: { status: "ACTIVE" },
  });

  await logAssetLifecycleEvent({
    organizationId,
    assetId: id,
    actorId: userId,
    eventType: "REACTIVATED",
    notes: payload.notes,
  });

  return NextResponse.json(updated);
}
