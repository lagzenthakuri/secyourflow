import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import type { Prisma, Role } from "@prisma/client";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  layout: z.record(z.string(), z.unknown()),
  isDefault: z.boolean().default(false),
  shares: z
    .array(
      z.object({
        sharedWithUserId: z.string().optional(),
        sharedWithRole: z.enum(["IT_OFFICER", "PENTESTER", "ANALYST", "MAIN_OFFICER"]).optional(),
        canEdit: z.boolean().default(false),
      }),
    )
    .optional(),
});

const patchSchema = createSchema.partial().extend({
  id: z.string().min(1),
});

export async function GET() {
  const authResult = await requireSessionWithOrg();
  if (!authResult.ok) return authResult.response;

  const data = await prisma.dashboardView.findMany({
    where: {
      organizationId: authResult.context.organizationId,
      OR: [
        { userId: authResult.context.userId },
        {
          shares: {
            some: {
              OR: [
                { sharedWithUserId: authResult.context.userId },
                { sharedWithRole: authResult.context.role as Role },
              ],
            },
          },
        },
      ],
    },
    include: {
      shares: true,
    },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const authResult = await requireSessionWithOrg();
  if (!authResult.ok) return authResult.response;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid dashboard view payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { organizationId, userId } = authResult.context;

  if (parsed.data.isDefault) {
    await prisma.dashboardView.updateMany({
      where: { organizationId, userId },
      data: { isDefault: false },
    });
  }

  const created = await prisma.dashboardView.create({
    data: {
      organizationId,
      userId,
      name: parsed.data.name,
      layout: parsed.data.layout as Prisma.InputJsonValue,
      isDefault: parsed.data.isDefault,
      shares: parsed.data.shares?.length
        ? {
            createMany: {
              data: parsed.data.shares.map((share) => ({
                organizationId,
                sharedWithUserId: share.sharedWithUserId,
                sharedWithRole: share.sharedWithRole,
                canEdit: share.canEdit,
              })),
            },
          }
        : undefined,
    },
    include: { shares: true },
  });

  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireSessionWithOrg();
  if (!authResult.ok) return authResult.response;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid dashboard view update payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id, shares, ...rest } = parsed.data;
  const updateData: Prisma.DashboardViewUpdateInput = {};

  if (rest.name !== undefined) {
    updateData.name = rest.name;
  }
  if (rest.layout !== undefined) {
    updateData.layout = rest.layout as Prisma.InputJsonValue;
  }
  if (rest.isDefault !== undefined) {
    updateData.isDefault = rest.isDefault;
  }

  const view = await prisma.dashboardView.findFirst({
    where: {
      id,
      organizationId: authResult.context.organizationId,
      userId: authResult.context.userId,
    },
    select: { id: true },
  });

  if (!view) {
    return NextResponse.json({ error: "Dashboard view not found" }, { status: 404 });
  }

  if (rest.isDefault) {
    await prisma.dashboardView.updateMany({
      where: {
        organizationId: authResult.context.organizationId,
        userId: authResult.context.userId,
      },
      data: { isDefault: false },
    });
  }

  if (shares) {
    await prisma.dashboardViewShare.deleteMany({ where: { dashboardViewId: id } });

    if (shares.length) {
      await prisma.dashboardViewShare.createMany({
        data: shares.map((share) => ({
          dashboardViewId: id,
          organizationId: authResult.context.organizationId,
          sharedWithUserId: share.sharedWithUserId,
          sharedWithRole: share.sharedWithRole,
          canEdit: share.canEdit,
        })),
        skipDuplicates: true,
      });
    }
  }

  const updated = await prisma.dashboardView.update({
    where: { id },
    data: updateData,
    include: { shares: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireSessionWithOrg();
  if (!authResult.ok) return authResult.response;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const view = await prisma.dashboardView.findFirst({
    where: {
      id,
      organizationId: authResult.context.organizationId,
      userId: authResult.context.userId,
    },
    select: { id: true },
  });

  if (!view) {
    return NextResponse.json({ error: "Dashboard view not found" }, { status: 404 });
  }

  await prisma.dashboardView.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
