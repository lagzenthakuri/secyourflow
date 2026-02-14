import { NextResponse } from "next/server";
import { runContinuousComplianceAudit } from "@/lib/evidence-engine";
import { auth } from "@/lib/auth";
import { isTwoFactorSatisfied } from "@/lib/security/two-factor";
import { prisma } from "@/lib/prisma";

function isAdminTokenAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const adminToken = process.env.ADMIN_API_TOKEN;
  if (!adminToken) {
    return false;
  }

  return authHeader === `Bearer ${adminToken}`;
}

export async function POST(request: Request) {
  const tokenAuthorized = isAdminTokenAuthorized(request);
  let sessionOrganizationId: string | null = null;

  if (!tokenAuthorized) {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isTwoFactorSatisfied(session)) {
      return NextResponse.json({ error: "Two-factor authentication required" }, { status: 403 });
    }

    if (session.user.role !== "MAIN_OFFICER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "Organization context required" }, { status: 403 });
    }

    sessionOrganizationId = user.organizationId;
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { organizationId?: string };
    const requestedOrganizationId =
      typeof body.organizationId === "string" && body.organizationId.trim().length > 0
        ? body.organizationId.trim()
        : undefined;

    if (
      !tokenAuthorized &&
      requestedOrganizationId &&
      requestedOrganizationId !== sessionOrganizationId
    ) {
      return NextResponse.json({ error: "Forbidden: cross-organization execution is not allowed" }, { status: 403 });
    }

    const summary = await runContinuousComplianceAudit({
      organizationId: tokenAuthorized ? requestedOrganizationId : (sessionOrganizationId ?? undefined),
    });
    return NextResponse.json({
      message: "Compliance monitoring completed.",
      summary,
    });
  } catch (error) {
    console.error("Compliance Monitor Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run monitoring" },
      { status: 500 },
    );
  }
}
