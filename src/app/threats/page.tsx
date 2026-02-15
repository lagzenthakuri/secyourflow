"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { Vulnerability } from "@/types";
import { cn, getTimeAgo } from "@/lib/utils";
import { useUiFeedback } from "@/hooks/useUiFeedback";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CircleDot,
  Download,
  ExternalLink,
  FileUp,
  Filter,
  Network,
  RefreshCw,
  Search,
  Shield,
  Target,
  Users,
  Zap,
} from "lucide-react";

type SeverityTone = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL" | null;

type TabKey = "overview" | "matrix" | "ioc" | "actors";

interface ThreatIndicator {
  id: string;
  type: string;
  value: string;
  normalizedValue: string;
  confidence?: number | null;
  severity?: SeverityTone;
  firstSeen: string;
  lastSeen: string;
  expiresAt?: string | null;
  source?: string | null;
  description?: string | null;
  tags: string[];
  feedId: string;
  techniqueId?: string | null;
}

interface ThreatFeed {
  id: string;
  name: string;
  source: string;
  type: string;
  format: string;
  url?: string | null;
  isActive: boolean;
  lastSync?: string | null;
  syncInterval: number;
}

interface ThreatMatch {
  id: string;
  matchField: string;
  matchValue: string;
  confidence?: number | null;
  status: string;
  indicator: {
    value: string;
    type: string;
    severity?: SeverityTone;
  };
  asset: {
    id: string;
    name: string;
    ipAddress?: string | null;
    hostname?: string | null;
  };
  lastMatchedAt: string;
}

interface ThreatRun {
  id: string;
  status: string;
  startedAt: string;
  finishedAt?: string | null;
  recordsFetched: number;
  recordsCreated: number;
  recordsUpdated: number;
  errors?: unknown;
  feed: {
    name: string;
    source: string;
  };
}

interface ThreatStats {
  activeFeeds: number;
  totalIndicators: number;
  activeIndicators: number;
  criticalIndicators: number;
  matchedAssets: number;
  actorCount: number;
  campaignCount: number;
}

interface ThreatOverviewResponse {
  feeds: ThreatFeed[];
  indicators: ThreatIndicator[];
  matches: ThreatMatch[];
  runs: ThreatRun[];
  stats: ThreatStats;
}

interface AttackTechniqueCell {
  techniqueId: string;
  techniqueExternalId: string;
  techniqueName: string;
  vulnerabilityCount: number;
  indicatorCount: number;
  maxSeverity: SeverityTone;
  lastSeen: string | null;
}

interface AttackTacticRow {
  tacticId: string;
  tacticExternalId: string;
  tacticName: string;
  shortName: string | null;
  techniques: AttackTechniqueCell[];
}

interface AttackMatrixResponse {
  tactics: AttackTacticRow[];
  summary: {
    tacticCount: number;
    techniqueCount: number;
  };
  generatedAt: string;
}

interface ThreatActorRecord {
  id: string;
  externalId?: string | null;
  name: string;
  description?: string | null;
  aliases: string[];
  techniques: Array<{
    externalId: string;
    name: string;
  }>;
  campaignCount: number;
  linkedVulnerabilities: Array<{
    id: string;
    cveId?: string | null;
    title: string;
    severity: SeverityTone;
    source: string;
  }>;
}

interface ThreatCampaignRecord {
  id: string;
  externalId?: string | null;
  name: string;
  description?: string | null;
  actor?: {
    id: string;
    name: string;
    externalId?: string | null;
  } | null;
  techniques: Array<{
    externalId: string;
    name: string;
  }>;
  firstSeen?: string | null;
  lastSeen?: string | null;
}

interface ThreatActorResponse {
  data: ThreatActorRecord[];
}

interface ThreatCampaignResponse {
  data: ThreatCampaignRecord[];
}

interface CorrelationResponse {
  data?: ThreatMatch[];
  summary?: {
    scannedIndicators: number;
    scannedAssets: number;
    matchesCreated: number;
    matchesUpdated: number;
    alertsGenerated: number;
  };
}

interface VulnerabilityResponse {
  data: Vulnerability[];
}

