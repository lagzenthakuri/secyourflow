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

function hasValidAuthorizationHeader(request: Request): boolean {
  const authorizationHeader = request.headers.get("authorization");
  if (!authorizationHeader) {
    return false;
  }

  const [scheme, token] = authorizationHeader.split(/\s+/, 2);
  return scheme === "Bearer" && typeof token === "string" && token.trim().length > 0;
}

export async function requireSessionWithOrg(
  request: Request,
  options: RequireSessionOptions = {},
): Promise<
  { ok: true; context: SessionOrgContext } | { ok: false; response: NextResponse }
> {
  if (!hasValidAuthorizationHeader(request)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Authorization header required" }, { status: 401 }),
    };
  }

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
