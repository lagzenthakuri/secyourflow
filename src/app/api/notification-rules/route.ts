import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";

const createRuleSchema = z.object({
  name: z.string().min(2).max(180),
  channel: z.literal("IN_APP"),
  eventType: z.string().min(2).max(120),
  minimumSeverity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"]).optional(),
  includeExploited: z.boolean().default(false),
  includeKev: z.boolean().default(false),
  recipients: z.array(z.string().email()).default([]),
  isActive: z.boolean().default(true),
});

const patchRuleSchema = createRuleSchema.partial().extend({
  id: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  const data = await prisma.notificationRule.findMany({
    where: {
      organizationId: authResult.context.organizationId,
      userId: authResult.context.userId,
      channel: "IN_APP",
    },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  const parsed = createRuleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid notification rule payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const created = await prisma.notificationRule.create({
    data: {
      organizationId: authResult.context.organizationId,
      userId: authResult.context.userId,
      ...parsed.data,
    },
  });

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  const parsed = patchRuleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid notification rule update payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id, ...update } = parsed.data;

  const existing = await prisma.notificationRule.findFirst({
    where: {
      id,
      organizationId: authResult.context.organizationId,
      userId: authResult.context.userId,
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  const updated = await prisma.notificationRule.update({
    where: { id },
    data: update,
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const existing = await prisma.notificationRule.findFirst({
    where: {
      id,
      organizationId: authResult.context.organizationId,
      userId: authResult.context.userId,
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  await prisma.notificationRule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
