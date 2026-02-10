import { prisma } from "@/lib/prisma";
import { renderCsvReport } from "@/lib/reporting/renderers/csv";
import { renderPdfReport } from "@/lib/reporting/renderers/pdf";
import { renderXlsxReport } from "@/lib/reporting/renderers/xlsx";
import type { ReportContext, RenderedReport, TabularReportData } from "@/lib/reporting/types";
import { templateLabel } from "@/lib/reporting/types";

function withDefaultRows(data: TabularReportData): TabularReportData {
  if (data.rows.length > 0) return data;
  return {
    ...data,
    rows: [["No data", "-"]],
  };
}

function buildFileBase(templateKey: ReportContext["templateKey"], nowIso: string) {
  const datePart = nowIso.slice(0, 10);
  return `${templateKey.toLowerCase()}_${datePart}`;
}

export async function buildTabularReportData(context: ReportContext): Promise<TabularReportData> {
  const generatedAt = new Date().toISOString();
  const title = templateLabel(context.templateKey);

  if (context.templateKey === "EXECUTIVE_POSTURE") {
    const [assetCount, vulnCount, criticalVulnCount, openRiskCount] = await Promise.all([
      prisma.asset.count({ where: { organizationId: context.organizationId } }),
      prisma.vulnerability.count({ where: { organizationId: context.organizationId } }),
      prisma.vulnerability.count({
        where: { organizationId: context.organizationId, severity: "CRITICAL" },
      }),
      prisma.riskRegister.count({
        where: { organizationId: context.organizationId, status: "ACTIVE" },
      }),
    ]);

    const topRisks = await prisma.riskRegister.findMany({
      where: { organizationId: context.organizationId },
      include: {
        asset: { select: { name: true } },
        vulnerability: { select: { title: true, severity: true } },
      },
      orderBy: { riskScore: "desc" },
      take: 10,
    });

    return withDefaultRows({
      title,
      generatedAt,
      summary: [
        { label: "Total Assets", value: assetCount },
        { label: "Total Vulnerabilities", value: vulnCount },
        { label: "Critical Vulnerabilities", value: criticalVulnCount },
        { label: "Open Risks", value: openRiskCount },
      ],
      headers: ["Asset", "Vulnerability", "Severity", "Risk Score"],
      rows: topRisks.map((risk) => [
        risk.asset.name,
        risk.vulnerability.title,
        risk.vulnerability.severity,
        risk.riskScore.toFixed(2),
      ]),
    });
  }

  if (context.templateKey === "RISK_TREND") {
    const snapshots = await prisma.riskSnapshot.findMany({
      orderBy: { date: "desc" },
      take: 30,
    });

    return withDefaultRows({
      title,
      generatedAt,
      summary: [
        { label: "Snapshots", value: snapshots.length },
      ],
      headers: [
        "Date",
        "Overall Risk",
        "Critical Vulns",
        "High Vulns",
        "Compliance",
      ],
      rows: snapshots.map((item) => [
        item.date.toISOString(),
        item.overallRiskScore.toFixed(2),
        String(item.criticalVulns),
        String(item.highVulns),
        item.complianceScore?.toFixed(2) ?? "0",
      ]),
    });
  }

  if (context.templateKey === "TOP_RISKS") {
    const risks = await prisma.riskRegister.findMany({
      where: { organizationId: context.organizationId },
      include: {
        vulnerability: {
          select: { title: true, severity: true, workflowState: true },
        },
        asset: {
          select: { name: true, criticality: true },
        },
      },
      orderBy: { riskScore: "desc" },
      take: 10,
    });

    return withDefaultRows({
      title,
      generatedAt,
      summary: [{ label: "Entries", value: risks.length }],
      headers: [
        "Asset",
        "Asset Criticality",
        "Vulnerability",
        "Severity",
        "Workflow",
        "Risk Score",
      ],
      rows: risks.map((risk) => [
        risk.asset.name,
        risk.asset.criticality,
        risk.vulnerability.title,
        risk.vulnerability.severity,
        risk.vulnerability.workflowState,
        risk.riskScore.toFixed(2),
      ]),
    });
  }

  if (context.templateKey === "COMPLIANCE_SUMMARY") {
    const frameworks = await prisma.complianceFramework.findMany({
      where: { organizationId: context.organizationId },
      include: {
        controls: {
          select: { id: true, status: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return withDefaultRows({
      title,
      generatedAt,
      summary: [{ label: "Frameworks", value: frameworks.length }],
      headers: ["Framework", "Total Controls", "Compliant", "Non-Compliant", "Coverage %"],
      rows: frameworks.map((framework) => {
        const total = framework.controls.length;
        const compliant = framework.controls.filter((c) => c.status === "COMPLIANT").length;
        const nonCompliant = framework.controls.filter((c) => c.status === "NON_COMPLIANT").length;
        const coverage = total > 0 ? ((compliant / total) * 100).toFixed(1) : "0.0";

        return [framework.name, String(total), String(compliant), String(nonCompliant), coverage];
      }),
    });
  }

  if (context.templateKey === "ASSET_INVENTORY") {
    const assets = await prisma.asset.findMany({
      where: { organizationId: context.organizationId },
      include: {
        _count: { select: { vulnerabilities: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    });

    return withDefaultRows({
      title,
      generatedAt,
      summary: [{ label: "Assets", value: assets.length }],
      headers: [
        "Name",
        "Type",
        "Environment",
        "Criticality",
        "Status",
        "Owner",
        "Vulnerability Count",
      ],
      rows: assets.map((asset) => [
        asset.name,
        asset.type,
        asset.environment,
        asset.criticality,
        asset.status,
        asset.owner || "",
        String(asset._count.vulnerabilities),
      ]),
    });
  }

  if (context.templateKey === "REMEDIATION_TRACKING") {
    const vulnerabilities = await prisma.vulnerability.findMany({
      where: { organizationId: context.organizationId },
      select: {
        id: true,
        title: true,
        severity: true,
        workflowState: true,
        assignedTeam: true,
        slaDueAt: true,
        assignedUser: { select: { name: true, email: true } },
      },
      orderBy: [{ workflowState: "asc" }, { severity: "desc" }],
      take: 5000,
    });

    return withDefaultRows({
      title,
      generatedAt,
      summary: [{ label: "Tracked Findings", value: vulnerabilities.length }],
      headers: [
        "ID",
        "Title",
        "Severity",
        "Workflow",
        "Assignee",
        "Team",
        "SLA Due",
      ],
      rows: vulnerabilities.map((vuln) => [
        vuln.id,
        vuln.title,
        vuln.severity,
        vuln.workflowState,
        vuln.assignedUser?.name || vuln.assignedUser?.email || "",
        vuln.assignedTeam || "",
        vuln.slaDueAt ? vuln.slaDueAt.toISOString() : "",
      ]),
    });
  }

  // VULN_ASSESSMENT and PENTEST_FINDINGS share vulnerability rows
  const vulnerabilities = await prisma.vulnerability.findMany({
    where: {
      organizationId: context.organizationId,
      ...(context.templateKey === "PENTEST_FINDINGS" ? { source: "MANUAL" } : {}),
    },
    include: {
      assignedUser: {
        select: { name: true, email: true },
      },
      _count: {
        select: { assets: true },
      },
    },
    orderBy: [{ severity: "desc" }, { updatedAt: "desc" }],
    take: 5000,
  });

  return withDefaultRows({
    title,
    generatedAt,
    summary: [{ label: "Findings", value: vulnerabilities.length }],
    headers: [
      "ID",
      "CVE",
      "Title",
      "Severity",
      "Workflow",
      "Status",
      "Affected Assets",
      "Assignee",
      "SLA Due",
    ],
    rows: vulnerabilities.map((item) => [
      item.id,
      item.cveId || "",
      item.title,
      item.severity,
      item.workflowState,
      item.status,
      String(item._count.assets),
      item.assignedUser?.name || item.assignedUser?.email || "",
      item.slaDueAt ? item.slaDueAt.toISOString() : "",
    ]),
  });
}

export function renderReport(context: ReportContext, data: TabularReportData): RenderedReport {
  const base = buildFileBase(context.templateKey, data.generatedAt);

  if (context.outputFormat === "CSV") {
    return renderCsvReport(data, base);
  }

  if (context.outputFormat === "XLSX") {
    return renderXlsxReport(data, base);
  }

  return renderPdfReport(data, base);
}

export async function generateRenderedReport(context: ReportContext) {
  const data = await buildTabularReportData(context);
  const artifact = renderReport(context, data);

  return { data, artifact };
}
