import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { hashProductKey } from "@/lib/product-keys";

const activateSchema = z.object({
  productKey: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request, { requireProductKey: false });
  if (!authResult.ok) return authResult.response;

  if (authResult.context.role === "MAIN_OFFICER") {
    return NextResponse.json(
      { error: "MAIN_OFFICER does not require product key activation" },
      { status: 400 },
    );
  }

  const payload = activateSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const keyHash = hashProductKey(payload.data.productKey);
  const now = new Date();

  const matchingKey = await prisma.productKey.findFirst({
    where: {
      organizationId: authResult.context.organizationId,
      codeHash: keyHash,
      targetRole: authResult.context.role as Role,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    select: {
      id: true,
      expiresAt: true,
      targetRole: true,
      codePrefix: true,
    },
  });

  if (!matchingKey) {
    return NextResponse.json(
      {
        error:
          "Invalid key for your role, expired key, or key not issued for your organization.",
      },
      { status: 400 },
    );
  }

  await prisma.productKeyActivation.upsert({
    where: {
      productKeyId_userId: {
        productKeyId: matchingKey.id,
        userId: authResult.context.userId,
      },
    },
    update: {
      activatedAt: now,
    },
    create: {
      organizationId: authResult.context.organizationId,
      productKeyId: matchingKey.id,
      userId: authResult.context.userId,
      activatedAt: now,
    },
  });

  return NextResponse.json({
    success: true,
    activation: {
      productKeyId: matchingKey.id,
      codePrefix: matchingKey.codePrefix,
      targetRole: matchingKey.targetRole,
      expiresAt: matchingKey.expiresAt,
      activatedAt: now.toISOString(),
    },
  });
}
