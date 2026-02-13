import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTwoFactorSatisfied } from "@/lib/security/two-factor";

export interface SessionOrgContext {
  userId: string;
  organizationId: string;
  role: string;
}

type RequireSessionOptions = {
  allowedRoles?: readonly string[];
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

  if (!isTwoFactorSatisfied(session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Two-factor authentication required" }, { status: 403 }),
    };
  }

  let user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, organizationId: true, role: true },
  });

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!user.organizationId) {
    const firstOrg = await prisma.organization.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    const organizationId =
      firstOrg?.id ??
      (
        await prisma.organization.create({
          data: { name: "My Organization" },
          select: { id: true },
        })
      ).id;

    user = await prisma.user.update({
      where: { id: user.id },
      data: { organizationId },
      select: { id: true, organizationId: true, role: true },
    });
  }

  if (!user?.organizationId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Organization context required" }, { status: 403 }),
    };
  }

  if (options.allowedRoles && options.allowedRoles.length > 0 && !options.allowedRoles.includes(user.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden: insufficient role permissions" }, { status: 403 }),
    };
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
