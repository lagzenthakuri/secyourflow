import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireTrustedOriginForSessionMutation } from "@/lib/security/csrf";
import { isTwoFactorSatisfied } from "@/lib/security/two-factor";

type AuthFailure = { response: NextResponse };

export type ApiAuthContext = {
  userId: string;
  role: Role;
  organizationId: string;
};

type ApiAuthSuccess = { context: ApiAuthContext };

const ROLE_VALUES = new Set<Role>(Object.values(Role));

export async function requireApiAuth(options?: {
  allowedRoles?: Role[];
  requireTwoFactor?: boolean;
  request?: Request;
}): Promise<ApiAuthSuccess | AuthFailure> {
  const allowedRoles = options?.allowedRoles;
  const requireTwoFactor = options?.requireTwoFactor ?? true;
  const request = options?.request;

  if (request) {
    const originGuardResponse = requireTrustedOriginForSessionMutation(request);
    if (originGuardResponse) {
      return { response: originGuardResponse };
    }
  }

  const session = await auth();
  if (!session?.user?.id) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (requireTwoFactor && !isTwoFactorSatisfied(session)) {
    return {
      response: NextResponse.json(
        { error: "Two-factor authentication required" },
        { status: 403 },
      ),
    };
  }

  const normalizedRole =
    typeof session.user.role === "string" && ROLE_VALUES.has(session.user.role as Role)
      ? (session.user.role as Role)
      : Role.ANALYST;

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(normalizedRole)) {
    return {
      response: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true },
  });

  if (!user?.organizationId) {
    return {
      response: NextResponse.json({ error: "User organization not found" }, { status: 403 }),
    };
  }

  return {
    context: {
      userId: session.user.id,
      role: normalizedRole,
      organizationId: user.organizationId,
    },
  };
}

export async function requireApiAuthWithoutOrg(options?: {
  allowedRoles?: Role[];
  requireTwoFactor?: boolean;
  request?: Request;
}): Promise<{ userId: string; role: Role } | AuthFailure> {
  const allowedRoles = options?.allowedRoles;
  const requireTwoFactor = options?.requireTwoFactor ?? true;
  const request = options?.request;

  if (request) {
    const originGuardResponse = requireTrustedOriginForSessionMutation(request);
    if (originGuardResponse) {
      return { response: originGuardResponse };
    }
  }

  const session = await auth();
  if (!session?.user?.id) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (requireTwoFactor && !isTwoFactorSatisfied(session)) {
    return {
      response: NextResponse.json(
        { error: "Two-factor authentication required" },
        { status: 403 },
      ),
    };
  }

  const normalizedRole =
    typeof session.user.role === "string" && ROLE_VALUES.has(session.user.role as Role)
      ? (session.user.role as Role)
      : Role.ANALYST;

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(normalizedRole)) {
    return {
      response: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }),
    };
  }

  return { userId: session.user.id, role: normalizedRole };
}
