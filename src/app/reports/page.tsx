"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { WidgetBuilder } from "@/components/dashboard/WidgetBuilder";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileCheck,
  FileText,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const RiskTrendChart = dynamic(
  () => import("@/components/charts/DashboardCharts").then((mod) => mod.RiskTrendChart),
  {
    ssr: false,
    loading: () => <div className="h-[280px] animate-pulse rounded-xl bg-white/5" />,
  },
);

const VulnStatusChart = dynamic(
  () => import("@/components/charts/DashboardCharts").then((mod) => mod.VulnStatusChart),
  {
    ssr: false,
    loading: () => <div className="h-[240px] animate-pulse rounded-xl bg-white/5" />,
  },
);

const ComplianceBarChart = dynamic(
  () => import("@/components/charts/DashboardCharts").then((mod) => mod.ComplianceBarChart),
  {
    ssr: false,
    loading: () => <div className="h-[240px] animate-pulse rounded-xl bg-white/5" />,
  },
);

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  cadence: string;
  format: string;
}

interface ReportRecord {
  id: string;
  name: string;
  type: string;
  templateKey?: string | null;
  description?: string | null;
  format?: string | null;
  outputFormat?: string | null;
  status?: string | null;
  url?: string | null;
  size?: string | null;
  createdAt: string;
}

