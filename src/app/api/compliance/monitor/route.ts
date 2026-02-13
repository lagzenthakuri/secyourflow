import { NextResponse } from "next/server";
import { runContinuousComplianceAudit } from "@/lib/evidence-engine";
import { auth } from "@/lib/auth";
import { requireTrustedOriginForSessionMutation } from "@/lib/security/csrf";
import { isTwoFactorSatisfied } from "@/lib/security/two-factor";

function isAdminTokenAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const adminToken = process.env.ADMIN_API_TOKEN;
  if (!adminToken) {
    return false;
  }

  return authHeader === `Bearer ${adminToken}`;
}

export async function POST(request: Request) {
  const originGuardResponse = requireTrustedOriginForSessionMutation(request);
  if (originGuardResponse) {
    return originGuardResponse;
  }

  if (!isAdminTokenAuthorized(request)) {
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
  }

  try {
    const summary = await runContinuousComplianceAudit();
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
