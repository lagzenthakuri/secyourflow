import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { prisma } from "@/lib/prisma";
import type { ComplianceStatus } from "@prisma/client";

interface ComplianceTrendPoint {
  date: string;
  compliancePercentage: number;
  compliant: number;
  nonCompliant: number;
}

interface ComplianceControlReportRow {
  id: string;
  controlId: string;
  title: string;
  status: ComplianceStatus;
  maturityLevel: number;
  ownerRole: string | null;
  evidenceCount: number;
  latestEvidenceVersion: number | null;
  latestEvidenceFile: string | null;
  hasEvidenceGap: boolean;
  nextAssessment: string | null;
}

interface ComplianceGapSummary {
  missingEvidenceControls: number;
  nonCompliantControls: number;
  overdueAssessments: number;
}

export interface ComplianceFrameworkReport {
  frameworkId: string;
  frameworkName: string;
  frameworkVersion: string | null;
  generatedAt: string;
  summary: {
    totalControls: number;
    compliant: number;
    nonCompliant: number;
    partiallyCompliant: number;
    notAssessed: number;
    notApplicable: number;
    evidenceCoveragePercentage: number;
    compliancePercentage: number;
  };
  gaps: ComplianceGapSummary;
  trend: ComplianceTrendPoint[];
  controls: ComplianceControlReportRow[];
  executiveSummary: string;
}

function toPercent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

function formatStatus(status: ComplianceStatus) {
  return status.replace(/_/g, " ");
}

function buildExecutiveSummary(report: Omit<ComplianceFrameworkReport, "executiveSummary">) {
  const complianceBand =
    report.summary.compliancePercentage >= 85
      ? "strong"
      : report.summary.compliancePercentage >= 65
        ? "moderate"
        : "elevated-risk";

  return [
    `${report.frameworkName} (${report.frameworkVersion || "Current"}) currently shows ${report.summary.compliancePercentage.toFixed(1)}% compliant controls with ${report.summary.evidenceCoveragePercentage.toFixed(1)}% evidence coverage.`,
    `Overall posture is ${complianceBand} with ${report.gaps.nonCompliantControls} non-compliant controls, ${report.gaps.missingEvidenceControls} controls lacking evidence, and ${report.gaps.overdueAssessments} overdue assessments.`,
    "Priority should focus on non-compliant controls that also have missing evidence, then stabilizing cadence for overdue assessments to improve audit readiness over time.",
  ].join(" ");
}

export async function buildComplianceFrameworkReport(
  frameworkId: string,
  options: {
    trendDays?: number;
  } = {},
): Promise<ComplianceFrameworkReport> {
  const trendDays = options.trendDays ?? 90;
  const trendStart = new Date();
  trendStart.setDate(trendStart.getDate() - trendDays);

  const framework = await prisma.complianceFramework.findUnique({
    where: {
      id: frameworkId,
    },
    include: {
      controls: {
        include: {
          evidenceFiles: {
            include: {
              versions: {
                orderBy: {
                  version: "desc",
                },
                take: 1,
              },
            },
          },
        },
      },
      trendSnapshots: {
        where: {
          snapshotDate: {
            gte: trendStart,
          },
        },
        orderBy: {
          snapshotDate: "asc",
        },
      },
    },
  });

  if (!framework) {
    throw new Error(`Framework ${frameworkId} not found`);
  }

  const totalControls = framework.controls.length;
  const compliant = framework.controls.filter((control) => control.status === "COMPLIANT").length;
  const nonCompliant = framework.controls.filter((control) => control.status === "NON_COMPLIANT").length;
  const partiallyCompliant = framework.controls.filter(
    (control) => control.status === "PARTIALLY_COMPLIANT",
  ).length;
  const notAssessed = framework.controls.filter((control) => control.status === "NOT_ASSESSED").length;
  const notApplicable = framework.controls.filter((control) => control.status === "NOT_APPLICABLE").length;

  const controls = framework.controls.map<ComplianceControlReportRow>((control) => {
    const latestVersion = control.evidenceFiles
      .flatMap((evidence) => evidence.versions)
      .sort((a, b) => b.version - a.version)[0];

    const hasEvidence = control.evidenceFiles.length > 0 || (control.evidence ?? "").trim().length > 0;
    const hasEvidenceGap =
      control.status !== "NOT_APPLICABLE" &&
      control.status !== "NOT_ASSESSED" &&
      !hasEvidence;

    return {
      id: control.id,
      controlId: control.controlId,
      title: control.title,
      status: control.status,
      maturityLevel: control.maturityLevel,
      ownerRole: control.ownerRole,
      evidenceCount: control.evidenceFiles.length,
      latestEvidenceVersion: latestVersion?.version ?? null,
      latestEvidenceFile: latestVersion?.fileName ?? null,
      hasEvidenceGap,
      nextAssessment: control.nextAssessment?.toISOString() ?? null,
    };
  });

  const now = new Date();
  const missingEvidenceControls = controls.filter((control) => control.hasEvidenceGap).length;
  const overdueAssessments = framework.controls.filter(
    (control) =>
      control.nextAssessment &&
      control.nextAssessment < now &&
      control.status !== "NOT_APPLICABLE",
  ).length;

  const controlsWithEvidence = controls.filter(
    (control) => control.evidenceCount > 0 || !control.hasEvidenceGap,
  ).length;

  const compliancePercentage = toPercent(compliant, totalControls);
  const evidenceCoveragePercentage = toPercent(controlsWithEvidence, totalControls);

  const trend: ComplianceTrendPoint[] = framework.trendSnapshots.map((snapshot) => ({
    date: snapshot.snapshotDate.toISOString(),
    compliancePercentage: snapshot.compliancePercentage,
    compliant: snapshot.compliant,
    nonCompliant: snapshot.nonCompliant,
  }));

  if (trend.length === 0) {
    trend.push({
      date: now.toISOString(),
      compliancePercentage,
      compliant,
      nonCompliant,
    });
  }

  const baseReport = {
    frameworkId: framework.id,
    frameworkName: framework.name,
    frameworkVersion: framework.version,
    generatedAt: now.toISOString(),
    summary: {
      totalControls,
      compliant,
      nonCompliant,
      partiallyCompliant,
      notAssessed,
      notApplicable,
      evidenceCoveragePercentage,
      compliancePercentage,
    },
    gaps: {
      missingEvidenceControls,
      nonCompliantControls: nonCompliant,
      overdueAssessments,
    },
    trend,
    controls,
  };

  return {
    ...baseReport,
    executiveSummary: buildExecutiveSummary(baseReport),
  };
}

