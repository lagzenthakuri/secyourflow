"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RiskRegisterTable } from "@/components/risk/RiskRegisterTable";
import { PageHeader } from "@/components/ui/PageHeader";
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
        <PageHeader
          title="Risk Register"
          description="Centralized view of assessed risks, treatment choices, and accountability to keep risk decisions auditable and actionable for SOC and leadership teams."
          badge={
            <>
              <Sparkles size={13} />
              Risk Governance Workspace
            </>
          }
          actions={
            <>
              <button
                type="button"
                onClick={() => void fetchOverview({ silent: true })}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--bg-elevated)] hover:scale-105 active:scale-95"
              >
                <RefreshCw size={14} className={isRefreshingOverview ? "animate-spin" : ""} />
                Refresh Overview
              </button>
              <button
                type="button"
                onClick={scrollToTable}
                className="btn btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <ArrowDownToLine size={14} />
                Open Register
              </button>
            </>
          }
          stats={[
            {
              label: "Total Risks",
              value: numberFormatter.format(totalRisks),
              trend: { value: "Tracked register entries", neutral: true },
              icon: Shield,
            },
            {
              label: "Open Risks",
              value: openCount,
              trend: { value: "Still requiring action", neutral: true },
              icon: AlertTriangle,
            },
            {
              label: "Resolved",
              value: resolvedCount,
              trend: { value: "Closed and reviewed", neutral: true },
              icon: CheckCircle2,
            },
            {
              label: "High Priority",
              value: highPriorityCount,
              trend: { value: "Score and category weighted", neutral: true },
              icon: Target,
            },
            {
              label: "Average Score",
              value: Number(averageRiskScore.toFixed(1)),
              trend: { value: "Impact x Likelihood", neutral: true },
              icon: Sparkles,
            },
          ]}
        />

        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Posture Snapshot</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Dominant category: <span className="text-[var(--text-primary)]">{dominantCategory}</span>
              </p>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
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
