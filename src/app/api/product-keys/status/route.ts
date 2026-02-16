import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request, { requireProductKey: false });
  if (!authResult.ok) return authResult.response;

  if (authResult.context.role === "MAIN_OFFICER") {
    return NextResponse.json({
      role: authResult.context.role,
      isActive: true,
      bypassed: true,
    });
  }

  const now = new Date();
  const activation = await prisma.productKeyActivation.findFirst({
    where: {
      organizationId: authResult.context.organizationId,
      userId: authResult.context.userId,
      productKey: {
        targetRole: authResult.context.role as Role,
        revokedAt: null,
        expiresAt: { gt: now },
      },
    },
    orderBy: { activatedAt: "desc" },
    select: {
      activatedAt: true,
      productKey: {
        select: {
          codePrefix: true,
          targetRole: true,
          expiresAt: true,
        },
      },
    },
  });

  return NextResponse.json({
    role: authResult.context.role,
    isActive: Boolean(activation),
    activation,
  });
}
