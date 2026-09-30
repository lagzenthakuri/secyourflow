import type { ReportOutputFormat, ReportTemplateKey } from "@repo/database";

export interface ReportContext {
  filters?: Record<string, unknown>;
  name?: string;
  organizationId: string;
  outputFormat: ReportOutputFormat;
  requestedByUserId: string;
  templateKey: ReportTemplateKey;
}

export interface TabularReportData {
  generatedAt: string;
  headers: string[];
  rows: string[][];
  summary: Array<{ label: string; value: string | number }>;
  title: string;
}

export interface RenderedReport {
  bytes: Buffer;
  fileName: string;
  mimeType: string;
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
