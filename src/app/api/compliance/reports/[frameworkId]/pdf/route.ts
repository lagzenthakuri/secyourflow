import { NextResponse } from "next/server";
import {
  buildComplianceFrameworkReport,
  generateComplianceReportPdf,
} from "@/lib/compliance-reporting";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ frameworkId: string }> },
) {
  void request;
  try {
    const { frameworkId } = await params;
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
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate compliance PDF" },
      { status: 500 },
    );
  }
}
