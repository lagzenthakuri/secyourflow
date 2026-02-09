"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RiskRegisterTable } from "@/components/risk/RiskRegisterTable";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
} from "lucide-react";

interface RiskOverviewEntry {
  id: string;
  threat: string;
  impactScore: number;
  likelihoodScore: number;
  riskCategory: string;
  treatmentOption: string;
  isResolved: boolean;
}

interface RiskOverviewResponse {
  data: RiskOverviewEntry[];
}

const numberFormatter = new Intl.NumberFormat("en-US");

function scrollToTable() {
  if (typeof document === "undefined") return;
  const element = document.getElementById("risk-register-table");
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export default function RiskRegisterPage() {
  const [overviewData, setOverviewData] = useState<RiskOverviewEntry[]>([]);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [isRefreshingOverview, setIsRefreshingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const fetchOverview = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setIsRefreshingOverview(true);
    } else {
      setIsLoadingOverview(true);
    }

    try {
      setOverviewError(null);
      const response = await fetch("/api/risk-register", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to fetch risk overview");
      }

      const payload = (await response.json()) as RiskOverviewResponse;
      setOverviewData(payload.data ?? []);
    } catch (err) {
      setOverviewError(err instanceof Error ? err.message : "Failed to load risk overview");
    } finally {
      if (silent) {
        setIsRefreshingOverview(false);
      } else {
        setIsLoadingOverview(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  const totalRisks = overviewData.length;

  const resolvedCount = useMemo(
    () => overviewData.filter((entry) => entry.isResolved).length,
    [overviewData],
  );

  const openCount = totalRisks - resolvedCount;

  const highPriorityCount = useMemo(
    () =>
      overviewData.filter((entry) => {
        const score = (entry.impactScore || 0) * (entry.likelihoodScore || 0);
        const category = (entry.riskCategory || "").toLowerCase();
        return score >= 16 || category.includes("critical") || category.includes("high");
      }).length,
    [overviewData],
  );

  const averageRiskScore = useMemo(() => {
    if (!totalRisks) return 0;
    const aggregate = overviewData.reduce(
      (sum, entry) => sum + (entry.impactScore || 0) * (entry.likelihoodScore || 0),
      0,
    );
    return aggregate / totalRisks;
  }, [overviewData, totalRisks]);

  const dominantCategory = useMemo(() => {
    if (!overviewData.length) return "N/A";
    const bucket = new Map<string, number>();
    for (const entry of overviewData) {
      const key = entry.riskCategory || "Unspecified";
      bucket.set(key, (bucket.get(key) ?? 0) + 1);
    }

    let top = "N/A";
    let count = -1;
    for (const [category, value] of bucket.entries()) {
      if (value > count) {
        top = category;
        count = value;
      }
    }
    return top;
  }, [overviewData]);

  if (isLoadingOverview && overviewData.length === 0) {
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
                <Sparkles size={13} />
                Risk Governance Workspace
              </div>
              <h1 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">Risk Register</h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-200 sm:text-base">
                Centralized view of assessed risks, treatment choices, and accountability to keep
                risk decisions auditable and actionable for SOC and leadership teams.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-100">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  {numberFormatter.format(totalRisks)} tracked risks
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  {numberFormatter.format(highPriorityCount)} high-priority
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  {numberFormatter.format(resolvedCount)} resolved
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => void fetchOverview({ silent: true })}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-white/15 hover:scale-105 active:scale-95"
              >
                <RefreshCw size={14} className={isRefreshingOverview ? "animate-spin" : ""} />
                Refresh Overview
              </button>
              <button
                type="button"
                onClick={scrollToTable}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition-all duration-200 hover:bg-sky-200 hover:scale-105 active:scale-95"
              >
                <ArrowDownToLine size={14} />
                Open Register
              </button>
            </div>
          </div>
        </section>

        {overviewError ? (
          <section className="rounded-2xl border border-red-400/25 bg-red-500/5 p-4 text-sm text-red-200">
            {overviewError}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Total Risks",
              value: totalRisks,
              hint: "Tracked register entries",
              icon: Shield,
            },
            {
              label: "Open Risks",
              value: openCount,
              hint: "Still requiring action",
              icon: AlertTriangle,
            },
            {
              label: "Resolved",
              value: resolvedCount,
              hint: "Closed and reviewed",
              icon: CheckCircle2,
            },
            {
              label: "High Priority",
              value: highPriorityCount,
              hint: "Score and category weighted",
              icon: Target,
            },
            {
              label: "Average Score",
              value: Number(averageRiskScore.toFixed(1)),
              hint: "Impact x Likelihood",
              icon: Sparkles,
            },
          ].map((metric, index) => {
            const Icon = metric.icon;
            return (
              <article
                key={metric.label}
                className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/35 hover:shadow-lg hover:shadow-sky-300/10 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
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

        <section className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Posture Snapshot</h2>
              <p className="text-sm text-slate-400">
                Dominant category: <span className="text-slate-200">{dominantCategory}</span>
              </p>
            </div>
            <p className="text-xs text-slate-500">
              {isLoadingOverview ? "Loading register overview..." : "Overview synced with register data"}
            </p>
          </div>
        </section>

        <section id="risk-register-table" className="animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}>
          <RiskRegisterTable />
        </section>
      </div>
    </DashboardLayout>
  );
}
