import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isTwoFactorSatisfied } from "@/lib/security/two-factor";

/**
 * Role sets for the tenant-scoped routes.
 *
 * MAIN_OFFICER — executive oversight, full access.
 * IT_OFFICER   — asset and infrastructure management.
 * PENTESTER    — vulnerability assessment.
 * ANALYST      — risk analysis and reporting.
 */
export const ROLE_ALL = ["MAIN_OFFICER", "IT_OFFICER", "PENTESTER", "ANALYST"] as const;
/** Can create and edit findings. */
export const ROLE_VULNERABILITY_WRITE = ["MAIN_OFFICER", "IT_OFFICER", "PENTESTER"] as const;
/** Can destroy findings. Deliberately narrower than write. */
export const ROLE_VULNERABILITY_DELETE = ["MAIN_OFFICER", "IT_OFFICER"] as const;

export interface SessionOrgContext {
  userId: string;
  organizationId: string;
  role: string;
}

type RequireSessionOptions = {
  allowedRoles?: readonly string[];
};

export type AuthResult =
  | { ok: true; context: SessionOrgContext }
  | { ok: false; response: NextResponse };

type AuthFailure = { ok: false; response: NextResponse };

function unauthorized(): AuthFailure {
  return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
}

function forbidden(error: string): AuthFailure {
  return { ok: false, response: NextResponse.json({ error }, { status: 403 }) };
}

/**
 * Resolves the caller's organization and role for a tenant-scoped API route.
 *
 * A user with no organization is rejected. An earlier version attached such
 * users to `organization.findFirst()` — the first organization in the table —
 * and persisted it, which silently granted them full read/write access to a
 * stranger's tenant. Organizations are provisioned at registration and at
 * invitation acceptance; nowhere else.
 */
export async function requireSessionWithOrg(
  _request: Request,
  options: RequireSessionOptions = {},
): Promise<AuthResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorized();
  }

  // The JWT callback re-reads the user row on every request and puts the
  // organization and role on the session, so no second query is needed here.
  const { id: userId, organizationId, role } = session.user;

  if (!organizationId) {
    return forbidden("Organization context required");
  }

  const effectiveRole = role || "ANALYST";

  if (effectiveRole.toUpperCase() !== "MAIN_OFFICER" && !isTwoFactorSatisfied(session)) {
    return forbidden("Two-factor authentication required");
  }

  if (options.allowedRoles?.length && !options.allowedRoles.includes(effectiveRole)) {
    return forbidden("Forbidden: insufficient role permissions");
  }

  return { ok: true, context: { userId, organizationId, role: effectiveRole } };
}

export function requireMainOfficer(role: string) {
  if (role !== "MAIN_OFFICER") {
    return NextResponse.json({ error: "MAIN_OFFICER role required" }, { status: 403 });
  }

  return null;
}

/**
 * Bearer-token authentication for the unattended automation endpoints
 * (ingestion, threat-intel sync, scheduled assessments).
 *
 * Single definition: this was previously copy-pasted into
 * `modules/threat-intel/auth.ts` and two compliance routes.
 */
export function isAdminTokenAuthorized(request: Request): boolean {
  const adminToken = process.env.ADMIN_API_TOKEN;
  if (!adminToken) {
    return false;
  }

  const header = request.headers.get("authorization");
  if (!header) {
    return false;
  }

  return timingSafeEqualString(header, `Bearer ${adminToken}`);
}

/** Constant-time string compare, so the token is not discoverable by timing. */
function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return mismatch === 0;
}

export interface AutomationContext {
  /** True when the caller authenticated with ADMIN_API_TOKEN rather than a session. */
  tokenAuthorized: boolean;
  userId: string | null;
  /**
   * The tenant to operate on. `null` means "every tenant" and is only ever
   * reachable via the admin token with no explicit organizationId — never from
   * a user session.
   */
  organizationId: string | null;
}

/**
 * Shared gate for the unattended automation endpoints, which accept either the
 * admin bearer token or a MAIN_OFFICER session.
 *
 * A session caller is always pinned to their own organization; asking for a
 * different one is a 403 rather than being silently ignored.
 */
export async function requireAutomationContext(
  request: Request,
  requestedOrganizationId?: string,
): Promise<{ ok: true; context: AutomationContext } | { ok: false; response: NextResponse }> {
  const requested = requestedOrganizationId?.trim() || undefined;

  if (isAdminTokenAuthorized(request)) {
    return {
      ok: true,
      context: { tokenAuthorized: true, userId: null, organizationId: requested ?? null },
    };
  }

  const result = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER"] });
  if (!result.ok) {
    return { ok: false, response: result.response };
  }

  if (requested && requested !== result.context.organizationId) {
    return forbidden("Forbidden: cross-organization execution is not allowed");
  }

  return {
    ok: true,
    context: {
      tokenAuthorized: false,
      userId: result.context.userId,
      organizationId: result.context.organizationId,
    },
  };
}
