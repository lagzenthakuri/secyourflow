import { NextRequest, NextResponse } from "next/server";
import {
  runAutomatedFrameworkAssessment,
  runScheduledComplianceAssessments,
} from "@/lib/compliance-engine";
import { auth } from "@/lib/auth";
import { isTwoFactorSatisfied } from "@/lib/security/two-factor";

function isAdminTokenAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const adminToken = process.env.ADMIN_API_TOKEN;
  if (!adminToken) {
    return false;
  }

  return authHeader === `Bearer ${adminToken}`;
}

export async function POST(request: NextRequest) {
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
    const body = (await request.json().catch(() => ({}))) as {
      frameworkId?: string;
      reason?: string;
      organizationId?: string;
    };

    if (body.frameworkId) {
      const result = await runAutomatedFrameworkAssessment(body.frameworkId, {
        reason: body.reason ?? "api-manual-trigger",
      });
      return NextResponse.json({ mode: "framework", ...result });
    }

    const result = await runScheduledComplianceAssessments({
      organizationId: body.organizationId,
    });

    return NextResponse.json({ mode: "scheduled", ...result });
  } catch (error) {
    console.error("Compliance assessment run failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run assessments" },
      { status: 500 },
    );
  }
}
