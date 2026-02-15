import { NextRequest, NextResponse } from "next/server";
import {
  runAutomatedFrameworkAssessment,
  runScheduledComplianceAssessments,
} from "@/lib/compliance-engine";
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

export async function POST(request: NextRequest) {
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
    const body = (await request.json().catch(() => ({}))) as {
      frameworkId?: string;
      reason?: string;
      organizationId?: string;
    };

    if (!tokenAuthorized && body.organizationId && body.organizationId !== sessionOrganizationId) {
      return NextResponse.json({ error: "Forbidden: cross-organization execution is not allowed" }, { status: 403 });
    }

    if (body.frameworkId) {
      if (tokenAuthorized) {
        const framework = await prisma.complianceFramework.findUnique({
          where: { id: body.frameworkId },
          select: { id: true, organizationId: true },
        });
        if (!framework) {
          return NextResponse.json({ error: "Framework not found" }, { status: 404 });
        }

        if (body.organizationId && body.organizationId !== framework.organizationId) {
          return NextResponse.json(
            { error: "frameworkId does not belong to the provided organizationId" },
            { status: 400 },
          );
        }
      } else {
        const framework = await prisma.complianceFramework.findFirst({
          where: {
            id: body.frameworkId,
            organizationId: sessionOrganizationId ?? undefined,
          },
          select: { id: true },
        });
        if (!framework) {
          return NextResponse.json({ error: "Framework not found" }, { status: 404 });
        }
      }

      const result = await runAutomatedFrameworkAssessment(body.frameworkId, {
        reason: body.reason ?? "api-manual-trigger",
      });
      return NextResponse.json({ mode: "framework", ...result });
    }

    const targetOrganizationId = tokenAuthorized ? body.organizationId : (sessionOrganizationId ?? undefined);
    const result = await runScheduledComplianceAssessments({
      organizationId: targetOrganizationId,
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