interface ReportsApiResponse {
  data: ReportRecord[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface DashboardViewRecord {
  id: string;
  name: string;
  layout: {
    widgets?: string[];
    [key: string]: unknown;
  };
  isDefault: boolean;
  shares?: Array<{
    id: string;
    sharedWithRole?: string | null;
    sharedWithUserId?: string | null;
    canEdit: boolean;
  }>;
}

interface DashboardStats {
  overallRiskScore: number;
  complianceScore: number;
  fixedThisMonth: number;
  meanTimeToRemediate: number;
  openVulnerabilities: number;
}

interface DashboardData {
  stats: DashboardStats;
  riskTrends: Array<{
    date: string;
    riskScore: number;
    criticalVulns: number;
    highVulns: number;
  }>;
  remediationTrends: Array<{
    month: string;
    opened: number;
    closed: number;
    net?: number;
  }>;
  complianceOverview: Array<{
    frameworkId: string;
    frameworkName: string;
    compliant: number;
    nonCompliant: number;
    compliancePercentage: number;
  }>;
}

const EMPTY_COMPLIANCE_OVERVIEW: DashboardData["complianceOverview"] = [];

const reportTemplates: ReportTemplate[] = [
  {
    id: "executive-risk-summary",
    name: "Executive Risk Summary",
    description: "Leadership-ready summary of current cyber risk, exposure trends, and priority actions.",
    type: "executive",
    cadence: "Weekly",
    format: "PDF",
  },
  {
    id: "vulnerability-status",
    name: "Vulnerability Status Report",
    description: "Detailed severity, ownership, and remediation status for active vulnerability workloads.",
    type: "technical",
    cadence: "Daily",
    format: "PDF / CSV",
  },
  {
    id: "compliance-audit",
    name: "Compliance Audit Report",
    description: "Control pass/fail visibility and maturity posture across active frameworks.",
    type: "compliance",
    cadence: "Monthly",
    format: "PDF",
  },
  {
    id: "asset-inventory",
    name: "Asset Inventory Report",
    description: "Latest inventory baseline with criticality, ownership, and monitoring coverage context.",
    type: "inventory",
    cadence: "Weekly",
    format: "CSV / Excel",
  },
  {
    id: "threat-intelligence-brief",
    name: "Threat Intelligence Brief",
    description: "Consolidated view of live threats, exploitation indicators, and likely attack pressure.",
    type: "threat",
    cadence: "Daily",
    format: "PDF",
  },
  {
    id: "remediation-progress",
    name: "Remediation Progress Report",
    description: "Progress tracking of fixes, mean closure times, and unresolved high-risk findings.",
    type: "tracking",
    cadence: "Weekly",
    format: "PDF / CSV",
  },
];

const templateToKeyMap: Record<string, string> = {
  executive: "EXECUTIVE_POSTURE",
  technical: "VULN_ASSESSMENT",
  compliance: "COMPLIANCE_SUMMARY",
  inventory: "ASSET_INVENTORY",
  threat: "TOP_RISKS",
  tracking: "REMEDIATION_TRACKING",
};

const reportTypeMeta: Record<
  string,
  { icon: LucideIcon; tone: string; border: string; iconTone: string }
> = {
  executive: {
    icon: TrendingUp,
    tone: "text-sky-200",
    border: "border-sky-300/30",
    iconTone: "text-sky-300",
  },
  technical: {
    icon: Shield,
    tone: "text-orange-200",
    border: "border-orange-300/30",
    iconTone: "text-orange-300",
  },
  compliance: {
    icon: FileCheck,
    tone: "text-emerald-200",
    border: "border-emerald-300/30",
    iconTone: "text-emerald-300",
  },
  inventory: {
    icon: Target,
    tone: "text-violet-200",
    border: "border-violet-300/30",
    iconTone: "text-violet-300",
  },
  threat: {
    icon: TrendingDown,
    tone: "text-red-200",
    border: "border-red-300/30",
    iconTone: "text-red-300",
  },
  tracking: {
    icon: BarChart3,
    tone: "text-cyan-200",
    border: "border-cyan-300/30",
    iconTone: "text-cyan-300",
  },
};

const numberFormatter = new Intl.NumberFormat("en-US");

const dashboardWidgetCatalog = [
  "risk_trend",
  "output_queue",
  "compliance_snapshot",
  "top_frameworks",
  "recent_reports",
];

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getReportStatusTone(status?: string | null) {
  const normalized = (status || "").toUpperCase();
  if (normalized === "COMPLETED") {
    return "border-emerald-400/35 bg-emerald-500/10 text-emerald-200";
  }
  if (normalized === "PENDING") {
    return "border-yellow-400/35 bg-yellow-500/10 text-yellow-200";
  }
  if (normalized === "FAILED") {
    return "border-red-400/35 bg-red-500/10 text-red-200";
  }
  return "border-slate-400/35 bg-slate-500/10 text-[var(--text-secondary)]";
}

export default function ReportsPage() {
  const [reportsList, setReportsList] = useState<ReportRecord[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const { data: session } = useSession();
  const isMainOfficer = session?.user?.role === "MAIN_OFFICER";

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [dashboardViews, setDashboardViews] = useState<DashboardViewRecord[]>([]);
  const [viewName, setViewName] = useState("SOC Operations View");
  const [viewWidgets, setViewWidgets] = useState<string[]>([
    "risk_trend",
    "output_queue",
    "recent_reports",
  ]);
  const [viewDefault, setViewDefault] = useState(true);
  const [viewShareRole, setViewShareRole] = useState("ANALYST");
  const [isSavingView, setIsSavingView] = useState(false);

  const fetchData = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        setPageError(null);
        const [reportsRes, dashboardRes, dashboardViewsRes] = await Promise.all([
          fetch("/api/reports", { cache: "no-store" }),
          fetch("/api/dashboard", { cache: "no-store" }),
          fetch("/api/dashboard/views", { cache: "no-store" }),
        ]);

        if (!reportsRes.ok || !dashboardRes.ok || !dashboardViewsRes.ok) {
          throw new Error("Failed to fetch reporting data");
        }

        const reportsPayload = (await reportsRes.json()) as ReportsApiResponse | { error?: string };
        const dashboardPayload = (await dashboardRes.json()) as DashboardData;
        const viewsPayload = (await dashboardViewsRes.json()) as {
          data?: DashboardViewRecord[];
          error?: string;
        };
        const reportRows =
          "data" in reportsPayload && Array.isArray(reportsPayload.data)
            ? reportsPayload.data
            : [];

        setReportsList(reportRows);
        setDashboardViews(Array.isArray(viewsPayload.data) ? viewsPayload.data : []);
        setDashboardData(dashboardPayload);
      } catch (error) {
        setPageError(
          error instanceof Error ? error.message : "Failed to fetch reporting data",
        );
      } finally {
        if (silent) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const defaultView = dashboardViews.find((view) => view.isDefault) || dashboardViews[0];
    if (!defaultView) return;

    if (defaultView.name && viewName === "SOC Operations View") {
      setViewName(defaultView.name);
    }
    if (Array.isArray(defaultView.layout?.widgets) && defaultView.layout.widgets.length > 0) {
      setViewWidgets(defaultView.layout.widgets);
    }
    setViewDefault(defaultView.isDefault);
  }, [dashboardViews, viewName]);

  const saveDashboardView = useCallback(async () => {
    try {
      setActionError(null);
      setIsSavingView(true);
      const response = await fetch("/api/dashboard/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: viewName,
          layout: { widgets: viewWidgets },
          isDefault: viewDefault,
          shares: viewShareRole
            ? [
              {
                sharedWithRole: viewShareRole,
                canEdit: false,
              },
            ]
            : [],
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save dashboard view");
      }

      await fetchData({ silent: true });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to save dashboard view");
    } finally {
      setIsSavingView(false);
    }
  }, [fetchData, viewDefault, viewName, viewShareRole, viewWidgets]);

  const deleteDashboardView = useCallback(
    async (id: string) => {
      try {
        setActionError(null);
        setIsSavingView(true);
        const response = await fetch(`/api/dashboard/views?id=${id}`, {
          method: "DELETE",
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to delete dashboard view");
        }
        await fetchData({ silent: true });
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Failed to delete dashboard view");
      } finally {
        setIsSavingView(false);
      }
    },
    [fetchData],
  );

  const handleGenerate = useCallback(
    async (template: ReportTemplate) => {
      try {
        setActionError(null);
        setIsGenerating(template.id);

        const response = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: template.name,
            templateKey: templateToKeyMap[template.type] || "EXECUTIVE_POSTURE",
            outputFormat: template.format.includes("Excel")
              ? "XLSX"
              : template.format.includes("CSV")
                ? "CSV"
                : "PDF",
          }),
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error || "Failed to generate report");
        }

        await fetchData({ silent: true });
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : "Failed to generate report",
        );
      } finally {
        setIsGenerating(null);
      }
    },
    [fetchData],
  );

  const stats = dashboardData?.stats || {
    overallRiskScore: 0,
    complianceScore: 0,
    fixedThisMonth: 0,
    meanTimeToRemediate: 0,
    openVulnerabilities: 0,
  };

  const riskTrends = dashboardData?.riskTrends || [];
  const remediationTrends = dashboardData?.remediationTrends || [];
  const complianceOverview = dashboardData?.complianceOverview ?? EMPTY_COMPLIANCE_OVERVIEW;

  const queueStats = useMemo(() => {
    const completed = reportsList.filter(
      (report) => (report.status || "").toUpperCase() === "COMPLETED",
    ).length;
    const pending = reportsList.filter(
      (report) => (report.status || "").toUpperCase() === "PENDING",
    ).length;
    const failed = reportsList.filter(
      (report) => (report.status || "").toUpperCase() === "FAILED",
    ).length;

    return { completed, pending, failed };
  }, [reportsList]);

  const topComplianceName = useMemo(() => {
    if (!complianceOverview.length) return "N/A";
    const sorted = [...complianceOverview].sort(
      (a, b) => b.compliancePercentage - a.compliancePercentage,
    );
    return sorted[0]?.frameworkName || "N/A";
  }, [complianceOverview]);

  if (isLoading && reportsList.length === 0 && !dashboardData) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <ShieldLoader size="lg" variant="cyber" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="Reports"
          description="Generate decision-ready reporting for SOC leadership, auditors, and operational teams with clear trends, compliance posture, and remediation outcomes."
          badge={
            <>
              <FileText size={13} />
              Reporting Workspace
            </>
          }
          actions={
            <>
              <button
                type="button"
                onClick={() => void fetchData({ silent: true })}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--bg-elevated)] hover:scale-105 active:scale-95"
              >
                <RefreshCw
                  size={14}
                  className={isRefreshing || isLoading ? "animate-spin" : ""}
                />
                Refresh
              </button>
              {isMainOfficer && (
                <Link
                  href="/reports/activity"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--bg-elevated)] hover:scale-105 active:scale-95"
                >
                  <Clock3 size={14} />
                  Activity
                </Link>
              )}
              <button
                type="button"
                onClick={() => void handleGenerate(reportTemplates[0])}
                disabled={isGenerating !== null}
                className="btn btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Plus size={14} />
                Generate Snapshot
              </button>
            </>
          }
          stats={[
            {
              label: "Risk Score",
              value: stats.overallRiskScore.toFixed(1),
              trend: { value: "Latest aggregate posture", neutral: true },
              icon: TrendingDown,
            },
            {
              label: "Compliance",
              value: `${stats.complianceScore.toFixed(0)}%`,
              trend: { value: "Current control coverage", neutral: true },
              icon: FileCheck,
            },
            {
              label: "Fixed This Month",
              value: numberFormatter.format(stats.fixedThisMonth),
              trend: { value: "Resolved vulnerabilities", neutral: true },
              icon: Shield,
            },
            {
              label: "Open Vulnerabilities",
              value: numberFormatter.format(stats.openVulnerabilities),
              trend: { value: "Pending remediation", neutral: true },
              icon: AlertTriangle,
            },
            {
              label: "MTTR",
              value: `${stats.meanTimeToRemediate} days`,
              trend: { value: "Mean time to remediate", neutral: true },
              icon: Sparkles,
            },
          ]}
        />

        <section
          className="grid gap-4 xl:grid-cols-2 animate-in fade-in slide-in-from-bottom-3 duration-500"
          style={{ animationDelay: "450ms", animationFillMode: "backwards" }}
        >
          <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Risk Trend</h2>
                <p className="text-sm text-[var(--text-secondary)]">Last six snapshots</p>
              </div>
              <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-1 text-[11px] text-[var(--text-muted)]">
                Governance signal
              </span>
            </div>
            <RiskTrendChart data={riskTrends} />
          </article>

          <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Remediation Activity</h2>
                <p className="text-sm text-[var(--text-secondary)]">Opened vs closed findings</p>
              </div>
              <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-1 text-[11px] text-[var(--text-muted)]">
                Operational throughput
              </span>
            </div>
            <VulnStatusChart data={remediationTrends} />
          </article>
        </section>

        <section className="grid gap-5 xl:grid-cols-12">
          <div className="xl:col-span-8 space-y-4">
            <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">Report Templates</h2>
                  <p className="text-sm text-[var(--text-secondary)]">Generate on-demand outputs for current posture.</p>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  {reportTemplates.length} templates available
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {reportTemplates.map((template, index) => {
                  const meta = reportTypeMeta[template.type] || reportTypeMeta.tracking;
                  const Icon = meta.icon;
                  return (
                    <article
                      key={template.id}
                      className={cn(
                        "rounded-xl border bg-[var(--bg-tertiary)] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--bg-elevated)] hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-2",
                        meta.border,
                      )}
                      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] p-2">
                          <Icon size={15} className={meta.iconTone} />
                        </div>
                        <div className="min-w-0">
                          <h3 className={cn("text-sm font-semibold", meta.tone)}>{template.name}</h3>
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                            {template.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span>{template.cadence}</span>
                        <span>{template.format}</span>
                      </div>

                      <div className="mt-3 flex items-center gap-2 border-t border-[var(--border-color)] pt-3">
                        <button
                          type="button"
                          onClick={() => void handleGenerate(template)}
                          disabled={isGenerating !== null}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-300 px-3 py-2 text-xs font-semibold text-slate-950 transition-all duration-200 hover:bg-sky-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                        >
                          {isGenerating === template.id ? (
                            <ShieldLoader size="sm" variant="cyber" />
                          ) : (
                            <Download size={12} />
                          )}
                          {isGenerating === template.id ? "Generating..." : "Generate"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">Recently Generated</h2>
                  <p className="text-sm text-[var(--text-secondary)]">Latest report outputs and status</p>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  {numberFormatter.format(reportsList.length)} total
                </span>
              </div>

              {reportsList.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
                  <p className="mt-4 text-base font-medium text-[var(--text-primary)]">No Reports Yet</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Generate your first report from the templates above.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-color)]">
                  {reportsList.map((report, index) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between gap-3 px-5 py-4 transition-all duration-200 hover:bg-[var(--bg-elevated)] animate-in fade-in slide-in-from-left-2"
                      style={{ animationDelay: `${index * 30}ms`, animationFillMode: "backwards" }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{report.name}</p>
                          <span
                            className={cn(
                              "rounded-md border px-2 py-0.5 text-[11px] font-medium",
                              getReportStatusTone(report.status),
                            )}
                          >
                            {formatLabel(report.status || "PENDING")}
                          </span>
                          <span className="rounded-md border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                            {formatLabel(report.type || "Report")}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {new Date(report.createdAt).toLocaleString()} • {report.size || "Calculating..."}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {report.url && report.url !== "#" ? (
                          <a
                            href={report.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--bg-elevated)] hover:scale-105 active:scale-95"
                          >
                            <Download size={12} />
                            Download
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-xs font-medium text-[var(--text-muted)]"
                          >
                            <Download size={12} />
                            Pending
                          </button>
                        )}
                        <ChevronRight size={14} className="text-[var(--text-muted)]" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>

          <aside className="xl:col-span-4 space-y-4">
            <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Compliance Snapshot</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Framework score comparison</p>
              <div className="mt-4">
                {complianceOverview.length > 0 ? (
                  <ComplianceBarChart data={complianceOverview} />
                ) : (
                  <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-sm text-[var(--text-muted)]">
                    Compliance chart appears when frameworks are available.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Output Queue</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Current report generation states</p>
              <div className="mt-4 space-y-3">
                {[
                  {
                    label: "Completed",
                    value: queueStats.completed,
                    tone: "text-emerald-200 border-emerald-400/30 bg-emerald-500/10",
                    icon: CheckCircle2,
                  },
                  {
                    label: "Pending",
                    value: queueStats.pending,
                    tone: "text-yellow-200 border-yellow-400/30 bg-yellow-500/10",
                    icon: Clock3,
                  },
                  {
                    label: "Failed",
                    value: queueStats.failed,
                    tone: "text-red-200 border-red-400/30 bg-red-500/10",
                    icon: AlertTriangle,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-3 py-2.5",
                        item.tone,
                      )}
                    >
                      <span className="inline-flex items-center gap-2 text-sm font-medium">
                        <Icon size={13} />
                        {item.label}
                      </span>
                      <span className="text-lg font-semibold">
                        {numberFormatter.format(item.value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Top Frameworks</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Highest compliance performance</p>
              <div className="mt-4 space-y-3">
                {complianceOverview.length > 0 ? (
                  [...complianceOverview]
                    .sort((a, b) => b.compliancePercentage - a.compliancePercentage)
                    .slice(0, 4)
                    .map((framework) => (
                      <div key={framework.frameworkId}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">{framework.frameworkName}</span>
                          <span
                            className={cn(
                              "font-semibold",
                              framework.compliancePercentage >= 80
                                ? "text-emerald-300"
                                : framework.compliancePercentage >= 60
                                  ? "text-yellow-300"
                                  : "text-red-300",
                            )}
                          >
                            {framework.compliancePercentage.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              framework.compliancePercentage >= 80
                                ? "bg-emerald-400"
                                : framework.compliancePercentage >= 60
                                  ? "bg-yellow-400"
                                  : "bg-red-400",
                            )}
                            style={{
                              width: `${Math.min(
                                Math.max(framework.compliancePercentage, 0),
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">No framework data available yet.</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Custom Dashboard Views</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Build widget layouts, share by role, and set defaults.
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-[var(--text-muted)]">View Name</label>
                  <input
                    className="input"
                    value={viewName}
                    onChange={(event) => setViewName(event.target.value)}
                    placeholder="SOC Operations View"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs text-[var(--text-secondary)]">
                    Share Role
                    <select
                      className="input mt-1 h-9 text-xs"
                      value={viewShareRole}
                      onChange={(event) => setViewShareRole(event.target.value)}
                    >
                      <option value="ANALYST">ANALYST</option>
                      <option value="PENTESTER">PENTESTER</option>
                      <option value="IT_OFFICER">IT_OFFICER</option>
                      <option value="MAIN_OFFICER">MAIN_OFFICER</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={viewDefault}
                      onChange={(event) => setViewDefault(event.target.checked)}
                    />
                    Default View
                  </label>
                </div>

                <WidgetBuilder
                  availableWidgets={dashboardWidgetCatalog}
                  value={viewWidgets}
                  onChange={setViewWidgets}
                />

                <button
                  type="button"
                  onClick={() => void saveDashboardView()}
                  disabled={!viewName.trim() || isSavingView}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingView ? "Saving..." : "Save View"}
                </button>

                <div className="space-y-2">
                  {dashboardViews.map((view) => (
                    <div
                      key={view.id}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setViewName(view.name);
                          setViewWidgets(Array.isArray(view.layout?.widgets) ? view.layout.widgets : []);
                          setViewDefault(view.isDefault);
                        }}
                        className="truncate text-left text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        {view.name} {view.isDefault ? "• default" : ""}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteDashboardView(view.id)}
                        disabled={isSavingView}
                        className="rounded-md border border-red-400/35 bg-red-500/10 px-2 py-1 text-[11px] text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                  {dashboardViews.length === 0 ? (
                    <p className="text-xs text-slate-500">No saved views yet.</p>
                  ) : null}
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </DashboardLayout>
  );
}
