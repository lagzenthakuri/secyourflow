import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { exportResponse, renderTabularExport } from "@/lib/reporting/export-utils";

export async function GET(request: NextRequest) {
  const authResult = await requireSessionWithOrg();
  if (!authResult.ok) return authResult.response;

  const format = (request.nextUrl.searchParams.get("format") || "csv").toLowerCase();
  if (format !== "csv" && format !== "xlsx") {
    return NextResponse.json({ error: "format must be csv or xlsx" }, { status: 400 });
  }

  const frameworks = await prisma.complianceFramework.findMany({
    where: { organizationId: authResult.context.organizationId },
    include: {
      controls: {
        select: {
          controlId: true,
          title: true,
          status: true,
          implementationStatus: true,
          ownerRole: true,
          maturityLevel: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const rows: string[][] = [];
  for (const framework of frameworks) {
    for (const control of framework.controls) {
      rows.push([
        framework.name,
        control.controlId,
        control.title,
        control.status,
        control.implementationStatus,
        control.ownerRole || "",
        String(control.maturityLevel),
      ]);
    }
  }

  const data = {
    title: "Compliance Export",
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Frameworks", value: frameworks.length },
      { label: "Controls", value: rows.length },
    ],
    headers: [
      "Framework",
      "Control ID",
      "Control Title",
      "Status",
      "Implementation",
      "Owner Role",
      "Maturity",
    ],
    rows,
  };

  const rendered = renderTabularExport(data, format, `compliance_${data.generatedAt.slice(0, 10)}`);
  return exportResponse(rendered);
}