const tabItems: Array<{ key: TabKey; label: string; icon: ComponentType<{ size?: number }> }> = [
  { key: "overview", label: "Overview", icon: Shield },
  { key: "matrix", label: "ATT&CK Matrix", icon: Network },
  { key: "ioc", label: "IOC Workbench", icon: Target },
  { key: "actors", label: "Actors & Campaigns", icon: Users },
];

const severityOptions = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

type SeverityFilter = (typeof severityOptions)[number];

const numberFormatter = new Intl.NumberFormat("en-US");

function getSeverityTone(severity?: SeverityTone) {
  if (severity === "CRITICAL") return "border-red-400/35 bg-red-500/10 text-red-700 dark:text-red-200";
  if (severity === "HIGH") return "border-orange-400/35 bg-orange-500/10 text-orange-700 dark:text-orange-200";
  if (severity === "MEDIUM") return "border-yellow-400/35 bg-yellow-500/10 text-yellow-700 dark:text-yellow-200";
  if (severity === "LOW") return "border-emerald-400/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200";
  return "border-[var(--border-hover)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]";
}

function scoreIntensity(vulnerabilityCount: number, indicatorCount: number): string {
  const score = vulnerabilityCount + indicatorCount;
  if (score >= 10) return "bg-red-500/25 border-red-400/50";
  if (score >= 5) return "bg-orange-500/20 border-orange-400/45";
  if (score >= 2) return "bg-yellow-500/15 border-yellow-400/40";
  if (score >= 1) return "bg-emerald-500/15 border-emerald-400/35";
  return "bg-[var(--bg-tertiary)] border-[var(--border-color)]";
}

