"use client";
import { Input as BoilerplateInput } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea as BoilerplateTextarea } from "@repo/design-system/components/ui/textarea";
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
import Link from "next/link";
import {
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { useUiFeedback } from "@/hooks/useUiFeedback";
import { cn, getTimeAgo } from "@/lib/utils";
import type { Vulnerability } from "@/types";

type SeverityTone =
  | "CRITICAL"
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "INFORMATIONAL"
  | null;

type TabKey = "overview" | "matrix" | "ioc" | "actors";

interface ThreatIndicator {
  confidence?: number | null;
  description?: string | null;
  expiresAt?: string | null;
  feedId: string;
  firstSeen: string;
  id: string;
  lastSeen: string;
  normalizedValue: string;
  severity?: SeverityTone;
  source?: string | null;
  tags: string[];
  techniqueId?: string | null;
  type: string;
  value: string;
}

interface ThreatFeed {
  format: string;
  id: string;
  isActive: boolean;
  lastSync?: string | null;
  name: string;
  source: string;
  syncInterval: number;
  type: string;
  url?: string | null;
}

interface ThreatMatch {
  asset: {
    id: string;
    name: string;
    ipAddress?: string | null;
    hostname?: string | null;
  };
  confidence?: number | null;
  id: string;
  indicator: {
    value: string;
    type: string;
    severity?: SeverityTone;
  };
  lastMatchedAt: string;
  matchField: string;
  matchValue: string;
  status: string;
}

interface ThreatRun {
  errors?: unknown;
  feed: {
    name: string;
    source: string;
  };
  finishedAt?: string | null;
  id: string;
  recordsCreated: number;
  recordsFetched: number;
  recordsUpdated: number;
  startedAt: string;
  status: string;
}

interface ThreatStats {
  activeFeeds: number;
  activeIndicators: number;
  actorCount: number;
  campaignCount: number;
  criticalIndicators: number;
  matchedAssets: number;
  totalIndicators: number;
}

interface ThreatOverviewResponse {
  feeds: ThreatFeed[];
  indicators: ThreatIndicator[];
  matches: ThreatMatch[];
  runs: ThreatRun[];
  stats: ThreatStats;
}

interface AttackTechniqueCell {
  indicatorCount: number;
  lastSeen: string | null;
  maxSeverity: SeverityTone;
  techniqueExternalId: string;
  techniqueId: string;
  techniqueName: string;
  vulnerabilityCount: number;
}

interface AttackTacticRow {
  shortName: string | null;
  tacticExternalId: string;
  tacticId: string;
  tacticName: string;
  techniques: AttackTechniqueCell[];
}

interface AttackMatrixResponse {
  generatedAt: string;
  summary: {
    tacticCount: number;
    techniqueCount: number;
  };
  tactics: AttackTacticRow[];
}

interface ThreatActorRecord {
  aliases: string[];
  campaignCount: number;
  description?: string | null;
  externalId?: string | null;
  id: string;
  linkedVulnerabilities: Array<{
    id: string;
    cveId?: string | null;
    title: string;
    severity: SeverityTone;
    source: string;
  }>;
  name: string;
  techniques: Array<{
    externalId: string;
    name: string;
  }>;
}

interface ThreatCampaignRecord {
  actor?: {
    id: string;
    name: string;
    externalId?: string | null;
  } | null;
  description?: string | null;
  externalId?: string | null;
  firstSeen?: string | null;
  id: string;
  lastSeen?: string | null;
  name: string;
  techniques: Array<{
    externalId: string;
    name: string;
  }>;
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

const tabItems: Array<{
  key: TabKey;
  label: string;
  icon: ComponentType<{ size?: number }>;
}> = [
  { key: "overview", label: "Overview", icon: Shield },
  { key: "matrix", label: "ATT&CK Matrix", icon: Network },
  { key: "ioc", label: "IOC Workbench", icon: Target },
  { key: "actors", label: "Actors & Campaigns", icon: Users },
];

const severityOptions = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

type SeverityFilter = (typeof severityOptions)[number];

const numberFormatter = new Intl.NumberFormat("en-US");

function getSeverityTone(severity?: SeverityTone) {
  if (severity === "CRITICAL") {
    return "border-red-400/35 bg-red-500/10 text-red-700 dark:text-red-200";
  }
  if (severity === "HIGH") {
    return "border-orange-400/35 bg-orange-500/10 text-orange-700 dark:text-orange-200";
  }
  if (severity === "MEDIUM") {
    return "border-yellow-400/35 bg-yellow-500/10 text-yellow-700 dark:text-yellow-200";
  }
  if (severity === "LOW") {
    return "border-emerald-400/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200";
  }
  return "border-[var(--border-hover)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]";
}

function scoreIntensity(
  vulnerabilityCount: number,
  indicatorCount: number
): string {
  const score = vulnerabilityCount + indicatorCount;
  if (score >= 10) {
    return "bg-red-500/25 border-red-400/50";
  }
  if (score >= 5) {
    return "bg-orange-500/20 border-orange-400/45";
  }
  if (score >= 2) {
    return "bg-yellow-500/15 border-yellow-400/40";
  }
  if (score >= 1) {
    return "bg-emerald-500/15 border-emerald-400/35";
  }
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
  const [indicatorSeverity, setIndicatorSeverity] =
    useState<SeverityFilter>("ALL");
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

        const [
          exploitedRes,
          kevRes,
          overviewRes,
          matrixRes,
          actorsRes,
          campaignsRes,
        ] = await Promise.all([
          fetch("/api/vulnerabilities?exploited=true&limit=25", {
            cache: "no-store",
          }),
          fetch("/api/vulnerabilities?kev=true&limit=25", {
            cache: "no-store",
          }),
          fetch("/api/threats", { cache: "no-store" }),
          fetch("/api/threats/attack-matrix", { cache: "no-store" }),
          fetch("/api/threats/actors", { cache: "no-store" }),
          fetch("/api/threats/campaigns", { cache: "no-store" }),
        ]);

        if (
          !(
            exploitedRes.ok &&
            kevRes.ok &&
            overviewRes.ok &&
            actorsRes.ok &&
            campaignsRes.ok
          )
        ) {
          throw new Error("Failed to fetch threat intelligence data");
        }

        const exploited = (await exploitedRes.json()) as VulnerabilityResponse;
        const kev = (await kevRes.json()) as VulnerabilityResponse;
        const overviewPayload =
          (await overviewRes.json()) as ThreatOverviewResponse;
        const actorsPayload = (await actorsRes.json()) as ThreatActorResponse;
        const campaignsPayload =
          (await campaignsRes.json()) as ThreatCampaignResponse;

        setExploitedVulns(exploited.data ?? []);
        setKevVulns(kev.data ?? []);
        setOverview(overviewPayload);
        setActors(actorsPayload.data ?? []);
        setCampaigns(campaignsPayload.data ?? []);

        if (matrixRes.ok) {
          const matrixPayload =
            (await matrixRes.json()) as AttackMatrixResponse;
          setMatrix(matrixPayload);
        } else {
          setMatrix(null);
        }
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to fetch threats"
        );
      } finally {
        if (silent) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    []
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

      const matchesSeverity =
        indicatorSeverity === "ALL" || indicator.severity === indicatorSeverity;

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
        description:
          requestError instanceof Error
            ? requestError.message
            : "Correlation failed",
        intent: "error",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const submitImport = async () => {
    if (!importPayload.trim()) {
      return;
    }
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

      const data = (await response.json()) as {
        error?: string;
        summary?: { created: number; updated: number; skipped: number };
      };
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
        description:
          requestError instanceof Error
            ? requestError.message
            : "IOC import failed",
        intent: "error",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const addManualIoc = async () => {
    if (!newIocValue.trim()) {
      return;
    }
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
        description:
          requestError instanceof Error
            ? requestError.message
            : "Failed to add IOC",
        intent: "error",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const exportIocs = (format: "csv" | "json") => {
    window.open(
      `/api/threats/iocs/export?format=${format}`,
      "_blank",
      "noopener,noreferrer"
    );
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
      <ErrorBanner
        className="mb-4"
        message={error}
        onDismiss={() => setError(null)}
      />
      <div className="space-y-5">
        <PageHeader
          actions={
            <>
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 font-medium text-[var(--text-primary)] text-sm transition hover:bg-[var(--bg-elevated)]"
                onClick={() => void fetchThreats({ silent: true })}
                type="button"
              >
                <RefreshCw
                  className={isRefreshing ? "animate-spin" : ""}
                  size={14}
                />
                Refresh
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-red-100 px-4 py-2 font-semibold text-red-900 text-sm transition hover:border-red-400 hover:bg-red-200 dark:border-red-300/35 dark:bg-red-400/10 dark:text-red-100 dark:hover:bg-red-400/20"
                onClick={runCorrelation}
                type="button"
              >
                <Target size={14} />
                Run Correlation
              </button>
            </>
          }
          badge={
            <>
              <CircleDot size={12} />
              Threat Intelligence Console
            </>
          }
          description="ATT&CK context, IOC correlation, and actor intelligence in one response surface."
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
          title="Live Threats"
        />

        <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 font-medium text-sm transition",
                  active
                    ? "border-sky-600/55 bg-sky-100/90 font-semibold text-sky-900 dark:border-sky-300/45 dark:bg-sky-400/15 dark:text-sky-400"
                    : "border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                )}
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                type="button"
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
              <header className="border-[var(--border-color)] border-b p-4">
                <h2 className="font-semibold text-[var(--text-primary)] text-lg">
                  Exploited Vulnerability Queue
                </h2>
                <p className="text-[var(--text-secondary)] text-sm">
                  High-priority findings with active exploitation signals.
                </p>
              </header>
              <div className="divide-y divide-[var(--border-color)]">
                {exploitedVulns.length > 0 ? (
                  exploitedVulns.slice(0, 20).map((vulnerability) => (
                    <div className="p-4" key={vulnerability.id}>
                      <div className="flex items-center gap-2">
                        {vulnerability.cveId ? (
                          <a
                            className="inline-flex items-center gap-1 font-mono text-sky-800 text-xs hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-200"
                            href={`https://nvd.nist.gov/vuln/detail/${vulnerability.cveId}`}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            {vulnerability.cveId}
                            <ExternalLink size={11} />
                          </a>
                        ) : null}
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[11px]",
                            getSeverityTone(vulnerability.severity)
                          )}
                        >
                          {vulnerability.severity}
                        </span>
                        {vulnerability.cisaKev ? (
                          <span className="rounded-full border border-orange-400/35 bg-orange-500/10 px-2 py-0.5 text-[11px] text-orange-700 dark:text-orange-200">
                            KEV
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-2 font-medium text-[var(--text-primary)] text-sm">
                        {vulnerability.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-3 text-[var(--text-muted)] text-xs">
                        <span>
                          EPSS:{" "}
                          {((vulnerability.epssScore ?? 0) * 100).toFixed(1)}%
                        </span>
                        <span>Assets: {vulnerability.affectedAssets ?? 0}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-[var(--text-muted)] text-sm">
                    No exploited vulnerabilities found.
                  </div>
                )}
              </div>
              <div className="border-[var(--border-color)] border-t p-4">
                <Link
                  className="inline-flex items-center gap-2 text-sky-800 text-sm hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-200"
                  href="/vulnerabilities?filter=exploited"
                >
                  Open vulnerability queue <ArrowRight size={14} />
                </Link>
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <header className="border-[var(--border-color)] border-b p-4">
                <h2 className="font-semibold text-[var(--text-primary)] text-lg">
                  Feed Activity
                </h2>
                <p className="text-[var(--text-secondary)] text-sm">
                  Latest ingestion runs and sync outcomes.
                </p>
              </header>
              <div className="divide-y divide-[var(--border-color)]">
                {(overview?.runs ?? []).slice(0, 12).map((run) => (
                  <div className="p-4" key={run.id}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[var(--text-primary)] text-sm">
                        {run.feed.name}
                      </p>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px]",
                          run.status === "SUCCESS"
                            ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                            : run.status === "PARTIAL"
                              ? "border-yellow-400/35 bg-yellow-500/10 text-yellow-700 dark:text-yellow-200"
                              : "border-red-400/35 bg-red-500/10 text-red-700 dark:text-red-200"
                        )}
                      >
                        {run.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[var(--text-secondary)] text-xs">
                      {run.feed.source} • fetched {run.recordsFetched} • created{" "}
                      {run.recordsCreated} • updated {run.recordsUpdated}
                    </p>
                    <p className="mt-1 text-[var(--text-muted)] text-xs">
                      {getTimeAgo(new Date(run.startedAt))}
                    </p>
                  </div>
                ))}
                {(overview?.runs ?? []).length === 0 ? (
                  <div className="p-6 text-[var(--text-muted)] text-sm">
                    No feed runs yet.
                  </div>
                ) : null}
              </div>
            </article>
          </section>
        ) : null}

        {activeTab === "matrix" ? (
          <section className="space-y-4">
            <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <h2 className="font-semibold text-[var(--text-primary)] text-lg">
                MITRE ATT&CK Matrix
              </h2>
              <p className="mt-1 text-[var(--text-secondary)] text-sm">
                Technique heat shows combined vulnerability mappings and active
                IOC signals.
              </p>
              <p className="mt-2 text-[var(--text-muted)] text-xs">
                {matrix
                  ? `Generated ${getTimeAgo(new Date(matrix.generatedAt))} • ${matrix.summary.tacticCount} tactics • ${matrix.summary.techniqueCount} technique mappings`
                  : "Matrix not available. Run threat intel sync first."}
              </p>
            </article>

            {matrix ? (
              <div className="grid gap-4 xl:grid-cols-3">
                {matrix.tactics.map((tactic) => (
                  <article
                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4"
                    key={tactic.tacticId}
                  >
                    <div className="mb-3">
                      <p className="text-sky-700 text-xs dark:text-sky-300">
                        {tactic.tacticExternalId}
                      </p>
                      <h3 className="font-semibold text-[var(--text-primary)] text-base">
                        {tactic.tacticName}
                      </h3>
                      {tactic.shortName ? (
                        <p className="text-[var(--text-muted)] text-xs">
                          {tactic.shortName}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      {tactic.techniques.map((technique) => (
                        <div
                          className={cn(
                            "rounded-lg border p-3",
                            scoreIntensity(
                              technique.vulnerabilityCount,
                              technique.indicatorCount
                            )
                          )}
                          key={technique.techniqueId}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sky-700 text-xs dark:text-sky-300">
                                {technique.techniqueExternalId}
                              </p>
                              <p className="text-[var(--text-primary)] text-sm">
                                {technique.techniqueName}
                              </p>
                            </div>
                            {technique.maxSeverity ? (
                              <span
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[11px]",
                                  getSeverityTone(technique.maxSeverity)
                                )}
                              >
                                {technique.maxSeverity}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-3 text-[var(--text-secondary)] text-xs">
                            <span>Vulns: {technique.vulnerabilityCount}</span>
                            <span>IOCs: {technique.indicatorCount}</span>
                            {technique.lastSeen ? (
                              <span>
                                Seen: {getTimeAgo(new Date(technique.lastSeen))}
                              </span>
                            ) : null}
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
              <h2 className="font-semibold text-[var(--text-primary)] text-lg">
                IOC Workbench
              </h2>
              <p className="mt-1 text-[var(--text-secondary)] text-sm">
                Search, import/export, and enrich indicator coverage.
              </p>

              <div className="mt-3 grid gap-2 md:grid-cols-[1.2fr_0.8fr]">
                <label className="relative block">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-muted)]"
                    size={14}
                  />
                  <BoilerplateInput
                    className="!pl-9 h-9 w-full border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm"
                    onChange={(event) => setIndicatorSearch(event.target.value)}
                    placeholder="Search indicators"
                    type="text"
                    value={indicatorSearch}
                  />
                </label>

                <div className="relative">
                  <Filter
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-muted)]"
                    size={14}
                  />
                  <FilterSelect
                    label="Filter indicators by severity"
                    onValueChange={(value) =>
                      setIndicatorSeverity(value as SeverityFilter)
                    }
                    options={severityOptions.map((option) => ({
                      value: option,
                      label: option === "ALL" ? "All Severities" : option,
                    }))}
                    value={indicatorSeverity}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-[var(--text-primary)] text-sm transition hover:bg-[var(--bg-elevated)]"
                  onClick={() => exportIocs("csv")}
                  type="button"
                >
                  <Download size={14} />
                  Export CSV
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-[var(--text-primary)] text-sm transition hover:bg-[var(--bg-elevated)]"
                  onClick={() => exportIocs("json")}
                  type="button"
                >
                  <Download size={14} />
                  Export JSON
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                Add Manual IOC
              </h3>
              <div className="mt-2 flex gap-2">
                <BoilerplateInput
                  className="h-9 flex-1 border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm"
                  onChange={(event) => setNewIocValue(event.target.value)}
                  placeholder="e.g. malicious.example.com or 1.2.3.4"
                  type="text"
                  value={newIocValue}
                />
                <button
                  className="rounded-lg border border-sky-400/50 bg-sky-100/80 px-3 text-sky-900 text-sm transition hover:bg-sky-200/80 dark:border-sky-300/35 dark:bg-sky-400/15 dark:text-sky-100 dark:hover:bg-sky-400/20"
                  onClick={addManualIoc}
                  type="button"
                >
                  Add IOC
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
              <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                Import IOC Feed Data
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Select
                  onValueChange={(event) =>
                    setImportFormat(event as "JSON" | "CSV")
                  }
                  value={importFormat}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="JSON">JSON</SelectItem>
                      <SelectItem value="CSV">CSV</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/35 bg-emerald-400/15 px-3 py-1.5 text-emerald-700 text-sm transition hover:bg-emerald-400/20 dark:text-emerald-100"
                  onClick={submitImport}
                  type="button"
                >
                  <FileUp size={14} />
                  Import
                </button>
              </div>
              <BoilerplateTextarea
                className="mt-2 min-h-[150px] w-full border-[var(--border-color)] bg-[var(--bg-secondary)] font-mono text-[var(--text-primary)] text-xs"
                onChange={(event) => setImportPayload(event.target.value)}
                placeholder={
                  importFormat === "JSON"
                    ? '[{"value":"bad.example.com","type":"DOMAIN"}]'
                    : "value,type,severity\nbad.example.com,DOMAIN,HIGH"
                }
                value={importPayload}
              />
            </article>

            <article className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <header className="border-[var(--border-color)] border-b p-4">
                <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                  Indicators ({filteredIndicators.length})
                </h3>
              </header>
              <div className="divide-y divide-[var(--border-color)]">
                {filteredIndicators.slice(0, 60).map((indicator) => (
                  <div className="p-4" key={indicator.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-sky-400/35 bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-700 dark:text-sky-200">
                        {indicator.type}
                      </span>
                      {indicator.severity ? (
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[11px]",
                            getSeverityTone(indicator.severity)
                          )}
                        >
                          {indicator.severity}
                        </span>
                      ) : null}
                      {typeof indicator.confidence === "number" ? (
                        <span className="text-[var(--text-muted)] text-xs">
                          Confidence: {indicator.confidence}%
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 font-mono text-[var(--text-primary)] text-sm">
                      {indicator.value}
                    </p>
                    {indicator.description ? (
                      <p className="mt-1 text-[var(--text-secondary)] text-sm">
                        {indicator.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[var(--text-muted)] text-xs">
                      <span>
                        Last seen: {getTimeAgo(new Date(indicator.lastSeen))}
                      </span>
                      {indicator.source ? (
                        <span>Source: {indicator.source}</span>
                      ) : null}
                      {indicator.techniqueId ? (
                        <span>Technique: {indicator.techniqueId}</span>
                      ) : null}
                    </div>
                  </div>
                ))}
                {filteredIndicators.length === 0 ? (
                  <div className="p-6 text-[var(--text-muted)] text-sm">
                    No indicators found.
                  </div>
                ) : null}
              </div>
            </article>
          </section>
        ) : null}

        {activeTab === "actors" ? (
          <section className="grid gap-4 xl:grid-cols-2">
            <article className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <header className="border-[var(--border-color)] border-b p-4">
                <h2 className="font-semibold text-[var(--text-primary)] text-lg">
                  Threat Actors
                </h2>
                <p className="text-[var(--text-muted)] text-sm">
                  Profiles linked to ATT&CK TTPs and vulnerabilities.
                </p>
              </header>
              <div className="divide-y divide-[var(--border-color)]">
                {actors.map((actor) => (
                  <div className="p-4" key={actor.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      {actor.externalId ? (
                        <span className="font-mono text-sky-700 text-xs dark:text-sky-300">
                          {actor.externalId}
                        </span>
                      ) : null}
                      <h3 className="font-medium text-[var(--text-primary)] text-sm">
                        {actor.name}
                      </h3>
                    </div>
                    {actor.description ? (
                      <p className="mt-1 text-[var(--text-secondary)] text-sm">
                        {actor.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {actor.techniques.slice(0, 8).map((technique) => (
                        <span
                          className="rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]"
                          key={`${actor.id}-${technique.externalId}`}
                        >
                          {technique.externalId}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 text-[var(--text-muted)] text-xs">
                      Campaigns: {actor.campaignCount} • Linked vulnerabilities:{" "}
                      {actor.linkedVulnerabilities.length}
                    </div>
                  </div>
                ))}
                {actors.length === 0 ? (
                  <div className="p-6 text-[var(--text-muted)] text-sm">
                    No threat actors synced yet.
                  </div>
                ) : null}
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <header className="border-[var(--border-color)] border-b p-4">
                <h2 className="font-semibold text-[var(--text-primary)] text-lg">
                  Campaigns
                </h2>
                <p className="text-[var(--text-muted)] text-sm">
                  Tracked campaigns and mapped technique coverage.
                </p>
              </header>
              <div className="divide-y divide-[var(--border-color)]">
                {campaigns.map((campaign) => (
                  <div className="p-4" key={campaign.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      {campaign.externalId ? (
                        <span className="font-mono text-sky-700 text-xs dark:text-sky-300">
                          {campaign.externalId}
                        </span>
                      ) : null}
                      <h3 className="font-medium text-[var(--text-primary)] text-sm">
                        {campaign.name}
                      </h3>
                    </div>
                    {campaign.description ? (
                      <p className="mt-1 text-[var(--text-secondary)] text-sm">
                        {campaign.description}
                      </p>
                    ) : null}
                    <div className="mt-2 text-[var(--text-muted)] text-xs">
                      Actor: {campaign.actor?.name ?? "Unassigned"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {campaign.techniques.slice(0, 8).map((technique) => (
                        <span
                          className="rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]"
                          key={`${campaign.id}-${technique.externalId}`}
                        >
                          {technique.externalId}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {campaigns.length === 0 ? (
                  <div className="p-6 text-[var(--text-muted)] text-sm">
                    No campaigns synced yet.
                  </div>
                ) : null}
              </div>
            </article>
          </section>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
