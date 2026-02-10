import { NextResponse } from "next/server";
import { buildComplianceFrameworkReport } from "@/lib/compliance-reporting";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ frameworkId: string }> },
) {
  void request;
  try {
    const { frameworkId } = await params;
    const report = await buildComplianceFrameworkReport(frameworkId);
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate compliance report" },
      { status: 500 },
    );
  }
}
