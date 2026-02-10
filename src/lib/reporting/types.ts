import type { ReportOutputFormat, ReportTemplateKey } from "@prisma/client";

export interface ReportContext {
  organizationId: string;
  requestedByUserId: string;
  templateKey: ReportTemplateKey;
  name?: string;
  filters?: Record<string, unknown>;
  outputFormat: ReportOutputFormat;
}

export interface TabularReportData {
  title: string;
  generatedAt: string;
  summary: Array<{ label: string; value: string | number }>;
  headers: string[];
  rows: string[][];
}

export interface RenderedReport {
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}

export function templateLabel(templateKey: ReportTemplateKey) {
  switch (templateKey) {
    case "EXECUTIVE_POSTURE":
      return "Executive Security Posture";
    case "RISK_TREND":
      return "Risk Trend Analysis";
    case "TOP_RISKS":
      return "Top Risks";
    case "COMPLIANCE_SUMMARY":
      return "Compliance Summary";
    case "VULN_ASSESSMENT":
      return "Vulnerability Assessment";
    case "PENTEST_FINDINGS":
      return "Penetration Test Findings";
    case "ASSET_INVENTORY":
      return "Asset Inventory";
    case "REMEDIATION_TRACKING":
      return "Remediation Tracking";
    default:
      return "Report";
  }
}
