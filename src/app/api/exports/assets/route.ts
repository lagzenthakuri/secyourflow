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

  const assets = await prisma.asset.findMany({
    where: { organizationId: authResult.context.organizationId },
    include: {
      _count: { select: { vulnerabilities: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const data = {
    title: "Assets Export",
    generatedAt: new Date().toISOString(),
    summary: [
      { label: "Total Assets", value: assets.length },
      {
        label: "Critical Assets",
        value: assets.filter((asset) => asset.criticality === "CRITICAL").length,
      },
    ],
    headers: [
      "Name",
      "Type",
      "Environment",
      "Criticality",
      "Status",
      "IP",
      "Hostname",
      "Owner",
      "Vulnerability Count",
      "Tags",
    ],
    rows: assets.map((asset) => [
      asset.name,
      asset.type,
      asset.environment,
      asset.criticality,
      asset.status,
      asset.ipAddress || "",
      asset.hostname || "",
      asset.owner || "",
      String(asset._count.vulnerabilities),
      asset.tags.join("|"),
    ]),
  };

  const rendered = await renderTabularExport(data, format, `assets_${data.generatedAt.slice(0, 10)}`);
  return exportResponse(rendered);
}
