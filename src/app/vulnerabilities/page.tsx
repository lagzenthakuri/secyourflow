"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddVulnerabilityModal } from "@/components/vulnerabilities/AddVulnerabilityModal";
import { EditVulnerabilityModal } from "@/components/vulnerabilities/EditVulnerabilityModal";
import { VulnerabilityActions } from "@/components/vulnerabilities/VulnerabilityActions";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { cn } from "@/lib/utils";
import { Vulnerability } from "@/types";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Filter,
  Plus,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

const SeverityDistributionChart = dynamic(
  () =>
    import("@/components/charts/DashboardCharts").then(
      (mod) => mod.SeverityDistributionChart,
    ),
  {
    ssr: false,
    loading: () => <div className="h-[220px] animate-pulse rounded-xl bg-white/5" />,
  },
);

const RiskAssessmentView = dynamic(
  () =>
    import("@/components/vulnerabilities/RiskAssessmentView").then(
      (mod) => mod.RiskAssessmentView,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
        Loading risk assessment...
      </div>
    ),
  },
);

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SeverityDistributionItem {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";
  count: number;
}

interface SourceDistributionItem {
  source: string;
  count: number;
}

interface EPSSDistribution {
  high: number;
  medium: number;
  low: number;
  minimal: number;
}

interface VulnerabilitiesSummary {
  severityDistribution: SeverityDistributionItem[];
  sourceDistribution: SourceDistributionItem[];
  epssDistribution: EPSSDistribution;
  exploitedCount?: number;
}

interface VulnerabilitiesResponse {
  data: Vulnerability[];
  pagination: PaginationState;
  summary: VulnerabilitiesSummary;
}

const severityOptions = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

const statusOptions = [
  "OPEN",
  "IN_PROGRESS",
  "MITIGATED",
  "FIXED",
  "ACCEPTED",
  "FALSE_POSITIVE",
] as const;

const numberFormatter = new Intl.NumberFormat("en-US");

const severityColor: Record<string, string> = {
  CRITICAL: "text-red-300 border-red-400/35 bg-red-500/10",
  HIGH: "text-orange-300 border-orange-400/35 bg-orange-500/10",
  MEDIUM: "text-yellow-300 border-yellow-400/35 bg-yellow-500/10",
  LOW: "text-emerald-300 border-emerald-400/35 bg-emerald-500/10",
  INFORMATIONAL: "text-slate-300 border-slate-400/35 bg-slate-500/10",
};

