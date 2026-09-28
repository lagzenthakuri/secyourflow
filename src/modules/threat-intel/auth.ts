import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminTokenAuthorized, requireSessionWithOrg } from "@/lib/api-auth";

export interface ThreatIntelRequestContext {
  userId: string;
  organizationId: string;
  role: string;
  tokenAuthorized: boolean;
}

export { isAdminTokenAuthorized };

/**
 * Threat-intel routes accept either a normal session or, for the unattended
 * sync endpoints, the admin bearer token plus an explicit organization header.
 *
 * The session branch delegates to `requireSessionWithOrg`; it used to carry its
 * own copy of that logic, including the bug that attached an org-less user to
 * whichever organization happened to be first in the table.
 */
export async function requireThreatIntelContext(
  request: Request,
  options: { allowAdminToken?: boolean; requireMainOfficer?: boolean } = {},
): Promise<{ ok: true; context: ThreatIntelRequestContext } | { ok: false; response: NextResponse }> {
  if (options.allowAdminToken === true && isAdminTokenAuthorized(request)) {
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
        organizationId: org.id,
        role: "MAIN_OFFICER",
        tokenAuthorized: true,
      },
    };
  }

  const result = await requireSessionWithOrg(request, {
    allowedRoles: options.requireMainOfficer ? ["MAIN_OFFICER"] : undefined,
  });

  if (!result.ok) {
    return result;
  }

  return { ok: true, context: { ...result.context, tokenAuthorized: false } };
}
