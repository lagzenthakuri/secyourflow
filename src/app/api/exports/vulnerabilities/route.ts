import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { exportResponse, renderTabularExport } from "@/lib/reporting/export-utils";

export async function GET(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  const format = (request.nextUrl.searchParams.get("format") || "csv").toLowerCase();
  if (format !== "csv" && format !== "xlsx") {
    return NextResponse.json({ error: "format must be csv or xlsx" }, { status: 400 });
  }

  const vulnerabilities = await prisma.vulnerability.findMany({
    where: { organizationId: authResult.context.organizationId },
    include: {
      assignedUser: { select: { name: true, email: true } },
      _count: { select: { assets: true } },
    },
    orderBy: [{ severity: "desc" }, { updatedAt: "desc" }],
  });

  const data = {
    title: "Vulnerabilities Export",
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Total Vulnerabilities", value: vulnerabilities.length },
      {
        label: "Critical",
        value: vulnerabilities.filter((v) => v.severity === "CRITICAL").length,
      },
    ],
    headers: [
      "ID",
      "CVE",
      "Title",
      "Severity",
      "Workflow",
      "Status",
      "Assignee",
      "SLA Due",
      "Affected Assets",
      "Source",
    ],
    rows: vulnerabilities.map((vuln) => [
      vuln.id,
      vuln.cveId || "",
      vuln.title,
      vuln.severity,
      vuln.workflowState,
      vuln.status,
      vuln.assignedUser?.name || vuln.assignedUser?.email || "",
      vuln.slaDueAt ? vuln.slaDueAt.toISOString() : "",
      String(vuln._count.assets),
      vuln.source,
    ]),
  };

  const rendered = await renderTabularExport(
    data,
    format,
    `vulnerabilities_${data.generatedAt.slice(0, 10)}`,
  );
  return exportResponse(rendered);
}
