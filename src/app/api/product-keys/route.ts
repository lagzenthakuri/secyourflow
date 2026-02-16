import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  generateProductKeyCode,
  hashProductKey,
  PRODUCT_KEY_ELIGIBLE_ROLES,
} from "@/lib/product-keys";

const createProductKeySchema = z.object({
  targetRole: z.enum(PRODUCT_KEY_ELIGIBLE_ROLES),
  expiresAt: z.string().datetime(),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireSessionWithOrg(request, { requireProductKey: false });
    if (!authResult.ok) return authResult.response;

    const { organizationId, userId, role } = authResult.context;
    const now = new Date();

    if (role === "MAIN_OFFICER") {
      const keys = await prisma.productKey.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          codePrefix: true,
          targetRole: true,
          expiresAt: true,
          revokedAt: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              activations: true,
            },
          },
        },
      });

      return NextResponse.json({
        mode: "MAIN_OFFICER",
        keys: keys.map((key) => ({
          ...key,
          activationCount: key._count.activations,
          isExpired: key.expiresAt <= now,
        })),
      });
    }

    const activeActivation = await prisma.productKeyActivation.findFirst({
      where: {
        organizationId,
        userId,
        productKey: {
          targetRole: role as Role,
          revokedAt: null,
          expiresAt: { gt: now },
        },
      },
      orderBy: { activatedAt: "desc" },
      select: {
        activatedAt: true,
        productKey: {
          select: {
            id: true,
            codePrefix: true,
            expiresAt: true,
            targetRole: true,
          },
        },
      },
    });

    return NextResponse.json({
      mode: "USER",
      role,
      isActive: Boolean(activeActivation),
      activation: activeActivation,
    });
  } catch (error: any) {
    console.error("GET /api/product-keys error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error?.message || String(error),
        stack: error?.stack
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireSessionWithOrg(request, {
      allowedRoles: ["MAIN_OFFICER"],
      requireProductKey: false,
    });
    if (!authResult.ok) return authResult.response;

    const payload = createProductKeySchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const expiresAt = new Date(payload.data.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      return NextResponse.json({ error: "Expiry date must be in the future" }, { status: 400 });
    }

    const productKey = generateProductKeyCode();
    const codeHash = hashProductKey(productKey);
    const codePrefix = productKey.slice(0, 8);

    const created = await prisma.productKey.create({
      data: {
        organizationId: authResult.context.organizationId,
        createdById: authResult.context.userId,
        codeHash,
        codePrefix,
        targetRole: payload.data.targetRole,
        expiresAt,
      },
      select: {
        id: true,
        codePrefix: true,
        targetRole: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    console.log("POST /api/product-keys created:", created);

    return NextResponse.json({
      ...created,
      productKey,
    });
  } catch (error: any) {
    console.error("POST /api/product-keys error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error?.message || String(error),
        stack: error?.stack
      },
      { status: 500 }
    );
  }
}
