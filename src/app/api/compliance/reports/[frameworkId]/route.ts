import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildComplianceFrameworkReport } from "@/lib/compliance-reporting";
import { requireApiAuth } from "@/lib/security/api-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ frameworkId: string }> },
) {
  void request;
  const authResult = await requireApiAuth();
  if ("response" in authResult) {
    return authResult.response;
  }

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
  } catch {
    return NextResponse.json(
      { error: "Failed to generate compliance report" },
      { status: 500 },
    );
  }
}
