import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTwoFactorSatisfied } from "@/lib/security/two-factor";

export interface SessionOrgContext {
  userId: string;
  organizationId: string;
  role: string;
}

export async function requireSessionWithOrg(): Promise<
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, organizationId: true, role: true },
  });

  if (!user?.organizationId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Organization context required" }, { status: 403 }),
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