export function generateComplianceReportPdf(report: ComplianceFrameworkReport) {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text(`${report.frameworkName} Compliance Report`, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated at: ${new Date(report.generatedAt).toLocaleString()}`, 14, 27);

  doc.setFontSize(13);
  doc.setTextColor(50, 50, 50);
  doc.text("Executive Summary", 14, 38);

  doc.setFontSize(10);
  const wrappedSummary = doc.splitTextToSize(report.executiveSummary, 180);
  doc.text(wrappedSummary, 14, 45);

  autoTable(doc, {
    startY: 68,
    head: [["Metric", "Value"]],
    body: [
      ["Total Controls", `${report.summary.totalControls}`],
      ["Compliant", `${report.summary.compliant}`],
      ["Non-Compliant", `${report.summary.nonCompliant}`],
      ["Partially Compliant", `${report.summary.partiallyCompliant}`],
      ["Evidence Coverage", `${report.summary.evidenceCoveragePercentage.toFixed(1)}%`],
      ["Compliance Score", `${report.summary.compliancePercentage.toFixed(1)}%`],
      ["Missing Evidence Gaps", `${report.gaps.missingEvidenceControls}`],
      ["Overdue Assessments", `${report.gaps.overdueAssessments}`],
    ],
    headStyles: {
      fillColor: [56, 189, 248],
      textColor: [255, 255, 255],
    },
    styles: {
      fontSize: 9,
    },
  });

  const trendBody = report.trend.map((point) => [
    new Date(point.date).toLocaleDateString(),
    `${point.compliancePercentage.toFixed(1)}%`,
    `${point.compliant}`,
    `${point.nonCompliant}`,
  ]);

  const lastAutoTable = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;

  autoTable(doc, {
    startY: lastAutoTable ? lastAutoTable.finalY + 10 : 120,
    head: [["Date", "Compliance", "Compliant", "Non-Compliant"]],
    body: trendBody,
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: [255, 255, 255],
    },
    styles: {
      fontSize: 8,
    },
  });

  doc.addPage();
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text("Control and Evidence Details", 14, 20);

  autoTable(doc, {
    startY: 28,
    head: [["Control", "Status", "Evidence", "Latest Version", "Gap"]],
    body: report.controls.map((control) => [
      `${control.controlId} ${control.title}`,
      formatStatus(control.status),
      `${control.evidenceCount} item(s)`,
      control.latestEvidenceVersion ? `v${control.latestEvidenceVersion}` : "None",
      control.hasEvidenceGap ? "Yes" : "No",
    ]),
    headStyles: {
      fillColor: [56, 189, 248],
      textColor: [255, 255, 255],
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 95 },
      1: { cellWidth: 27 },
      2: { cellWidth: 24 },
      3: { cellWidth: 22 },
      4: { cellWidth: 18 },
    },
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(`Page ${page}/${pageCount}`, 180, 286, { align: "right" });
  }

  return Buffer.from(doc.output("arraybuffer"));
}
