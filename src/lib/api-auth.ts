import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { isTwoFactorSatisfied } from "@/lib/security/two-factor";

export interface SessionOrgContext {
  userId: string;
  organizationId: string;
  role: string;
}

type RequireSessionOptions = {
  allowedRoles?: readonly string[];
  requireProductKey?: boolean;
};

export async function requireSessionWithOrg(
  _request: Request,
  options: RequireSessionOptions = {},
): Promise<
  { ok: true; context: SessionOrgContext } | { ok: false; response: NextResponse }
> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, organizationId: true, role: true },
  });

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!user?.organizationId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Organization context required. Contact an administrator." },
        { status: 403 },
      ),
    };
  }

  if (user.role?.toUpperCase() !== "MAIN_OFFICER" && !isTwoFactorSatisfied(session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Two-factor authentication required" }, { status: 403 }),
    };
  }

  if (options.allowedRoles && options.allowedRoles.length > 0 && !options.allowedRoles.includes(user.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden: insufficient role permissions" }, { status: 403 }),
    };
  }

  const shouldRequireProductKey = options.requireProductKey ?? true;
  if (shouldRequireProductKey && user.role?.toUpperCase() !== "MAIN_OFFICER") {
    const now = new Date();
    let activeProductKeyActivation: { id: string } | null = null;
    try {
      activeProductKeyActivation = await prisma.productKeyActivation.findFirst({
        where: {
          organizationId: user.organizationId,
          userId: user.id,
          productKey: {
            targetRole: user.role,
            revokedAt: null,
            expiresAt: {
              gt: now,
            },
          },
        },
        select: {
          id: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2021" || error.code === "P2022")
      ) {
        return {
          ok: false,
          response: NextResponse.json(
            {
              error:
                "Product key tables are missing. Run Prisma migrations before using protected routes.",
              migrationRequired: true,
            },
            { status: 503 },
          ),
        };
      }

      throw error;
    }

    if (!activeProductKeyActivation) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: `Product key required. Activate a valid key to use features. (Current Role: ${user.role})`,
            productKeyRequired: true,
            role: user.role,
          },
          { status: 403 },
        ),
      };
    }
  }

  return {
    ok: true,
    context: {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
    },
  };
}

export function requireMainOfficer(role: string) {
  if (role !== "MAIN_OFFICER") {
    return NextResponse.json({ error: "MAIN_OFFICER role required" }, { status: 403 });
  }

  return null;
}
