import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { generateRenderedReport } from "@/lib/reporting/engine";
import { persistReportRun } from "@/lib/reporting/archive";
import type { ReportOutputFormat, ReportTemplateKey } from "@prisma/client";

const templateAliasMap: Record<string, ReportTemplateKey> = {
  executive: "EXECUTIVE_POSTURE",
  technical: "VULN_ASSESSMENT",
  compliance: "COMPLIANCE_SUMMARY",
  inventory: "ASSET_INVENTORY",
  threat: "TOP_RISKS",
  tracking: "REMEDIATION_TRACKING",
  "executive-risk-summary": "EXECUTIVE_POSTURE",
  "vulnerability-status": "VULN_ASSESSMENT",
  "compliance-audit": "COMPLIANCE_SUMMARY",
  "asset-inventory": "ASSET_INVENTORY",
  "threat-intelligence-brief": "TOP_RISKS",
  "remediation-progress": "REMEDIATION_TRACKING",
};

function normalizeTemplateKey(input?: string | null): ReportTemplateKey {
  if (!input) return "EXECUTIVE_POSTURE";

  if (
    input === "EXECUTIVE_POSTURE" ||
    input === "RISK_TREND" ||
    input === "TOP_RISKS" ||
    input === "COMPLIANCE_SUMMARY" ||
    input === "VULN_ASSESSMENT" ||
    input === "PENTEST_FINDINGS" ||
    input === "ASSET_INVENTORY" ||
    input === "REMEDIATION_TRACKING"
  ) {
    return input;
  }

  return templateAliasMap[input] || "EXECUTIVE_POSTURE";
}

const createReportSchema = z.object({
  name: z.string().min(3).max(180).optional(),
  templateKey: z.string().optional(),
  type: z.string().optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  outputFormat: z.enum(["PDF", "CSV", "XLSX"]).optional(),
  format: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { organizationId } = authResult.context;

  const page = Number(request.nextUrl.searchParams.get("page") || "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") || "20");
  const status = request.nextUrl.searchParams.get("status");
  const templateKey = request.nextUrl.searchParams.get("templateKey");

  const where = {
    organizationId,
    ...(status ? { status } : {}),
    ...(templateKey ? { templateKey: normalizeTemplateKey(templateKey) } : {}),
  };

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        type: true,
        templateKey: true,
        description: true,
        format: true,
        outputFormat: true,
        status: true,
        url: true,
        size: true,
        createdAt: true,
      },
    }),
    prisma.report.count({ where }),
  ]);

  return NextResponse.json({
    data: reports,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

export async function POST(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const parsed = createReportSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid report request payload",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { organizationId, userId } = authResult.context;
  const payload = parsed.data;

  const templateKey = normalizeTemplateKey(payload.templateKey || payload.type);
  const outputFormat = (payload.outputFormat || payload.format || "PDF") as ReportOutputFormat;

  try {
    const { data, artifact } = await generateRenderedReport({
      organizationId,
      requestedByUserId: userId,
      templateKey,
      outputFormat,
      filters: payload.filters,
      name: payload.name,
    });

    const persisted = await persistReportRun({
      organizationId,
      userId,
      name: payload.name || `Generated ${templateKey}`,
      templateKey,
      outputFormat,
      metadata: {
        generatedAt: data.generatedAt,
        summary: data.summary,
      },
      artifact,
    });

    return NextResponse.json(
      {
        id: persisted.report.id,
        name: persisted.report.name,
        templateKey,
        outputFormat,
        status: persisted.report.status,
        url: `/api/reports/${persisted.report.id}/download`,
        size: persisted.report.size,
        createdAt: persisted.report.createdAt,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate report",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
