import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isTwoFactorSatisfied } from "@/lib/security/two-factor";
import { ThreatIntelRepository } from "./persistence/repository";
import { prisma } from "@/lib/prisma";

export interface ThreatIntelRequestContext {
  userId: string;
  organizationId: string;
  role: string;
  tokenAuthorized: boolean;
}

export function isAdminTokenAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const adminToken = process.env.ADMIN_API_TOKEN;
  if (!adminToken) {
    return false;
  }

  return authHeader === `Bearer ${adminToken}`;
}

export async function requireThreatIntelContext(
  request: Request,
  options: { allowAdminToken?: boolean; requireMainOfficer?: boolean } = {},
): Promise<{ ok: true; context: ThreatIntelRequestContext } | { ok: false; response: NextResponse }> {
  const tokenAuthorized = options.allowAdminToken === true && isAdminTokenAuthorized(request);

  if (tokenAuthorized) {
    const orgId = request.headers.get("x-secyourflow-org-id") || request.headers.get("x-org-id");
    if (!orgId) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "x-secyourflow-org-id header is required for token-based threat intel access" },
          { status: 400 },
        ),
      };
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true },
    });
    if (!org) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Invalid organization context" }, { status: 403 }),
      };
    }

    return {
      ok: true,
      context: {
        userId: "SYSTEM",
        organizationId: orgId,
        role: "MAIN_OFFICER",
        tokenAuthorized: true,
      },
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

  const role = session.user.role ?? "ANALYST";
  if (options.requireMainOfficer && role !== "MAIN_OFFICER") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const repository = new ThreatIntelRepository();
  const organizationId = await repository.getUserOrganizationId(session.user.id);

  if (!organizationId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Organization not found" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    context: {
      userId: session.user.id,
      organizationId,
      role,
      tokenAuthorized: false,
    },
  };
}