const statusColor: Record<string, string> = {
  OPEN: "text-red-300 border-red-400/35 bg-red-500/10",
  IN_PROGRESS: "text-sky-300 border-sky-400/35 bg-sky-500/10",
  MITIGATED: "text-violet-300 border-violet-400/35 bg-violet-500/10",
  FIXED: "text-emerald-300 border-emerald-400/35 bg-emerald-500/10",
  ACCEPTED: "text-slate-300 border-slate-400/35 bg-slate-500/10",
  FALSE_POSITIVE: "text-slate-300 border-slate-400/35 bg-slate-500/10",
};

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeCsv(value: unknown): string {
  const str = String(value ?? "");
  if (!str.includes(",") && !str.includes("\"") && !str.includes("\n")) {
    return str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

function toChartSeverityData(data: SeverityDistributionItem[]) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  return data.map((item) => ({
    ...item,
    percentage: total > 0 ? Number(((item.count / total) * 100).toFixed(1)) : 0,
  }));
}

export default function VulnerabilitiesPage() {
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedSource, setSelectedSource] = useState<string>("ALL");
  const [showExploited, setShowExploited] = useState(false);
  const [showKevOnly, setShowKevOnly] = useState(false);

  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [summary, setSummary] = useState<VulnerabilitiesSummary | null>(null);
  const [activeVulnId, setActiveVulnId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVuln, setEditingVuln] = useState<Vulnerability | null>(null);

  const fetchVulnerabilities = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        setError(null);

        const params = new URLSearchParams({
          page: String(pagination.page),
          limit: String(pagination.limit),
        });

        if (searchQuery.trim()) params.set("search", searchQuery.trim());
        if (selectedSeverity !== "ALL") params.set("severity", selectedSeverity);
        if (selectedStatus !== "ALL") params.set("status", selectedStatus);
        if (selectedSource !== "ALL") params.set("source", selectedSource);
        if (showExploited) params.set("exploited", "true");
        if (showKevOnly) params.set("kev", "true");

        const response = await fetch(`/api/vulnerabilities?${params.toString()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch vulnerabilities");
        }

        const result = (await response.json()) as VulnerabilitiesResponse;
        setVulns(result.data ?? []);
        setSummary(result.summary ?? null);
        setPagination((prev) => ({
          ...prev,
          ...result.pagination,
          page: result.pagination?.page ?? prev.page,
          total: result.pagination?.total ?? prev.total,
          totalPages: result.pagination?.totalPages ?? prev.totalPages,
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch vulnerabilities");
        setVulns([]);
      } finally {
        if (silent) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [
      pagination.page,
      pagination.limit,
      searchQuery,
      selectedSeverity,
      selectedStatus,
      selectedSource,
      showExploited,
      showKevOnly,
    ],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchVulnerabilities();
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchVulnerabilities]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        setActionError(null);
        setDeletingId(id);

        const response = await fetch(`/api/vulnerabilities/${id}`, {
          method: "DELETE",
        });

        const result = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(result.error || "Failed to delete vulnerability");
        }

        await fetchVulnerabilities({ silent: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete vulnerability";
        setActionError(message);
      } finally {
        setDeletingId(null);
      }
    },
    [fetchVulnerabilities],
  );

  const exportCsv = () => {
    if (!vulns.length) return;

    const rows = [
      [
        "CVE ID",
        "Title",
        "Severity",
        "CVSS",
        "EPSS",
        "Status",
        "Source",
        "Exploited",
        "CISA KEV",
      ],
      ...vulns.map((item) => [
        item.cveId || "",
        item.title,
        item.severity,
        item.cvssScore ?? "",
        item.epssScore ?? "",
        item.status,
        item.source,
        item.isExploited ? "Yes" : "No",
        item.cisaKev ? "Yes" : "No",
      ]),
    ];

    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vulnerabilities.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedSeverity("ALL");
    setSelectedStatus("ALL");
    setSelectedSource("ALL");
    setShowExploited(false);
    setShowKevOnly(false);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const severityDistribution = useMemo(
    () => summary?.severityDistribution ?? [],
    [summary?.severityDistribution],
  );

  const sourceDistribution = useMemo(
    () => summary?.sourceDistribution ?? [],
    [summary?.sourceDistribution],
  );

  const epssDistribution = useMemo(
    () =>
      summary?.epssDistribution ?? {
        high: 0,
        medium: 0,
        low: 0,
        minimal: 0,
      },
    [summary?.epssDistribution],
  );

  const sourceOptions = useMemo(
    () => Array.from(new Set(sourceDistribution.map((item) => item.source))),
    [sourceDistribution],
  );

  const criticalCount = useMemo(
    () =>
      severityDistribution.find((entry) => entry.severity === "CRITICAL")?.count || 0,
    [severityDistribution],
  );

  const severityChartData = useMemo(
    () => toChartSeverityData(severityDistribution),
    [severityDistribution],
  );

  const exploitedCount = useMemo(() => {
    if (typeof summary?.exploitedCount === "number") {
      return summary.exploitedCount;
    }
    return vulns.filter((item) => item.isExploited).length;
  }, [summary?.exploitedCount, vulns]);

  const openOnPage = useMemo(
    () =>
      vulns.filter((item) => item.status === "OPEN" || item.status === "IN_PROGRESS")
        .length,
    [vulns],
  );

  const highestSourceCount = useMemo(
    () => Math.max(1, ...sourceDistribution.map((item) => item.count)),
    [sourceDistribution],
  );

  if (isLoading && vulns.length === 0) {
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
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(132deg,rgba(56,189,248,0.2),rgba(18,18,26,0.9)_44%,rgba(18,18,26,0.96))] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky-300/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/35 bg-sky-300/10 px-3 py-1 text-xs font-medium text-sky-200">
                <Sparkles size={13} />
                Vulnerability Triage Workspace
              </div>
              <h1 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
                Vulnerabilities
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-200 sm:text-base">
                Prioritize and remediate the highest-impact findings with clearer operational
                context for SOC and engineering teams.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-100">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  {numberFormatter.format(pagination.total)} tracked vulnerabilities
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  {criticalCount} critical
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  {exploitedCount} exploited
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={exportCsv}
                disabled={!vulns.length}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={14} />
                Export CSV
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
              >
                <TrendingUp size={14} />
                Import Scan
              </button>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
              >
                <Plus size={14} />
                Add Vulnerability
              </button>
            </div>
          </div>
        </section>

        {actionError ? (
          <section className="rounded-2xl border border-red-400/25 bg-red-500/5 p-3 text-sm text-red-200">
            {actionError}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Vulnerabilities",
              value: numberFormatter.format(pagination.total),
              hint: `${pagination.totalPages} pages`,
              icon: Shield,
            },
            {
              label: "Critical",
              value: numberFormatter.format(criticalCount),
              hint: "Highest remediation priority",
              icon: AlertTriangle,
            },
            {
              label: "Actively Exploited",
              value: numberFormatter.format(exploitedCount),
              hint: "Live threat relevance",
              icon: Zap,
            },
            {
              label: "Open on page",
              value: numberFormatter.format(openOnPage),
              hint: "OPEN or IN_PROGRESS",
              icon: Filter,
            },
          ].map((metric) => {
            const Icon = metric.icon;
            return (
              <article
                key={metric.label}
                className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-sky-300/35"
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm text-slate-300">{metric.label}</p>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <Icon size={15} className="text-slate-200" />
                  </div>
                </div>
                <p className="mt-4 text-3xl font-semibold text-white">{metric.value}</p>
                <p className="mt-1 text-sm text-slate-400">{metric.hint}</p>
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-4">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto]">
            <label className="relative block">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                placeholder="Search by CVE ID, title, or description"
                className="input h-10 w-full !pl-9 text-sm"
              />
            </label>

            <select
              value={selectedSeverity}
              onChange={(event) => {
                setSelectedSeverity(event.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="input h-10 w-full appearance-none text-sm"
            >
              <option value="ALL">All Severities</option>
              {severityOptions.map((severity) => (
                <option key={severity} value={severity}>
                  {formatLabel(severity)}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(event) => {
                setSelectedStatus(event.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="input h-10 w-full appearance-none text-sm"
            >
              <option value="ALL">All Statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatLabel(status)}
                </option>
              ))}
            </select>

            <select
              value={selectedSource}
              onChange={(event) => {
                setSelectedSource(event.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="input h-10 w-full appearance-none text-sm"
            >
              <option value="ALL">All Sources</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-slate-200 transition hover:bg-white/10"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => void fetchVulnerabilities({ silent: true })}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-slate-200 transition hover:bg-white/10"
              >
                {isRefreshing ? "Refreshing" : "Refresh"}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setShowExploited((prev) => !prev);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition",
                showExploited
                  ? "border-red-400/35 bg-red-500/10 text-red-200"
                  : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10",
              )}
            >
              <Zap size={13} />
              Exploited Only
            </button>
            <button
              type="button"
              onClick={() => {
                setShowKevOnly((prev) => !prev);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition",
                showKevOnly
                  ? "border-orange-400/35 bg-orange-500/10 text-orange-200"
                  : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10",
              )}
            >
              CISA KEV Only
            </button>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-400/25 bg-red-500/5 p-4 text-sm text-red-200">
            {error}
          </section>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <article className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)]">
            <header className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Vulnerability Queue</h2>
                <p className="text-sm text-slate-400">
                  Showing {vulns.length} of {numberFormatter.format(pagination.total)} vulnerabilities
                </p>
              </div>
              <div className="text-xs text-slate-500">Page {pagination.page}</div>
            </header>

            {vulns.length === 0 ? (
              <div className="p-16 text-center">
                <Shield className="mx-auto h-12 w-12 text-slate-600" />
                <p className="mt-4 text-sm text-slate-400">No vulnerabilities match current filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {vulns.map((vuln) => {
                  const severityTone =
                    severityColor[vuln.severity] || severityColor.INFORMATIONAL;
                  const statusTone = statusColor[vuln.status] || statusColor.OPEN;
                  const isExpanded = activeVulnId === vuln.id;

                  return (
                    <div
                      key={vuln.id}
                      className={cn(
                        "group p-4 transition hover:bg-white/[0.03]",
                        isExpanded && "bg-white/[0.03]",
                      )}
                    >
                      <div
                        className="flex cursor-pointer items-start gap-3"
                        onClick={() => setActiveVulnId(isExpanded ? null : vuln.id)}
                      >
                        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
                          <Shield size={18} className="text-sky-300" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {vuln.cveId ? (
                              <a
                                href={`https://nvd.nist.gov/vuln/detail/${vuln.cveId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-mono text-xs text-sky-300 hover:text-sky-200"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {vuln.cveId}
                                <ExternalLink size={11} />
                              </a>
                            ) : (
                              <span className="font-mono text-xs text-slate-500">No CVE ID</span>
                            )}

                            <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", severityTone)}>
                              {vuln.severity}
                            </span>

                            <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", statusTone)}>
                              {formatLabel(vuln.status)}
                            </span>

                            {vuln.isExploited ? (
                              <span className="rounded-full border border-red-400/35 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-200">
                                EXPLOITED
                              </span>
                            ) : null}

                            {vuln.cisaKev ? (
                              <span className="rounded-full border border-orange-400/35 bg-orange-500/10 px-2 py-0.5 text-[11px] text-orange-200">
                                CISA KEV
                              </span>
                            ) : null}
                          </div>

                          <h3 className="mt-2 truncate text-sm font-medium text-white">{vuln.title}</h3>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                            {vuln.description || "No description available."}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                            <span>
                              CVSS {typeof vuln.cvssScore === "number" ? vuln.cvssScore.toFixed(1) : "N/A"}
                            </span>
                            <span>
                              EPSS {typeof vuln.epssScore === "number" ? `${(vuln.epssScore * 100).toFixed(1)}%` : "N/A"}
                            </span>
                            <span>Source {vuln.source}</span>
                          </div>
                        </div>

                        <div className="hidden text-right md:block">
                          <p className="text-sm font-semibold text-orange-300">
                            {vuln.affectedAssets || 0}
                          </p>
                          <p className="text-xs text-slate-500">Affected Assets</p>
                        </div>

                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveVulnId(isExpanded ? null : vuln.id)}
                            className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
                          >
                            <ChevronDown
                              size={14}
                              className={cn("transition-transform", isExpanded && "rotate-180")}
                            />
                          </button>
                          <VulnerabilityActions
                            vulnerability={vuln}
                            onEdit={() => setEditingVuln(vuln)}
                            onDelete={() => {
                              void handleDelete(vuln.id);
                            }}
                            isDeleting={deletingId === vuln.id}
                          />
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="mt-4 border-t border-white/10 pt-4 pl-14">
                          <RiskAssessmentView
                            riskEntry={vuln.riskEntries?.[0] as {
                              status?: string;
                              riskScore?: number;
                              impactScore?: number;
                              likelihoodScore?: number;
                              aiAnalysis?: Record<string, unknown>;
                              [key: string]: unknown;
                            } | null | undefined}
                            vulnerabilityId={vuln.id}
                            onRefresh={() => {
                              void fetchVulnerabilities({ silent: true });
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}

            <footer className="flex items-center justify-between border-t border-white/10 p-4">
              <p className="text-xs text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1 || isLoading}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages || isLoading}
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.min(prev.totalPages, prev.page + 1),
                    }))
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </footer>
          </article>

          <div className="space-y-4">
            <article className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5">
              <h2 className="text-lg font-semibold text-white">Severity Distribution</h2>
              <div className="mt-4">
                {severityDistribution.length > 0 ? (
                  <>
                    <SeverityDistributionChart data={severityChartData} />
                    <div className="mt-4 space-y-2">
                      {severityDistribution.map((item) => (
                        <div key={item.severity} className="flex items-center justify-between text-sm">
                          <span className="text-slate-300">{item.severity}</span>
                          <span className="text-white">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                    No severity distribution data available.
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5">
              <h2 className="text-lg font-semibold text-white">Source Distribution</h2>
              <div className="mt-4 space-y-3">
                {sourceDistribution.length > 0 ? (
                  sourceDistribution.map((item) => (
                    <div key={item.source}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-mono">{item.source}</span>
                        <span className="text-slate-400">{item.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-cyan-300"
                          style={{
                            width: `${Math.min((item.count / highestSourceCount) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                    No source distribution data available.
                  </p>
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5">
              <h2 className="text-lg font-semibold text-white">EPSS Ranges</h2>
              <div className="mt-4 space-y-2">
                {[
                  {
                    label: "High (>70%)",
                    value: epssDistribution.high,
                    tone: "text-red-200 border-red-400/35 bg-red-500/10",
                  },
                  {
                    label: "Medium (30-70%)",
                    value: epssDistribution.medium,
                    tone: "text-orange-200 border-orange-400/35 bg-orange-500/10",
                  },
                  {
                    label: "Low (10-30%)",
                    value: epssDistribution.low,
                    tone: "text-yellow-200 border-yellow-400/35 bg-yellow-500/10",
                  },
                  {
                    label: "Minimal (<10%)",
                    value: epssDistribution.minimal,
                    tone: "text-emerald-200 border-emerald-400/35 bg-emerald-500/10",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
                      item.tone,
                    )}
                  >
                    <span>{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      </div>

      <AddVulnerabilityModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          void fetchVulnerabilities({ silent: true });
        }}
      />

      {editingVuln ? (
        <EditVulnerabilityModal
          isOpen={Boolean(editingVuln)}
          vulnerability={editingVuln}
          onClose={() => setEditingVuln(null)}
          onSuccess={() => {
            void fetchVulnerabilities({ silent: true });
          }}
        />
      ) : null}
    </DashboardLayout>
  );
}
