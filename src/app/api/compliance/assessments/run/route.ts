import { NextRequest, NextResponse } from "next/server";
import {
  runAutomatedFrameworkAssessment,
  runScheduledComplianceAssessments,
} from "@/lib/compliance-engine";
import { prisma } from "@/lib/prisma";
import { requireAutomationContext } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    frameworkId?: string;
    reason?: string;
    organizationId?: string;
  };

  const authResult = await requireAutomationContext(request, body.organizationId);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { organizationId } = authResult.context;

  try {
    if (body.frameworkId) {
      // A framework run always needs a concrete tenant. When the admin token is
      // used without one, derive it from the framework itself.
      const framework = await prisma.complianceFramework.findFirst({
        where: {
          id: body.frameworkId,
          ...(organizationId ? { organizationId } : {}),
        },
        select: { id: true, organizationId: true },
      });

      if (!framework) {
        return NextResponse.json({ error: "Framework not found" }, { status: 404 });
      }

      const result = await runAutomatedFrameworkAssessment(framework.id, {
        organizationId: framework.organizationId,
        reason: body.reason ?? "api-manual-trigger",
      });

      return NextResponse.json({ mode: "framework", ...result });
    }

    if (organizationId) {
      const result = await runScheduledComplianceAssessments({ organizationId });
      return NextResponse.json({ mode: "scheduled", ...result });
    }

    // Admin token, no organization: an explicit every-tenant sweep.
    const organizations = await prisma.organization.findMany({ select: { id: true } });
    const totals = { scannedControls: 0, assessedControls: 0, failedControls: 0, snapshotsCreated: 0 };

    for (const organization of organizations) {
      const result = await runScheduledComplianceAssessments({ organizationId: organization.id });
      totals.scannedControls += result.scannedControls;
      totals.assessedControls += result.assessedControls;
      totals.failedControls += result.failedControls;
      totals.snapshotsCreated += result.snapshotsCreated;
    }

    return NextResponse.json({
      mode: "scheduled-all-organizations",
      organizationsScanned: organizations.length,
      ...totals,
    });
  } catch (error) {
    console.error("Compliance assessment run failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run assessments" },
      { status: 500 },
    );
  }
}
