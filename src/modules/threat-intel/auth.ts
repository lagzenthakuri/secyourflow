import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireTrustedOriginForSessionMutation } from "@/lib/security/csrf";
import { isTwoFactorSatisfied } from "@/lib/security/two-factor";
import { ThreatIntelRepository } from "./persistence/repository";

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

function extractTokenAuthorizedOrganizationId(request: Request): string | null {
  const headerOrgId = request.headers.get("x-organization-id");
  if (headerOrgId && headerOrgId.trim()) {
    return headerOrgId.trim();
  }

  const queryOrgId = new URL(request.url).searchParams.get("organizationId");
  if (queryOrgId && queryOrgId.trim()) {
    return queryOrgId.trim();
  }

  return null;
}

export async function requireThreatIntelContext(
  request: Request,
  options: { allowAdminToken?: boolean; requireMainOfficer?: boolean } = {},
): Promise<{ ok: true; context: ThreatIntelRequestContext } | { ok: false; response: NextResponse }> {
  const originGuardResponse = requireTrustedOriginForSessionMutation(request);
  if (originGuardResponse) {
    return { ok: false, response: originGuardResponse };
  }

  const tokenAuthorized = options.allowAdminToken === true && isAdminTokenAuthorized(request);

  if (tokenAuthorized) {
    const organizationId = extractTokenAuthorizedOrganizationId(request);
    if (!organizationId) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "organizationId is required for token-authorized threat intel requests" },
          { status: 400 },
        ),
      };
    }

    const repository = new ThreatIntelRepository();
    const org = await repository.getOrganizationById(organizationId);
    if (!org) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Organization not found" }, { status: 404 }),
      };
    }

    return {
      ok: true,
      context: {
        userId: "SYSTEM",
        organizationId,
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
