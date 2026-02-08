"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SecurityLoader } from "@/components/ui/SecurityLoader";
import { Vulnerability } from "@/types";
import { cn, getTimeAgo } from "@/lib/utils";
import {
  Activity,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Filter,
  Radio,
  RefreshCw,
  Search,
  Shield,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface VulnerabilityResponse {
  data: Vulnerability[];
  pagination?: PaginationState;
}

interface ThreatIndicator {
  id: string;
  type: string;
  value: string;
  confidence?: number | null;
  severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL" | null;
  firstSeen: string;
  lastSeen: string;
  expiresAt?: string | null;
  source?: string | null;
  description?: string | null;
  tags: string[];
  feedId: string;
}

interface ThreatFeed {
  id: string;
  name: string;
  source: string;
  type: string;
  url?: string | null;
  isActive: boolean;
  lastSync?: string | null;
  syncInterval: number;
}

interface ThreatStats {
  activeFeeds: number;
  totalIndicators: number;
  criticalThreats: number;
  activeThreatsCount: number;
}

interface ThreatsResponse {
  feeds: ThreatFeed[];
  indicators: ThreatIndicator[];
  stats: ThreatStats;
}

const severityOptions = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

type SeverityFilter = (typeof severityOptions)[number];

const numberFormatter = new Intl.NumberFormat("en-US");

function getSeverityTone(
  severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL" | null,
) {
  if (severity === "CRITICAL") {
    return "border-red-400/35 bg-red-500/10 text-red-200";
  }
  if (severity === "HIGH") {
    return "border-orange-400/35 bg-orange-500/10 text-orange-200";
  }
  if (severity === "MEDIUM") {
    return "border-yellow-400/35 bg-yellow-500/10 text-yellow-200";
  }
  if (severity === "LOW") {
    return "border-emerald-400/35 bg-emerald-500/10 text-emerald-200";
  }
  return "border-slate-400/35 bg-slate-500/10 text-slate-200";
}

export default function ThreatsPage() {
  const [exploitedVulns, setExploitedVulns] = useState<Vulnerability[]>([]);
  const [kevVulns, setKevVulns] = useState<Vulnerability[]>([]);
  const [indicators, setIndicators] = useState<ThreatIndicator[]>([]);
  const [feeds, setFeeds] = useState<ThreatFeed[]>([]);
  const [stats, setStats] = useState<ThreatStats>({
    activeFeeds: 0,
    totalIndicators: 0,
    criticalThreats: 0,
    activeThreatsCount: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [exploitedSearch, setExploitedSearch] = useState("");
  const [exploitedSeverity, setExploitedSeverity] = useState<SeverityFilter>("ALL");
  const [indicatorSearch, setIndicatorSearch] = useState("");
  const [indicatorSeverity, setIndicatorSeverity] = useState<SeverityFilter>("ALL");

  const fetchThreats = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        setError(null);

        const [exploitedRes, kevRes, threatsRes] = await Promise.all([
          fetch("/api/vulnerabilities?exploited=true&limit=25", { cache: "no-store" }),
          fetch("/api/vulnerabilities?kev=true&limit=25", { cache: "no-store" }),
          fetch("/api/threats", { cache: "no-store" }),
        ]);

        if (!exploitedRes.ok || !kevRes.ok || !threatsRes.ok) {
          throw new Error("Failed to fetch live threat data");
        }

        const exploited = (await exploitedRes.json()) as VulnerabilityResponse;
        const kev = (await kevRes.json()) as VulnerabilityResponse;
        const threatData = (await threatsRes.json()) as ThreatsResponse;

        setExploitedVulns(exploited.data ?? []);
        setKevVulns(kev.data ?? []);
        setIndicators(threatData.indicators ?? []);
        setFeeds(threatData.feeds ?? []);
        setStats(
          threatData.stats ?? {
            activeFeeds: 0,
            totalIndicators: threatData.indicators?.length ?? 0,
            criticalThreats: 0,
            activeThreatsCount: 0,
          },
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch threats");
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

  const highEpss = useMemo(
    () => exploitedVulns.filter((item) => (item.epssScore || 0) > 0.7).length,
    [exploitedVulns],
  );

  const assetsAtRisk = useMemo(
    () =>
      exploitedVulns.reduce(
        (sum, item) => sum + (typeof item.affectedAssets === "number" ? item.affectedAssets : 0),
        0,
      ),
    [exploitedVulns],
  );

  const filteredExploited = useMemo(() => {
    return exploitedVulns.filter((item) => {
      const search = exploitedSearch.trim().toLowerCase();
      const matchesSearch =
        !search ||
        item.title.toLowerCase().includes(search) ||
        (item.cveId || "").toLowerCase().includes(search) ||
        (item.description || "").toLowerCase().includes(search);

      const matchesSeverity = exploitedSeverity === "ALL" || item.severity === exploitedSeverity;

      return matchesSearch && matchesSeverity;
    });
  }, [exploitedVulns, exploitedSearch, exploitedSeverity]);

  const filteredIndicators = useMemo(() => {
    return indicators.filter((item) => {
      const search = indicatorSearch.trim().toLowerCase();
      const matchesSearch =
        !search ||
        item.value.toLowerCase().includes(search) ||
        (item.description || "").toLowerCase().includes(search) ||
        (item.source || "").toLowerCase().includes(search);

      const matchesSeverity =
        indicatorSeverity === "ALL" || item.severity === indicatorSeverity;

      return matchesSearch && matchesSeverity;
    });
  }, [indicators, indicatorSearch, indicatorSeverity]);

  const sortedFeeds = useMemo(
    () => [...feeds].sort((a, b) => Number(b.isActive) - Number(a.isActive)),
    [feeds],
  );

  if (isLoading && exploitedVulns.length === 0 && indicators.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <SecurityLoader
            size="xl"
            icon="shield"
            variant="cyber"
            text="Analyzing live threat intelligence..."
          />
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
                <Radio size={13} />
                Threat Intelligence Console
              </div>
              <h1 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">Live Threats</h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-200 sm:text-base">
                Monitor active exploitation, CISA KEV overlap, and external threat indicators in
                one operational surface for faster SOC response.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-100">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  {numberFormatter.format(stats.activeThreatsCount || exploitedTotal)} active signals
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  {numberFormatter.format(kevTotal)} KEV overlaps
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  {numberFormatter.format(assetsAtRisk)} assets at risk
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="inline-flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                <Activity size={13} />
                Real-time updates
              </div>
              <button
                type="button"
                onClick={() => void fetchThreats({ silent: true })}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-white/15 hover:scale-105 active:scale-95"
              >
                <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-400/25 bg-red-500/5 p-4 text-sm text-red-200">
            {error}
          </section>
        ) : null}

        <section className="rounded-2xl border border-red-400/20 bg-red-500/5 p-4 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg border border-red-400/25 bg-red-500/10 p-2 transition-transform duration-200 hover:scale-110">
                <Zap size={16} className="text-red-300" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-red-100">Active Exploitation Observed</h2>
                <p className="mt-1 text-sm text-red-100/85">
                  {numberFormatter.format(exploitedTotal)} exploited vulnerabilities detected in your
                  environment, with {numberFormatter.format(kevTotal)} mapped to CISA KEV.
                </p>
              </div>
            </div>
            <a
              href="/vulnerabilities?filter=exploited"
              className="inline-flex items-center gap-2 self-start rounded-lg border border-red-300/35 bg-red-400/10 px-3 py-1.5 text-sm text-red-100 transition-all duration-200 hover:bg-red-400/20 hover:scale-105 active:scale-95 sm:self-auto"
            >
              Open vulnerability queue
              <ArrowRight size={14} />
            </a>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Exploited",
              value: exploitedTotal,
              hint: "Actively weaponized",
              icon: Zap,
            },
            {
              label: "CISA KEV",
              value: kevTotal,
              hint: "Mandatory remediation",
              icon: Shield,
            },
            {
              label: "High EPSS",
              value: highEpss,
              hint: ">70% probability",
              icon: TrendingUp,
            },
            {
              label: "Assets at Risk",
              value: assetsAtRisk,
              hint: "Potential impact spread",
              icon: Target,
            },
            {
              label: "Active Feeds",
              value: stats.activeFeeds,
              hint: `${stats.totalIndicators || indicators.length} indicators`,
              icon: Activity,
            },
          ].map((metric, index) => {
            const Icon = metric.icon;
            return (
              <article
                key={metric.label}
                className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/35 hover:shadow-lg hover:shadow-sky-300/10 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 100 + 200}ms`, animationFillMode: 'backwards' }}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm text-slate-300">{metric.label}</p>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2 transition-transform duration-200 hover:scale-110">
                    <Icon size={15} className="text-slate-200" />
                  </div>
                </div>
                <p className="mt-4 text-3xl font-semibold text-white transition-all duration-300">
                  {numberFormatter.format(metric.value)}
                </p>
                <p className="mt-1 text-sm text-slate-400">{metric.hint}</p>
              </article>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <article className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)]">
            <header className="border-b border-white/10 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Exploited Vulnerability Queue</h2>
                  <p className="text-sm text-slate-400">
                    Prioritized findings with confirmed exploitation signals.
                  </p>
                </div>
                <div className="text-xs text-slate-500">
                  Showing {filteredExploited.length} of {exploitedTotal}
                </div>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-[1.2fr_0.8fr]">
                <label className="relative block">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors duration-200"
                  />
                  <input
                    type="text"
                    value={exploitedSearch}
                    onChange={(event) => setExploitedSearch(event.target.value)}
                    placeholder="Search CVE or title"
                    className="input h-9 w-full !pl-9 text-sm transition-all duration-200 focus:ring-2 focus:ring-sky-300/30"
                  />
                </label>

                <div className="relative">
                  <Filter
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors duration-200"
                  />
                  <select
                    value={exploitedSeverity}
                    onChange={(event) =>
                      setExploitedSeverity(event.target.value as SeverityFilter)
                    }
                    className="input h-9 w-full appearance-none !pl-9 text-sm transition-all duration-200 focus:ring-2 focus:ring-sky-300/30"
                  >
                    {severityOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === "ALL" ? "All Severities" : option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </header>

            {filteredExploited.length > 0 ? (
              <div className="divide-y divide-white/10">
                {filteredExploited.map((vuln, index) => {
                  const epss = (vuln.epssScore || 0) * 100;

                  return (
                    <div
                      key={vuln.id}
                      className="p-4 transition-all duration-200 hover:bg-white/[0.03] animate-in fade-in slide-in-from-left-2"
                      style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'backwards' }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-semibold",
                            index < 3
                              ? "border-red-400/30 bg-red-500/12 text-red-200"
                              : "border-white/10 bg-white/[0.03] text-slate-300",
                          )}
                        >
                          {index + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {vuln.cveId ? (
                              <a
                                href={`https://nvd.nist.gov/vuln/detail/${vuln.cveId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-mono text-xs text-sky-300 hover:text-sky-200"
                              >
                                {vuln.cveId}
                                <ExternalLink size={11} />
                              </a>
                            ) : (
                              <span className="font-mono text-xs text-slate-500">No CVE ID</span>
                            )}

                            <span
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[11px]",
                                getSeverityTone(vuln.severity),
                              )}
                            >
                              {vuln.severity}
                            </span>

                            <span className="rounded-full border border-red-400/35 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-200">
                              EXPLOITED
                            </span>

                            {vuln.cisaKev ? (
                              <span className="rounded-full border border-orange-400/35 bg-orange-500/10 px-2 py-0.5 text-[11px] text-orange-200">
                                CISA KEV
                              </span>
                            ) : null}
                          </div>

                          <h3 className="mt-2 truncate text-sm font-medium text-white">{vuln.title}</h3>

                          <div className="mt-3">
                            <div className="mb-1 flex items-center justify-between text-xs">
                              <span className="text-slate-400">EPSS Probability</span>
                              <span className="text-slate-200">{epss.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-yellow-300 to-red-300 transition-all duration-700 ease-out"
                                style={{ width: `${Math.min(Math.max(epss, 0), 100)}%` }}
                              />
                            </div>
                          </div>

                                                    <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
                                                        <div className="flex items-center gap-1">
                                                            <Target size={12} />
                                                            <span>
                                                                <span className="text-white font-medium">{vuln.affectedAssets}</span> assets affected
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Activity size={12} />
                                                            <span>
                                                                Source:{" "}
                                                                <span className="text-orange-400">{vuln.source}</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight size={18} className="text-[var(--text-muted)] flex-shrink-0" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-20 text-center">
                                        <Shield className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4 opacity-20" />
                                        <p className="text-[var(--text-secondary)]">No actively exploited vulnerabilities detected.</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-4">
                        {/* Live AI Intelligence */}
                        <Card
                            title="Live AI Intelligence"
                            subtitle="Real-time context-aware threats"
                            action={
                                indicators.length > 0 && (
                                    <button
                                        onClick={async () => {
                                            if (confirm("Are you sure you want to purge all AI-generated threat indicators?")) {
                                                await fetch("/api/threats", { method: "DELETE" });
                                                fetchThreats();
                                            }
                                        }}
                                        className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider"
                                    >
                                        Purge
                                    </button>
                                )
                            }
                        >
                            <div className="space-y-3">
                                {indicators.length > 0 ? (
                                    indicators.map((indicator, idx) => (
                                        <div key={idx} className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-white/5 hover:border-blue-500/20 transition-all">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                                                    {indicator.type}
                                                </span>
                                                <span className="text-[10px] text-[var(--text-muted)]">
                                                    {new Date(indicator.firstSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-white mb-1">{indicator.value}</p>
                                            <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                                                {indicator.description}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-[10px] text-blue-400 border border-blue-500/20">
                                                    Confidence: {indicator.confidence}%
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-sm text-[var(--text-muted)] text-center py-10">
                                        <Activity size={24} className="mx-auto mb-2 opacity-20" />
                                        <p>No AI-driven threats identified yet.</p>
                                        <p className="text-[10px] mt-1">Run AI Risk Assessment to generate insights.</p>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Recent Threat Updates */}
                        <Card title="Recent Threat Updates">
                            <div className="space-y-3">
                                {kevVulns.slice(0, 4).map((vuln, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer"
                                    >
                                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-red-400" />
                                        <div>
                                            <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                                                New KEV entry: {vuln.cveId} - {vuln.title}
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)]">Recently detected</p>
                                        </div>
                                    </div>
                                ))}
                                {kevVulns.length === 0 && (
                                    <p className="text-xs text-[var(--text-muted)] text-center py-4">
                                        No recent threat updates.
                                    </p>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
