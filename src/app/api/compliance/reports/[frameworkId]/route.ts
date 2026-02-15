import { NextResponse } from "next/server";
import { buildComplianceFrameworkReport } from "@/lib/compliance-reporting";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ frameworkId: string }> },
) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  try {
    const { frameworkId } = await params;
    const framework = await prisma.complianceFramework.findFirst({
      where: {
        id: frameworkId,
        organizationId: authResult.context.organizationId,
      },
      select: { id: true },
    });

    if (!framework) {
      return NextResponse.json({ error: "Framework not found" }, { status: 404 });
    }

    const report = await buildComplianceFrameworkReport(frameworkId);
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate compliance report" },
      { status: 500 },
    );
  }
}
