import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildComplianceFrameworkReport,
  generateComplianceReportPdf,
} from "@/lib/compliance-reporting";
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
    const pdf = generateComplianceReportPdf(report);

    const fileNameSafeFramework = report.frameworkName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const datePart = new Date().toISOString().split("T")[0];

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${fileNameSafeFramework}_Compliance_${datePart}.pdf\"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate compliance PDF" },
      { status: 500 },
    );
  }
}
