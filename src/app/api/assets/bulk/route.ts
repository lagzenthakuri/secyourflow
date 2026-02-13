import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";

const schema = z.object({
  assetIds: z.array(z.string()).min(1),
  operation: z.enum(["set_status", "set_owner", "set_tags"]),
  status: z.enum(["ACTIVE", "INACTIVE", "DECOMMISSIONED", "MAINTENANCE"]).optional(),
  owner: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid bulk payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { organizationId } = authResult.context;
  const payload = parsed.data;

  const assets = await prisma.asset.findMany({
    where: {
      organizationId,
      id: { in: payload.assetIds },
    },
    select: { id: true },
  });

  const ids = assets.map((asset) => asset.id);

  if (ids.length === 0) {
    return NextResponse.json({ error: "No matching assets" }, { status: 404 });
  }

  if (payload.operation === "set_status") {
    if (!payload.status) {
      return NextResponse.json({ error: "status is required" }, { status: 400 });
    }

    const result = await prisma.asset.updateMany({
      where: { id: { in: ids } },
      data: { status: payload.status },
    });

    return NextResponse.json({ updated: result.count });
  }

  if (payload.operation === "set_owner") {
    const result = await prisma.asset.updateMany({
      where: { id: { in: ids } },
      data: { owner: payload.owner || null },
    });

    return NextResponse.json({ updated: result.count });
  }

  if (!payload.tags) {
    return NextResponse.json({ error: "tags are required" }, { status: 400 });
  }

  await prisma.$transaction(
    ids.map((id) =>
      prisma.asset.update({
        where: { id },
        data: { tags: payload.tags || [] },
      }),
    ),
  );

  return NextResponse.json({ updated: ids.length });
}
