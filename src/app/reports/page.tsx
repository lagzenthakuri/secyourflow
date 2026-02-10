"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Modal } from "@/components/ui/Modal";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
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
  description?: string | null;
  format?: string | null;
  frequency?: string | null;
  status?: string | null;
  url?: string | null;
  size?: string | null;
  createdAt: string;
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
  return "border-slate-400/35 bg-slate-500/10 text-slate-200";
}

export default function ReportsPage() {
  const [reportsList, setReportsList] = useState<ReportRecord[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(reportTemplates[0].id);
  const [scheduleFrequency, setScheduleFrequency] = useState("Weekly");
  const [scheduleRecipients, setScheduleRecipients] = useState("");

  const selectedTemplate = useMemo(
    () => reportTemplates.find((template) => template.id === selectedTemplateId) || null,
    [selectedTemplateId],
  );

  const fetchData = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        setPageError(null);
        const [reportsRes, dashboardRes] = await Promise.all([
          fetch("/api/reports", { cache: "no-store" }),
          fetch("/api/dashboard", { cache: "no-store" }),
        ]);

        if (!reportsRes.ok || !dashboardRes.ok) {
          throw new Error("Failed to fetch reporting data");
        }

        const reportsPayload = (await reportsRes.json()) as ReportRecord[] | { error?: string };
        const dashboardPayload = (await dashboardRes.json()) as DashboardData;

        setReportsList(Array.isArray(reportsPayload) ? reportsPayload : []);
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
            type: template.type,
            description: template.description,
            format: template.format,
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

  const openScheduleModal = useCallback((templateId?: string) => {
    if (templateId) {
      setSelectedTemplateId(templateId);
    }
    setIsScheduleModalOpen(true);
  }, []);

  const handleSchedule = useCallback(() => {
    if (!selectedTemplate) {
      setActionError("Select a template to schedule.");
      return;
    }

    setActionError(null);
    setIsScheduleModalOpen(false);
    alert(
      `Scheduled ${selectedTemplate.name} (${scheduleFrequency})` +
        (scheduleRecipients.trim() ? ` for ${scheduleRecipients.trim()}` : ""),
    );
  }, [scheduleFrequency, scheduleRecipients, selectedTemplate]);

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
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(132deg,rgba(56,189,248,0.2),rgba(18,18,26,0.9)_44%,rgba(18,18,26,0.96))] p-6 sm:p-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky-300/20 blur-3xl animate-pulse" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/35 bg-sky-300/10 px-3 py-1 text-xs font-medium text-sky-200">
                <FileText size={13} />
                Reporting Workspace
              </div>
              <h1 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">Reports</h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-200 sm:text-base">
                Generate decision-ready reporting for SOC leadership, auditors, and operational teams
                with clear trends, compliance posture, and remediation outcomes.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-100">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  {numberFormatter.format(reportsList.length)} generated reports
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  {numberFormatter.format(queueStats.pending)} in queue
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  Top framework: {topComplianceName}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => void fetchData({ silent: true })}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-white/15 hover:scale-105 active:scale-95"
              >
                <RefreshCw
                  size={14}
                  className={isRefreshing || isLoading ? "animate-spin" : ""}
                />
                Refresh
              </button>
              <Link
                href="/reports/activity"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-white/15 hover:scale-105 active:scale-95"
              >
                <Clock3 size={14} />
                Activity
              </Link>
              <button
                type="button"
                onClick={() => openScheduleModal()}
                className="inline-flex items-center gap-2 rounded-xl border border-sky-300/30 bg-sky-300/10 px-4 py-2 text-sm font-medium text-sky-100 transition-all duration-200 hover:bg-sky-300/20 hover:scale-105 active:scale-95"
              >
                <Calendar size={14} />
                Schedule
              </button>
              <button
                type="button"
                onClick={() => void handleGenerate(reportTemplates[0])}
                disabled={isGenerating !== null}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition-all duration-200 hover:bg-sky-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
              >
                <Plus size={14} />
                Generate Snapshot
              </button>
            </div>
          </div>
        </section>

        {pageError ? (
          <section className="rounded-2xl border border-red-400/25 bg-red-500/5 p-4 text-sm text-red-200">
            {pageError}
          </section>
        ) : null}

        {actionError ? (
          <section className="rounded-2xl border border-red-400/25 bg-red-500/5 p-4 text-sm text-red-200">
            {actionError}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Risk Score",
              value: stats.overallRiskScore.toFixed(1),
              hint: "Latest aggregate posture",
              icon: TrendingDown,
            },
            {
              label: "Compliance",
              value: `${stats.complianceScore.toFixed(0)}%`,
              hint: "Current control coverage",
              icon: FileCheck,
            },
            {
              label: "Fixed This Month",
              value: numberFormatter.format(stats.fixedThisMonth),
              hint: "Resolved vulnerabilities",
              icon: Shield,
            },
            {
              label: "Open Vulnerabilities",
              value: numberFormatter.format(stats.openVulnerabilities),
              hint: "Pending remediation",
              icon: AlertTriangle,
            },
            {
              label: "MTTR",
              value: `${stats.meanTimeToRemediate} days`,
              hint: "Mean time to remediate",
              icon: Sparkles,
            },
          ].map((metric, index) => {
            const Icon = metric.icon;
            return (
              <article
                key={metric.label}
                className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/35 hover:shadow-lg hover:shadow-sky-300/10 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 90}ms`, animationFillMode: "backwards" }}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm text-slate-300">{metric.label}</p>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2 transition-transform duration-200 hover:scale-110">
                    <Icon size={15} className="text-slate-200" />
                  </div>
                </div>
                <p className="mt-4 text-2xl font-semibold text-white">{metric.value}</p>
                <p className="mt-1 text-sm text-slate-400">{metric.hint}</p>
              </article>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-2 animate-in fade-in slide-in-from-bottom-3 duration-500" style={{ animationDelay: '450ms', animationFillMode: 'backwards' }}>
          <article className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">Risk Trend</h2>
                <p className="text-sm text-slate-400">Last six snapshots</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-slate-400">
                Governance signal
              </span>
            </div>
            <RiskTrendChart data={riskTrends} />
          </article>

          <article className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">Remediation Activity</h2>
                <p className="text-sm text-slate-400">Opened vs closed findings</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-slate-400">
                Operational throughput
              </span>
            </div>
            <VulnStatusChart data={remediationTrends} />
          </article>
        </section>

        <section className="grid gap-5 xl:grid-cols-12">
          <div className="xl:col-span-8 space-y-4">
            <article className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-white">Report Templates</h2>
                  <p className="text-sm text-slate-400">
                    Generate instantly or schedule recurring delivery.
                  </p>
                </div>
                <span className="text-xs text-slate-500">
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
                        "rounded-xl border bg-white/[0.02] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.04] hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-2",
                        meta.border,
                      )}
                      style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                          <Icon size={15} className={meta.iconTone} />
                        </div>
                        <div className="min-w-0">
                          <h3 className={cn("text-sm font-semibold", meta.tone)}>{template.name}</h3>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">
                            {template.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                        <span>{template.cadence}</span>
                        <span>{template.format}</span>
                      </div>

                      <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
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
                        <button
                          type="button"
                          onClick={() => openScheduleModal(template.id)}
                          className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-200 transition-all duration-200 hover:bg-white/[0.08] hover:scale-105 active:scale-95"
                        >
                          <Calendar size={12} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-white">Recently Generated</h2>
                  <p className="text-sm text-slate-400">Latest report outputs and status</p>
                </div>
                <span className="text-xs text-slate-500">
                  {numberFormatter.format(reportsList.length)} total
                </span>
              </div>

              {reportsList.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="mx-auto h-10 w-10 text-slate-500" />
                  <p className="mt-4 text-base font-medium text-white">No Reports Yet</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Generate your first report from the templates above.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {reportsList.map((report, index) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between gap-3 px-5 py-4 transition-all duration-200 hover:bg-white/[0.03] animate-in fade-in slide-in-from-left-2"
                      style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'backwards' }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-white">{report.name}</p>
                          <span
                            className={cn(
                              "rounded-md border px-2 py-0.5 text-[11px] font-medium",
                              getReportStatusTone(report.status),
                            )}
                          >
                            {formatLabel(report.status || "PENDING")}
                          </span>
                          <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-300">
                            {formatLabel(report.type || "Report")}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(report.createdAt).toLocaleString()} • {report.size || "Calculating..."}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {report.url && report.url !== "#" ? (
                            <a
                            href={report.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-200 transition-all duration-200 hover:bg-white/[0.08] hover:scale-105 active:scale-95"
                          >
                            <Download size={12} />
                            Download
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs font-medium text-slate-500"
                          >
                            <Download size={12} />
                            Pending
                          </button>
                        )}
                        <ChevronRight size={14} className="text-slate-500" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>

          <aside className="xl:col-span-4 space-y-4">
            <section className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5">
              <h3 className="text-base font-semibold text-white">Compliance Snapshot</h3>
              <p className="mt-1 text-sm text-slate-400">Framework score comparison</p>
              <div className="mt-4">
                {complianceOverview.length > 0 ? (
                  <ComplianceBarChart data={complianceOverview} />
                ) : (
                  <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-sm text-slate-400">
                    Compliance chart appears when frameworks are available.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5">
              <h3 className="text-base font-semibold text-white">Output Queue</h3>
              <p className="mt-1 text-sm text-slate-400">Current report generation states</p>
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

            <section className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5">
              <h3 className="text-base font-semibold text-white">Top Frameworks</h3>
              <p className="mt-1 text-sm text-slate-400">Highest compliance performance</p>
              <div className="mt-4 space-y-3">
                {complianceOverview.length > 0 ? (
                  [...complianceOverview]
                    .sort((a, b) => b.compliancePercentage - a.compliancePercentage)
                    .slice(0, 4)
                    .map((framework) => (
                      <div key={framework.frameworkId}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-slate-200">{framework.frameworkName}</span>
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
                  <p className="text-sm text-slate-400">No framework data available yet.</p>
                )}
              </div>
            </section>
          </aside>
        </section>
      </div>

      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title="Schedule Report"
        footer={
          <div className="flex justify-end gap-3">
            <button className="btn btn-secondary" onClick={() => setIsScheduleModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSchedule}>
              Save Schedule
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-white">Template</label>
            <select
              className="input"
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
            >
              {reportTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-white">Frequency</label>
            <select
              className="input"
              value={scheduleFrequency}
              onChange={(event) => setScheduleFrequency(event.target.value)}
            >
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
              <option>Quarterly</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-white">
              Recipients (Email)
            </label>
            <input
              type="text"
              className="input"
              placeholder="security-team@company.com"
              value={scheduleRecipients}
              onChange={(event) => setScheduleRecipients(event.target.value)}
            />
          </div>
          {selectedTemplate ? (
            <div className="rounded-xl border border-sky-300/25 bg-sky-300/10 p-3 text-xs text-sky-100">
              {selectedTemplate.name} will be scheduled as {scheduleFrequency.toLowerCase()} output.
            </div>
          ) : null}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