export default function ThreatsPage() {
  const { showToast } = useUiFeedback();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const [exploitedVulns, setExploitedVulns] = useState<Vulnerability[]>([]);
  const [kevVulns, setKevVulns] = useState<Vulnerability[]>([]);
  const [overview, setOverview] = useState<ThreatOverviewResponse | null>(null);
  const [matrix, setMatrix] = useState<AttackMatrixResponse | null>(null);
  const [actors, setActors] = useState<ThreatActorRecord[]>([]);
  const [campaigns, setCampaigns] = useState<ThreatCampaignRecord[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [indicatorSearch, setIndicatorSearch] = useState("");
  const [indicatorSeverity, setIndicatorSeverity] = useState<SeverityFilter>("ALL");
  const [importFormat, setImportFormat] = useState<"JSON" | "CSV">("JSON");
  const [importPayload, setImportPayload] = useState("");
  const [newIocValue, setNewIocValue] = useState("");

  const fetchThreats = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        setError(null);

        const [exploitedRes, kevRes, overviewRes, matrixRes, actorsRes, campaignsRes] = await Promise.all([
          fetch("/api/vulnerabilities?exploited=true&limit=25", { cache: "no-store" }),
          fetch("/api/vulnerabilities?kev=true&limit=25", { cache: "no-store" }),
          fetch("/api/threats", { cache: "no-store" }),
          fetch("/api/threats/attack-matrix", { cache: "no-store" }),
          fetch("/api/threats/actors", { cache: "no-store" }),
          fetch("/api/threats/campaigns", { cache: "no-store" }),
        ]);

        if (!exploitedRes.ok || !kevRes.ok || !overviewRes.ok || !actorsRes.ok || !campaignsRes.ok) {
          throw new Error("Failed to fetch threat intelligence data");
        }

        const exploited = (await exploitedRes.json()) as VulnerabilityResponse;
        const kev = (await kevRes.json()) as VulnerabilityResponse;
        const overviewPayload = (await overviewRes.json()) as ThreatOverviewResponse;
        const actorsPayload = (await actorsRes.json()) as ThreatActorResponse;
        const campaignsPayload = (await campaignsRes.json()) as ThreatCampaignResponse;

        setExploitedVulns(exploited.data ?? []);
        setKevVulns(kev.data ?? []);
        setOverview(overviewPayload);
        setActors(actorsPayload.data ?? []);
        setCampaigns(campaignsPayload.data ?? []);

        if (matrixRes.ok) {
          const matrixPayload = (await matrixRes.json()) as AttackMatrixResponse;
          setMatrix(matrixPayload);
        } else {
          setMatrix(null);
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Failed to fetch threats");
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
    void fetchThreats();
  }, [fetchThreats]);

  const exploitedTotal = exploitedVulns.length;
  const kevTotal = kevVulns.length;

  const filteredIndicators = useMemo(() => {
    const indicators = overview?.indicators ?? [];
    return indicators.filter((indicator) => {
      const search = indicatorSearch.trim().toLowerCase();
      const matchesSearch =
        !search ||
        indicator.value.toLowerCase().includes(search) ||
        (indicator.description || "").toLowerCase().includes(search) ||
        (indicator.source || "").toLowerCase().includes(search);

      const matchesSeverity = indicatorSeverity === "ALL" || indicator.severity === indicatorSeverity;

      return matchesSearch && matchesSeverity;
    });
  }, [overview?.indicators, indicatorSearch, indicatorSeverity]);

  const runCorrelation = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/threats/correlation", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Correlation run failed");
      }

      const result = (await response.json()) as CorrelationResponse;
      await fetchThreats({ silent: true });
      if (result.summary) {
        showToast({
          title: "Correlation complete",
          description: `${result.summary.matchesCreated} new, ${result.summary.matchesUpdated} updated, ${result.summary.alertsGenerated} alerts generated.`,
          intent: "success",
        });
      }
    } catch (requestError) {
      showToast({
        title: "Correlation failed",
        description: requestError instanceof Error ? requestError.message : "Correlation failed",
        intent: "error",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const submitImport = async () => {
    if (!importPayload.trim()) return;
    setIsRefreshing(true);

    try {
      const payload =
        importFormat === "JSON"
          ? {
            format: "JSON",
            data: JSON.parse(importPayload),
          }
          : {
            format: "CSV",
            data: importPayload,
          };

      const response = await fetch("/api/threats/iocs/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string; summary?: { created: number; updated: number; skipped: number } };
      if (!response.ok) {
        throw new Error(data.error || "IOC import failed");
      }

      showToast({
        title: "IOC import complete",
        description: `${data.summary?.created ?? 0} created, ${data.summary?.updated ?? 0} updated, ${data.summary?.skipped ?? 0} skipped.`,
        intent: "success",
      });
      setImportPayload("");
      await fetchThreats({ silent: true });
    } catch (requestError) {
      showToast({
        title: "IOC import failed",
        description: requestError instanceof Error ? requestError.message : "IOC import failed",
        intent: "error",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const addManualIoc = async () => {
    if (!newIocValue.trim()) return;
    setIsRefreshing(true);

    try {
      const response = await fetch("/api/threats/iocs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          value: newIocValue.trim(),
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to add IOC");
      }

      setNewIocValue("");
      await fetchThreats({ silent: true });
    } catch (requestError) {
      showToast({
        title: "Failed to add IOC",
        description: requestError instanceof Error ? requestError.message : "Failed to add IOC",
        intent: "error",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const exportIocs = (format: "csv" | "json") => {
    window.open(`/api/threats/iocs/export?format=${format}`, "_blank", "noopener,noreferrer");
  };

  if (isLoading && !overview) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <ShieldLoader size="lg" variant="cyber" />
        </div>
      </DashboardLayout>
    );
  }

  const stats = overview?.stats;

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          title="Live Threats"
          description="ATT&CK context, IOC correlation, and actor intelligence in one response surface."
          badge={
            <>
              <CircleDot size={12} />
              Threat Intelligence Console
            </>
          }
          actions={
            <>
              <button
                type="button"
                onClick={() => void fetchThreats({ silent: true })}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)]"
              >
                <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                Refresh
              </button>
              <button
                type="button"
                onClick={runCorrelation}
                className="inline-flex items-center gap-2 rounded-xl border border-red-300/45 bg-red-100/90 px-4 py-2 text-sm font-medium text-red-800 transition hover:bg-red-200/80 dark:border-red-300/35 dark:bg-red-400/10 dark:text-red-100 dark:hover:bg-red-400/20"
              >
                <Target size={14} />
                Run Correlation
              </button>
            </>
          }
          stats={[
            {
              label: "Exploited Vulns",
              value: exploitedTotal,
              trend: { value: "Confirmed exploitation", isUp: false },
              icon: Zap,
            },
            {
              label: "CISA KEV",
              value: kevTotal,
              trend: { value: "Known exploited", isUp: false },
              icon: AlertTriangle,
            },
            {
              label: "Active Feeds",
              value: stats?.activeFeeds ?? 0,
              trend: { value: "Intelligence sources", neutral: true },
              icon: Activity,
            },
            {
              label: "Indicators",
              value: numberFormatter.format(stats?.totalIndicators ?? 0),
              trend: { value: "Total IOC records", neutral: true },
              icon: Shield,
            },
            {
              label: "Matched Assets",
              value: numberFormatter.format(stats?.matchedAssets ?? 0),
              trend: { value: "Correlation hits", neutral: true },
              icon: Target,
            },
            {
              label: "Actors",
              value: numberFormatter.format(stats?.actorCount ?? 0),
              trend: { value: "Tracked profiles", neutral: true },
              icon: Users,
            },
          ]}
        />

        <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition",
                  active
                    ? "border-sky-600/55 bg-sky-100/90 text-sky-900 font-semibold dark:border-sky-300/45 dark:bg-sky-400/15 dark:text-sky-400"
                    : "border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
                )}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </section>

        {activeTab === "overview" ? (
          <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <article className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <header className="border-b border-[var(--border-color)] p-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Exploited Vulnerability Queue</h2>
                <p className="text-sm text-[var(--text-secondary)]">High-priority findings with active exploitation signals.</p>
              </header>
              <div className="divide-y divide-[var(--border-color)]">
                {exploitedVulns.length > 0 ? (
                  exploitedVulns.slice(0, 20).map((vulnerability) => (
                    <div key={vulnerability.id} className="p-4">
                      <div className="flex items-center gap-2">
                        {vulnerability.cveId ? (
                          <a
                            href={`https://nvd.nist.gov/vuln/detail/${vulnerability.cveId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-xs text-sky-700 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
                          >
                            {vulnerability.cveId}
                            <ExternalLink size={11} />
                          </a>
                        ) : null}
                        <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", getSeverityTone(vulnerability.severity))}>
                          {vulnerability.severity}
                        </span>
                        {vulnerability.cisaKev ? (
                          <span className="rounded-full border border-orange-400/35 bg-orange-500/10 px-2 py-0.5 text-[11px] text-orange-700 dark:text-orange-200">
                            KEV
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-2 text-sm font-medium text-[var(--text-primary)]">{vulnerability.title}</h3>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                        <span>EPSS: {((vulnerability.epssScore ?? 0) * 100).toFixed(1)}%</span>
                        <span>Assets: {vulnerability.affectedAssets ?? 0}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-sm text-[var(--text-muted)]">No exploited vulnerabilities found.</div>
                )}
              </div>
              <div className="border-t border-[var(--border-color)] p-4">
                <Link href="/vulnerabilities?filter=exploited" className="inline-flex items-center gap-2 text-sm text-sky-700 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200">
                  Open vulnerability queue <ArrowRight size={14} />
                </Link>
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <header className="border-b border-[var(--border-color)] p-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Feed Activity</h2>
                <p className="text-sm text-[var(--text-secondary)]">Latest ingestion runs and sync outcomes.</p>
              </header>
              <div className="divide-y divide-[var(--border-color)]">
                {(overview?.runs ?? []).slice(0, 12).map((run) => (
                  <div key={run.id} className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-[var(--text-primary)]">{run.feed.name}</p>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px]",
                          run.status === "SUCCESS"
                            ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                            : run.status === "PARTIAL"
                              ? "border-yellow-400/35 bg-yellow-500/10 text-yellow-700 dark:text-yellow-200"
                              : "border-red-400/35 bg-red-500/10 text-red-700 dark:text-red-200",
                        )}
                      >
                        {run.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {run.feed.source} • fetched {run.recordsFetched} • created {run.recordsCreated} • updated {run.recordsUpdated}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{getTimeAgo(new Date(run.startedAt))}</p>
                  </div>
                ))}
                {(overview?.runs ?? []).length === 0 ? <div className="p-6 text-sm text-[var(--text-muted)]">No feed runs yet.</div> : null}
              </div>
            </article>
          </section>
        ) : null}

        {activeTab === "matrix" ? (
          <section className="space-y-4">
            <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">MITRE ATT&CK Matrix</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Technique heat shows combined vulnerability mappings and active IOC signals.
              </p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                {matrix
                  ? `Generated ${getTimeAgo(new Date(matrix.generatedAt))} • ${matrix.summary.tacticCount} tactics • ${matrix.summary.techniqueCount} technique mappings`
                  : "Matrix not available. Run threat intel sync first."}
              </p>
            </article>

            {matrix ? (
              <div className="grid gap-4 xl:grid-cols-3">
                {matrix.tactics.map((tactic) => (
                  <article key={tactic.tacticId} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
                    <div className="mb-3">
                      <p className="text-xs text-sky-700 dark:text-sky-300">{tactic.tacticExternalId}</p>
                      <h3 className="text-base font-semibold text-[var(--text-primary)]">{tactic.tacticName}</h3>
                      {tactic.shortName ? <p className="text-xs text-[var(--text-muted)]">{tactic.shortName}</p> : null}
                    </div>
                    <div className="space-y-2">
                      {tactic.techniques.map((technique) => (
                        <div
                          key={technique.techniqueId}
                          className={cn(
                            "rounded-lg border p-3",
                            scoreIntensity(technique.vulnerabilityCount, technique.indicatorCount),
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs text-sky-700 dark:text-sky-300">{technique.techniqueExternalId}</p>
                              <p className="text-sm text-[var(--text-primary)]">{technique.techniqueName}</p>
                            </div>
                            {technique.maxSeverity ? (
                              <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", getSeverityTone(technique.maxSeverity))}>
                                {technique.maxSeverity}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--text-secondary)]">
                            <span>Vulns: {technique.vulnerabilityCount}</span>
                            <span>IOCs: {technique.indicatorCount}</span>
                            {technique.lastSeen ? <span>Seen: {getTimeAgo(new Date(technique.lastSeen))}</span> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {activeTab === "ioc" ? (
          <section className="space-y-4">
            <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">IOC Workbench</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Search, import/export, and enrich indicator coverage.</p>

              <div className="mt-3 grid gap-2 md:grid-cols-[1.2fr_0.8fr]">
                <label className="relative block">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={indicatorSearch}
                    onChange={(event) => setIndicatorSearch(event.target.value)}
                    placeholder="Search indicators"
                    className="input h-9 w-full !pl-9 text-sm bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                  />
                </label>

                <div className="relative">
                  <Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <select
                    value={indicatorSeverity}
                    onChange={(event) => setIndicatorSeverity(event.target.value as SeverityFilter)}
                    className="input h-9 w-full appearance-none !pl-9 text-sm bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                  >
                    {severityOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === "ALL" ? "All Severities" : option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => exportIocs("csv")}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-sm text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)]"
                >
                  <Download size={14} />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => exportIocs("json")}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-sm text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)]"
                >
                  <Download size={14} />
                  Export JSON
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Add Manual IOC</h3>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newIocValue}
                  onChange={(event) => setNewIocValue(event.target.value)}
                  placeholder="e.g. malicious.example.com or 1.2.3.4"
                  className="input h-9 flex-1 text-sm bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                />
                <button
                  type="button"
                  onClick={addManualIoc}
                  className="rounded-lg border border-sky-300/35 bg-sky-400/15 px-3 text-sm text-sky-700 dark:text-sky-100 transition hover:bg-sky-400/20"
                >
                  Add IOC
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Import IOC Feed Data</h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={importFormat}
                  onChange={(event) => setImportFormat(event.target.value as "JSON" | "CSV")}
                  className="input h-8 w-28 text-sm bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                >
                  <option value="JSON">JSON</option>
                  <option value="CSV">CSV</option>
                </select>
                <button
                  type="button"
                  onClick={submitImport}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/35 bg-emerald-400/15 px-3 py-1.5 text-sm text-emerald-700 dark:text-emerald-100 transition hover:bg-emerald-400/20"
                >
                  <FileUp size={14} />
                  Import
                </button>
              </div>
              <textarea
                value={importPayload}
                onChange={(event) => setImportPayload(event.target.value)}
                placeholder={
                  importFormat === "JSON"
                    ? '[{"value":"bad.example.com","type":"DOMAIN"}]'
                    : "value,type,severity\nbad.example.com,DOMAIN,HIGH"
                }
                className="input mt-2 min-h-[150px] w-full text-xs font-mono bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
              />
            </article>

            <article className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <header className="border-b border-[var(--border-color)] p-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Indicators ({filteredIndicators.length})</h3>
              </header>
              <div className="divide-y divide-[var(--border-color)]">
                {filteredIndicators.slice(0, 60).map((indicator) => (
                  <div key={indicator.id} className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-sky-400/35 bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-700 dark:text-sky-200">
                        {indicator.type}
                      </span>
                      {indicator.severity ? (
                        <span className={cn("rounded-full border px-2 py-0.5 text-[11px]", getSeverityTone(indicator.severity))}>
                          {indicator.severity}
                        </span>
                      ) : null}
                      {typeof indicator.confidence === "number" ? (
                        <span className="text-xs text-[var(--text-muted)]">Confidence: {indicator.confidence}%</span>
                      ) : null}
                    </div>
                    <p className="mt-2 font-mono text-sm text-[var(--text-primary)]">{indicator.value}</p>
                    {indicator.description ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{indicator.description}</p> : null}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                      <span>Last seen: {getTimeAgo(new Date(indicator.lastSeen))}</span>
                      {indicator.source ? <span>Source: {indicator.source}</span> : null}
                      {indicator.techniqueId ? <span>Technique: {indicator.techniqueId}</span> : null}
                    </div>
                  </div>
                ))}
                {filteredIndicators.length === 0 ? <div className="p-6 text-sm text-[var(--text-muted)]">No indicators found.</div> : null}
              </div>
            </article>
          </section>
        ) : null}

        {activeTab === "actors" ? (
          <section className="grid gap-4 xl:grid-cols-2">
            <article className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <header className="border-b border-[var(--border-color)] p-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Threat Actors</h2>
                <p className="text-sm text-[var(--text-muted)]">Profiles linked to ATT&CK TTPs and vulnerabilities.</p>
              </header>
              <div className="divide-y divide-[var(--border-color)]">
                {actors.map((actor) => (
                  <div key={actor.id} className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {actor.externalId ? <span className="font-mono text-xs text-sky-700 dark:text-sky-300">{actor.externalId}</span> : null}
                      <h3 className="text-sm font-medium text-[var(--text-primary)]">{actor.name}</h3>
                    </div>
                    {actor.description ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{actor.description}</p> : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {actor.techniques.slice(0, 8).map((technique) => (
                        <span key={`${actor.id}-${technique.externalId}`} className="rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                          {technique.externalId}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-[var(--text-muted)]">
                      Campaigns: {actor.campaignCount} • Linked vulnerabilities: {actor.linkedVulnerabilities.length}
                    </div>
                  </div>
                ))}
                {actors.length === 0 ? <div className="p-6 text-sm text-[var(--text-muted)]">No threat actors synced yet.</div> : null}
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <header className="border-b border-[var(--border-color)] p-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Campaigns</h2>
                <p className="text-sm text-[var(--text-muted)]">Tracked campaigns and mapped technique coverage.</p>
              </header>
              <div className="divide-y divide-[var(--border-color)]">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {campaign.externalId ? <span className="font-mono text-xs text-sky-700 dark:text-sky-300">{campaign.externalId}</span> : null}
                      <h3 className="text-sm font-medium text-[var(--text-primary)]">{campaign.name}</h3>
                    </div>
                    {campaign.description ? <p className="mt-1 text-sm text-[var(--text-secondary)]">{campaign.description}</p> : null}
                    <div className="mt-2 text-xs text-[var(--text-muted)]">
                      Actor: {campaign.actor?.name ?? "Unassigned"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {campaign.techniques.slice(0, 8).map((technique) => (
                        <span key={`${campaign.id}-${technique.externalId}`} className="rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                          {technique.externalId}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {campaigns.length === 0 ? <div className="p-6 text-sm text-[var(--text-muted)]">No campaigns synced yet.</div> : null}
              </div>
            </article>
          </section>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
