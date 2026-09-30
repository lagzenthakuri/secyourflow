"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  Calculator,
  CheckCircle2,
  Download,
  Edit,
  FileCheck2,
  FileText,
  Gauge,
  Lock,
  LogIn,
  RefreshCw,
  Server,
  Settings,
  ShieldAlert,
  Trash2,
  Unlock,
  Upload,
  UserCheck,
  UserPlus,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn, getTimeAgo } from "@/lib/utils";

const RiskTrendChart = dynamic(
  () =>
    import("@/components/charts/DashboardCharts").then(
      (mod) => mod.RiskTrendChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] animate-pulse rounded-xl bg-[var(--bg-tertiary)]" />
    ),
  }
);

const VulnStatusChart = dynamic(
  () =>
    import("@/components/charts/DashboardCharts").then(
      (mod) => mod.VulnStatusChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[240px] animate-pulse rounded-xl bg-[var(--bg-tertiary)]" />
    ),
  }
);

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";

interface DashboardStats {
  cisaKevCount: number;
  complianceScore: number;
  criticalAssets: number;
  criticalVulnerabilities: number;
  exploitedVulnerabilities: number;
  fixedThisMonth: number;
  highVulnerabilities: number;
  lowVulnerabilities: number;
  meanTimeToRemediate: number;
  mediumVulnerabilities: number;
  openVulnerabilities: number;
  overallRiskScore: number;
  threatIndicatorCount: number;
  totalAssets: number;
  totalVulnerabilities: number;
}

interface RiskTrendPoint {
  criticalVulns: number;
  date: string;
  highVulns: number;
  riskScore: number;
}

interface SeverityPoint {
  count: number;
  percentage: number;
  severity: Severity;
}

interface RiskAsset {
  criticalVulnCount: number;
  id: string;
  name: string;
  riskScore: number;
  type: string;
  vulnerabilityCount: number;
}

interface ComplianceOverviewItem {
  compliancePercentage: number;
  compliant: number;
  frameworkId: string;
  frameworkName: string;
  nonCompliant: number;
}

interface ActivityItem {
  action: string;
  entityName: string;
  entityType: string;
  id: string;
  timestamp: string;
}

interface ActivityLogResponse {
  logs?: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
  }>;
}

interface ExploitedVulnerability {
  affectedAssets?: number | null;
  cisaKev?: boolean;
  cveId?: string | null;
  epssScore?: number | null;
  id: string;
  severity: Severity;
  title: string;
}

interface RemediationPoint {
  closed: number;
  month: string;
  opened: number;
}

interface DashboardResponse {
  complianceOverview: ComplianceOverviewItem[];
  degraded?: boolean;
  exploitedVulnerabilities: ExploitedVulnerability[];
  lastUpdated: string;
  recentActivities: ActivityItem[];
  remediationTrends: RemediationPoint[];
  riskTrends: RiskTrendPoint[];
  severityDistribution: SeverityPoint[];
  stats: DashboardStats;
  topRiskyAssets: RiskAsset[];
}

const defaultStats: DashboardStats = {
  totalAssets: 0,
  criticalAssets: 0,
  totalVulnerabilities: 0,
  criticalVulnerabilities: 0,
  highVulnerabilities: 0,
  mediumVulnerabilities: 0,
  lowVulnerabilities: 0,
  exploitedVulnerabilities: 0,
  cisaKevCount: 0,
  threatIndicatorCount: 0,
  overallRiskScore: 0,
  complianceScore: 0,
  openVulnerabilities: 0,
  fixedThisMonth: 0,
  meanTimeToRemediate: 0,
};

const severityOrder: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const _numberFormatter = new Intl.NumberFormat("en-US");

function buildFallbackDashboardResponse(): DashboardResponse {
  const now = new Date();
  const riskTrends = Array.from({ length: 6 }, (_, index) => {
    const pointDate = new Date(now);
    pointDate.setDate(pointDate.getDate() - (5 - index) * 7);

    return {
      date: pointDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      riskScore: 0,
      criticalVulns: 0,
      highVulns: 0,
    };
  });

  return {
    stats: { ...defaultStats },
    riskTrends,
    severityDistribution: severityOrder.map((severity) => ({
      severity,
      count: 0,
      percentage: 0,
    })),
    topRiskyAssets: [],
    complianceOverview: [],
    recentActivities: [],
    exploitedVulnerabilities: [],
    remediationTrends: riskTrends.map((point) => ({
      month: point.date.split(" ")[0] ?? point.date,
      opened: 0,
      closed: 0,
    })),
    lastUpdated: now.toISOString(),
  };
}

function getRiskBand(score: number) {
  if (score >= 80) {
    return {
      label: "Critical",
      color: "text-red-600 dark:text-red-300",
      rail: "bg-red-400",
    };
  }
  if (score >= 60) {
    return {
      label: "High",
      color: "text-orange-600 dark:text-orange-300",
      rail: "bg-orange-400",
    };
  }
  if (score >= 40) {
    return {
      label: "Medium",
      color: "text-yellow-600 dark:text-yellow-300",
      rail: "bg-yellow-400",
    };
  }
  return {
    label: "Low",
    color: "text-emerald-600 dark:text-emerald-300",
    rail: "bg-emerald-400",
  };
}

function getComplianceTone(value: number) {
  if (value >= 80) {
    return "bg-emerald-400";
  }
  if (value >= 60) {
    return "bg-yellow-400";
  }
  return "bg-red-400";
}

function getSeverityBadgeTone(severity: Severity) {
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

function _getSeverityRailTone(severity: Severity) {
  if (severity === "CRITICAL") {
    return "bg-red-400";
  }
  if (severity === "HIGH") {
    return "bg-orange-400";
  }
  if (severity === "MEDIUM") {
    return "bg-yellow-400";
  }
  if (severity === "LOW") {
    return "bg-emerald-400";
  }
  return "bg-[var(--text-muted)]";
}

function getActivityTone(entityType: string, action: string) {
  // Specific action-based icons
  if (action === "User login" || action.toLowerCase().includes("login")) {
    return {
      icon: LogIn,
      iconColor: "text-emerald-600 dark:text-emerald-300",
      shell: "border-emerald-400/20 bg-emerald-500/10",
    };
  }

  if (
    action === "VULNERABILITY_CREATED" ||
    action.toLowerCase().includes("vulnerability created")
  ) {
    return {
      icon: ShieldAlert,
      iconColor: "text-red-600 dark:text-red-300",
      shell: "border-red-400/20 bg-red-500/10",
    };
  }

  if (
    action === "RISK_ASSESSMENT_COMPLETED" ||
    action.toLowerCase().includes("risk")
  ) {
    return {
      icon: Calculator,
      iconColor: "text-orange-600 dark:text-orange-300",
      shell: "border-orange-400/20 bg-orange-500/10",
    };
  }

  if (
    action.toLowerCase().includes("user created") ||
    action.toLowerCase().includes("user added")
  ) {
    return {
      icon: UserPlus,
      iconColor: "text-blue-600 dark:text-blue-300",
      shell: "border-blue-400/20 bg-blue-500/10",
    };
  }

  if (
    action.toLowerCase().includes("role updated") ||
    action.toLowerCase().includes("permission")
  ) {
    return {
      icon: UserCheck,
      iconColor: "text-purple-600 dark:text-purple-300",
      shell: "border-purple-400/20 bg-purple-500/10",
    };
  }

  if (
    action.toLowerCase().includes("settings") ||
    action.toLowerCase().includes("config")
  ) {
    return {
      icon: Settings,
      iconColor: "text-[var(--text-secondary)]",
      shell: "border-[var(--border-color)] bg-[var(--bg-tertiary)]",
    };
  }

  if (action.toLowerCase().includes("notification")) {
    return {
      icon: Bell,
      iconColor: "text-cyan-600 dark:text-cyan-300",
      shell: "border-cyan-400/20 bg-cyan-500/10",
    };
  }

  if (
    action.toLowerCase().includes("scan") ||
    action.toLowerCase().includes("scanner")
  ) {
    return {
      icon: Activity,
      iconColor: "text-indigo-600 dark:text-indigo-300",
      shell: "border-indigo-400/20 bg-indigo-500/10",
    };
  }

  if (
    action.toLowerCase().includes("report") ||
    action.toLowerCase().includes("export")
  ) {
    return {
      icon: FileText,
      iconColor: "text-amber-600 dark:text-amber-300",
      shell: "border-amber-400/20 bg-amber-500/10",
    };
  }

  if (
    action.toLowerCase().includes("deleted") ||
    action.toLowerCase().includes("removed")
  ) {
    return {
      icon: Trash2,
      iconColor: "text-red-600 dark:text-red-300",
      shell: "border-red-400/20 bg-red-500/10",
    };
  }

  if (
    action.toLowerCase().includes("updated") ||
    action.toLowerCase().includes("modified") ||
    action.toLowerCase().includes("edited")
  ) {
    return {
      icon: Edit,
      iconColor: "text-yellow-600 dark:text-yellow-300",
      shell: "border-yellow-400/20 bg-yellow-500/10",
    };
  }

  if (
    action.toLowerCase().includes("approved") ||
    action.toLowerCase().includes("completed") ||
    action.toLowerCase().includes("resolved")
  ) {
    return {
      icon: CheckCircle2,
      iconColor: "text-green-600 dark:text-green-300",
      shell: "border-green-400/20 bg-green-500/10",
    };
  }

  if (
    action.toLowerCase().includes("rejected") ||
    action.toLowerCase().includes("failed")
  ) {
    return {
      icon: XCircle,
      iconColor: "text-red-600 dark:text-red-300",
      shell: "border-red-400/20 bg-red-500/10",
    };
  }

  if (
    action.toLowerCase().includes("upload") ||
    action.toLowerCase().includes("import")
  ) {
    return {
      icon: Upload,
      iconColor: "text-teal-600 dark:text-teal-300",
      shell: "border-teal-400/20 bg-teal-500/10",
    };
  }

  if (action.toLowerCase().includes("download")) {
    return {
      icon: Download,
      iconColor: "text-blue-600 dark:text-blue-300",
      shell: "border-blue-400/20 bg-blue-500/10",
    };
  }

  if (
    action.toLowerCase().includes("locked") ||
    action.toLowerCase().includes("disabled")
  ) {
    return {
      icon: Lock,
      iconColor: "text-gray-600 dark:text-gray-300",
      shell: "border-gray-400/20 bg-gray-500/10",
    };
  }

  if (
    action.toLowerCase().includes("unlocked") ||
    action.toLowerCase().includes("enabled")
  ) {
    return {
      icon: Unlock,
      iconColor: "text-green-600 dark:text-green-300",
      shell: "border-green-400/20 bg-green-500/10",
    };
  }

  if (
    action.toLowerCase().includes("alert") ||
    action.toLowerCase().includes("warning")
  ) {
    return {
      icon: AlertCircle,
      iconColor: "text-orange-600 dark:text-orange-300",
      shell: "border-orange-400/20 bg-orange-500/10",
    };
  }

  // Entity type fallbacks
  if (entityType === "vulnerability") {
    return {
      icon: ShieldAlert,
      iconColor: "text-red-600 dark:text-red-300",
      shell: "border-red-400/20 bg-red-500/10",
    };
  }

  if (entityType === "asset") {
    return {
      icon: Server,
      iconColor: "text-intent-accent",
      shell: "border-sky-400/20 bg-sky-500/10",
    };
  }

  if (entityType === "user" || entityType === "auth") {
    return {
      icon: UserCheck,
      iconColor: "text-violet-600 dark:text-violet-300",
      shell: "border-violet-400/20 bg-violet-500/10",
    };
  }

  if (entityType === "compliance") {
    return {
      icon: FileCheck2,
      iconColor: "text-emerald-600 dark:text-emerald-300",
      shell: "border-emerald-400/20 bg-emerald-500/10",
    };
  }

  if (entityType === "RiskRegister" || entityType === "risk") {
    return {
      icon: Calculator,
      iconColor: "text-orange-600 dark:text-orange-300",
      shell: "border-orange-400/20 bg-orange-500/10",
    };
  }

  // Default fallback
  return {
    icon: Activity,
    iconColor: "text-violet-600 dark:text-violet-300",
    shell: "border-violet-400/20 bg-violet-500/10",
  };
}

function formatAssetType(type: string) {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [recentActivityLogs, setRecentActivityLogs] = useState<
    ActivityItem[] | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const isMainOfficer = session?.user?.role === "MAIN_OFFICER";

  const fetchDashboardData = useCallback(
    async ({
      signal,
      silent,
    }: {
      signal?: AbortSignal;
      silent?: boolean;
    } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        setError(null);
        const response = await fetch("/api/dashboard", {
          signal,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }
        const payload = (await response.json()) as DashboardResponse;
        setData(payload);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setData((previous) => previous ?? buildFallbackDashboardResponse());
        setError(err instanceof Error ? err.message : "An error occurred");
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

  const fetchRecentActivity = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/activity?limit=6", {
        signal,
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as ActivityLogResponse;
      const mappedLogs = (payload.logs ?? []).map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityName: log.entityId,
        timestamp: log.createdAt,
      }));

      setRecentActivityLogs(mappedLogs);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setRecentActivityLogs((previous) => previous ?? []);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchDashboardData({ signal: controller.signal });
    if (isMainOfficer) {
      void fetchRecentActivity(controller.signal);
    }

    const interval = setInterval(() => {
      if (isMainOfficer) {
        void fetchRecentActivity();
      }
    }, 30_000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [fetchDashboardData, fetchRecentActivity, isMainOfficer]);

  const stats = data?.stats ?? defaultStats;
  const riskBand = useMemo(
    () => getRiskBand(stats.overallRiskScore),
    [stats.overallRiskScore]
  );
  const _lastUpdatedLabel = data?.lastUpdated
    ? getTimeAgo(new Date(data.lastUpdated))
    : "just now";
  const activeThreats =
    stats.exploitedVulnerabilities + stats.threatIndicatorCount;

  const severityRows = useMemo(() => {
    const distributionMap = new Map(
      (data?.severityDistribution ?? []).map((item) => [
        item.severity,
        item.count,
      ])
    );
    return severityOrder.map((severity) => {
      const count = distributionMap.get(severity) ?? 0;
      const percentage =
        stats.totalVulnerabilities > 0
          ? (count / stats.totalVulnerabilities) * 100
          : 0;

      return {
        severity,
        count,
        percentage,
      };
    });
  }, [data?.severityDistribution, stats.totalVulnerabilities]);

  const priorityQueue = useMemo(
    () => (data?.exploitedVulnerabilities ?? []).slice(0, 6),
    [data?.exploitedVulnerabilities]
  );

  const riskyAssets = useMemo(
    () => (data?.topRiskyAssets ?? []).slice(0, 5),
    [data?.topRiskyAssets]
  );

  const complianceRows = useMemo(
    () => (data?.complianceOverview ?? []).slice(0, 4),
    [data?.complianceOverview]
  );

  const activityRows = useMemo(
    () => (recentActivityLogs ?? data?.recentActivities ?? []).slice(0, 6),
    [data?.recentActivities, recentActivityLogs]
  );

  const remediationTrends = data?.remediationTrends ?? [];
  const riskTrends = data?.riskTrends ?? [];

  if (isLoading && !data) {
    return (
      <DashboardLayout>
        <div
          aria-label="Loading dashboard"
          className="mx-auto w-full max-w-[1600px] space-y-6"
        >
          <div className="space-y-3 border-border border-b pb-6">
            <div className="h-7 w-56 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-full max-w-xl animate-pulse rounded-md bg-muted" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                className="h-32 animate-pulse rounded-lg border border-border bg-card"
                key={item}
              />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                className="h-72 animate-pulse rounded-lg border border-border bg-card"
                key={item}
              />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const riskMeter = Math.min(Math.max(stats.overallRiskScore, 0), 100);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1600px] space-y-6">
        <PageHeader
          actions={
            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  void fetchDashboardData({ silent: true });
                  void fetchRecentActivity();
                }}
                type="button"
                variant="outline"
              >
                <RefreshCw
                  aria-hidden="true"
                  className={cn(isRefreshing && "animate-spin")}
                  size={16}
                />
                Sync
              </Button>
              <Button asChild>
                <Link href="/threats">
                  Review vulnerabilities
                  <ArrowRight aria-hidden="true" size={16} />
                </Link>
              </Button>
            </div>
          }
          badge={
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-2.5 py-1 font-medium text-muted-foreground text-xs">
              <Activity aria-hidden="true" size={13} />
              Live intelligence
            </div>
          }
          description="A current view of vulnerabilities, business risk, and compliance across your organization."
          stats={[
            {
              label: "Assets",
              value: stats.totalAssets,
              icon: Server,
            },
            {
              label: "Remediated this month",
              value: stats.fixedThisMonth,
              icon: CheckCircle2,
            },
            {
              label: "CISA KEV",
              value: stats.cisaKevCount,
              icon: ShieldAlert,
            },
          ]}
          title="Security overview"
        />

        {error ? (
          <section
            className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-destructive"
                size={18}
              />
              <div>
                <p className="font-medium text-foreground">
                  Dashboard data is temporarily unavailable
                </p>
                <p className="mt-1 text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button
              onClick={() => void fetchDashboardData({ silent: true })}
              size="sm"
              type="button"
              variant="outline"
            >
              <RefreshCw aria-hidden="true" size={14} />
              Try again
            </Button>
          </section>
        ) : null}

        {data?.degraded && !error ? (
          <section
            className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
            role="status"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
                size={18}
              />
              <div>
                <p className="font-medium text-foreground">
                  Live workspace data is temporarily unavailable
                </p>
                <p className="mt-1 text-muted-foreground">
                  The zero values below are placeholders until your database
                  connection recovers.
                </p>
              </div>
            </div>
            <Button
              disabled={isRefreshing}
              onClick={() => void fetchDashboardData({ silent: true })}
              size="sm"
              type="button"
              variant="outline"
            >
              <RefreshCw
                aria-hidden="true"
                className={cn(isRefreshing && "animate-spin")}
                size={14}
              />
              Retry connection
            </Button>
          </section>
        ) : null}

        {/* HIGH PRIORITY SECTION */}
        {activeThreats > 0 ? (
          <section className="animate-slide-in-up rounded-2xl border border-red-400/25 bg-red-50/80 p-4 transition-all duration-300 hover:border-red-400/35 hover:bg-red-50/95 dark:border-red-400/20 dark:bg-red-500/5 dark:hover:border-red-400/30 dark:hover:bg-red-500/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 animate-pulse-subtle rounded-lg border border-red-400/30 bg-red-100/90 p-2 dark:border-red-400/25 dark:bg-red-500/10">
                  <AlertTriangle
                    className="text-red-700 dark:text-red-300"
                    size={16}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-[var(--text-primary)] text-sm">
                      Active Exploitation Signals
                    </h2>
                    <span className="rounded-full bg-red-600 px-2 py-0.5 font-bold text-[10px] text-white dark:bg-red-500">
                      HIGH PRIORITY
                    </span>
                  </div>
                  <p className="mt-1 text-[var(--text-secondary)] text-sm">
                    {stats.exploitedVulnerabilities} exploited vulnerabilities
                    and {stats.cisaKevCount} KEV-listed issues require
                    attention.
                  </p>
                </div>
              </div>
              <Link
                className="inline-flex items-center gap-2 self-start rounded-lg border border-red-200 bg-white px-3 py-1.5 font-semibold text-red-700 text-sm shadow-sm transition-all duration-200 hover:scale-105 hover:border-red-300 hover:bg-red-50 sm:self-auto dark:border-red-300/35 dark:bg-red-400/10 dark:text-red-100 dark:hover:bg-red-400/20"
                href="/vulnerabilities?filter=exploited"
              >
                Review now
                <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        ) : null}

        {/* MAIN KPIS */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            {
              label: "Vulnerability Stance",
              value: stats.openVulnerabilities,
              hint: `${stats.criticalVulnerabilities} Critical Issues`,
              icon: ShieldAlert,
              percent: stats.totalVulnerabilities
                ? (stats.openVulnerabilities / stats.totalVulnerabilities) * 100
                : 0,
            },
            {
              label: "Risk Posture",
              value: stats.overallRiskScore.toFixed(1),
              hint: `${riskBand.label} Exposure`,
              icon: Gauge,
              percent: stats.overallRiskScore,
            },
            {
              label: "Compliance Delta",
              value: `${stats.complianceScore.toFixed(0)}%`,
              hint: "Framework Coverage",
              icon: CheckCircle2,
              percent: stats.complianceScore,
            },
          ].map((metric, idx) => {
            const Icon = metric.icon;

            return (
              <Card
                className="group rounded-lg border-border p-0 shadow-none transition-colors hover:bg-accent/30"
                key={metric.label}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-[var(--text-secondary)] text-sm">
                        {metric.label}
                      </p>
                    </div>
                    <div className="rounded-md border border-border bg-muted p-2 text-muted-foreground">
                      <Icon aria-hidden="true" size={16} />
                    </div>
                  </div>
                  <p className="mt-4 font-semibold text-3xl text-foreground tabular-nums">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-[var(--text-muted)] text-sm">
                    {metric.hint}
                  </p>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                      style={{
                        width: `${Math.min(Math.max(metric.percent, 0), 100)}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
          {/* PRIORITY QUEUE */}
          <Card className="flex h-full flex-col rounded-lg border-border p-0 shadow-none xl:col-span-2">
            <CardContent className="flex h-full flex-col p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-base text-foreground">
                    Priority queue
                  </h2>
                  <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 font-medium text-destructive text-xs">
                    Active
                  </span>
                </div>
                <Link
                  className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                  href="/vulnerabilities?filter=exploited"
                >
                  View Queue
                </Link>
              </div>

              <div className="custom-scrollbar max-h-[300px] flex-1 space-y-3 overflow-y-auto">
                {priorityQueue.length > 0 ? (
                  priorityQueue.map((vuln) => (
                    <div
                      className="group rounded-md border border-border bg-background p-3 transition-colors hover:bg-accent/50"
                      key={vuln.id}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[var(--text-primary)] text-sm">
                            {vuln.title}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={`rounded border px-1.5 py-0.5 text-[10px] ${getSeverityBadgeTone(vuln.severity)}`}
                            >
                              {vuln.severity}
                            </span>
                            {vuln.cisaKev && (
                              <span className="font-bold text-[10px] text-red-500">
                                KEV
                              </span>
                            )}
                            <span className="font-mono text-[10px] text-[var(--text-muted)]">
                              {vuln.cveId}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-bold text-orange-500 text-sm">
                            {((vuln.epssScore || 0) * 100).toFixed(1)}%
                          </div>
                          <div className="text-[9px] text-[var(--text-muted)] uppercase">
                            EPSS
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-full items-center justify-center p-4 text-center text-[var(--text-muted)] text-sm">
                    No priority issues to review.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* RISK SNAPSHOT */}
          <Card className="flex flex-col items-center justify-center rounded-lg p-0 text-center shadow-none">
            <CardContent className="flex w-full flex-col items-center p-5 sm:p-6">
              <div className="relative mb-5">
                <svg
                  aria-label={`Overall risk score ${stats.overallRiskScore.toFixed(1)} out of 100`}
                  className="size-40 -rotate-90"
                  role="img"
                  viewBox="0 0 192 192"
                >
                  <circle
                    className="text-muted"
                    cx="96"
                    cy="96"
                    fill="none"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="8"
                  />
                  <circle
                    className="text-primary transition-all duration-700 ease-out"
                    cx="96"
                    cy="96"
                    fill="none"
                    r="88"
                    stroke="currentColor"
                    strokeDasharray={2 * Math.PI * 88}
                    strokeDashoffset={2 * Math.PI * 88 * (1 - riskMeter / 100)}
                    strokeLinecap="round"
                    strokeWidth="8"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-semibold text-4xl text-foreground tabular-nums tracking-tight">
                    {stats.overallRiskScore.toFixed(1)}
                  </span>
                  <span className="mt-1 text-muted-foreground text-xs">
                    Risk score
                  </span>
                </div>
              </div>
              <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-x-8 gap-y-4">
                {severityRows.map((entry) => (
                  <div className="group text-left" key={entry.severity}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium text-muted-foreground text-xs">
                        {entry.severity}
                      </span>
                      <span className="font-medium text-foreground text-sm tabular-nums">
                        {entry.count}
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                      <div
                        className={cn(
                          "h-full transition-all duration-1000",
                          entry.severity === "CRITICAL"
                            ? "bg-red-500"
                            : entry.severity === "HIGH"
                              ? "bg-orange-500"
                              : entry.severity === "MEDIUM"
                                ? "bg-yellow-500"
                                : "bg-blue-500"
                        )}
                        style={{ width: `${entry.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* THIRD ROW - ANALYTICS & ACTIVITY */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* ANALYTICS */}
          <div className="card lg:col-span-2">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-[var(--text-primary)] text-lg">
                    Compliance Overview
                  </h2>
                  <span className="rounded-full bg-[var(--bg-tertiary)] px-2 py-0.5 font-semibold text-[10px] text-[var(--text-secondary)]">
                    MONITOR
                  </span>
                </div>
                <p className="mt-1 text-[var(--text-secondary)] text-sm">
                  Framework posture by control status.
                </p>
              </div>
              <Link
                className="text-sky-700 text-sm transition-all duration-200 hover:scale-105 hover:text-sky-600 dark:text-sky-300 dark:hover:text-sky-200"
                href="/compliance"
              >
                Open module
              </Link>
            </div>

            <div className="mt-5 space-y-4">
              {complianceRows.length > 0 ? (
                complianceRows.map((framework) => (
                  <div key={framework.frameworkId}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-[var(--text-secondary)] text-sm">
                        {framework.frameworkName}
                      </p>
                      <p className="font-medium text-[var(--text-primary)] text-sm">
                        {framework.compliancePercentage.toFixed(0)}%
                      </p>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                      <div
                        className={`h-full rounded-full ${getComplianceTone(framework.compliancePercentage)}`}
                        style={{
                          width: `${Math.min(Math.max(framework.compliancePercentage, 0), 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1.5 text-[var(--text-secondary)] text-xs">
                      {framework.compliant} compliant · {framework.nonCompliant}{" "}
                      non-compliant
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4 text-[var(--text-muted)] text-sm">
                  Compliance frameworks are not configured yet.
                </p>
              )}
            </div>
          </div>

          <article
            className="animate-fade-in rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 transition-all duration-300 hover:border-sky-300/30"
            style={{ animationDelay: "300ms" }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-[var(--text-primary)] text-lg">
                    Top Risky Assets
                  </h2>
                  <span className="rounded-full border border-amber-300/60 bg-amber-100/85 px-2 py-0.5 font-semibold text-[10px] text-amber-800 dark:border-amber-400/35 dark:bg-amber-500/15 dark:text-amber-200">
                    REVIEW
                  </span>
                </div>
              </div>
              <Link
                className="text-sky-700 text-sm transition-all duration-200 hover:scale-105 hover:text-sky-600 dark:text-sky-300 dark:hover:text-sky-200"
                href="/assets"
              >
                View assets
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {riskyAssets.length > 0 ? (
                riskyAssets.map((asset, idx) => (
                  <div
                    className="group animate-fade-in rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-300/30 hover:bg-[var(--bg-elevated)]"
                    key={asset.id}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--text-secondary)] text-sm transition-colors duration-200 group-hover:text-[var(--text-primary)]">
                          {asset.name}
                        </p>
                        <p className="mt-0.5 text-[var(--text-muted)] text-xs">
                          {formatAssetType(asset.type)}
                        </p>
                      </div>
                      <p className="font-medium text-[var(--text-primary)] text-sm transition-all duration-200 group-hover:text-sky-500 dark:group-hover:text-sky-300">
                        {asset.riskScore.toFixed(1)}
                      </p>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]/50">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${getRiskBand(asset.riskScore).rail}`}
                        style={{
                          width: `${Math.min(Math.max(asset.riskScore, 0), 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1.5 text-[var(--text-muted)] text-xs">
                      {asset.vulnerabilityCount} vulnerabilities ·{" "}
                      {asset.criticalVulnCount} critical
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4 text-[var(--text-muted)] text-sm">
                  No asset risk data is available yet.
                </p>
              )}
            </div>
          </article>
        </div>

        <section
          className={`grid gap-4 ${isMainOfficer ? "xl:grid-cols-[1.15fr_0.85fr]" : "xl:grid-cols-1"}`}
        >
          <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
            <h2 className="font-semibold text-[var(--text-primary)] text-lg">
              Risk and Remediation Trends
            </h2>
            <p className="mt-1 text-[var(--text-secondary)] text-sm">
              Weekly risk evolution and monthly fix velocity.
            </p>

            <div className="mt-5">
              <p className="font-semibold text-[var(--text-muted)] text-xs uppercase tracking-[0.18em]">
                Risk Trend
              </p>
              <div className="mt-2">
                <RiskTrendChart data={riskTrends} />
              </div>
            </div>

            <div className="mt-6 border-[var(--border-color)] border-t pt-6">
              <p className="font-semibold text-[var(--text-muted)] text-xs uppercase tracking-[0.18em]">
                Remediation Velocity
              </p>
              <div className="mt-2">
                <VulnStatusChart data={remediationTrends} />
              </div>
            </div>
          </article>

          {isMainOfficer && (
            <article className="flex h-[600px] flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-[var(--text-primary)] text-lg">
                    Recent Activity
                  </h2>
                  <p className="mt-1 text-[var(--text-secondary)] text-sm">
                    Latest high-signal events.
                  </p>
                </div>
                <Link
                  className="text-sky-700 text-sm transition hover:text-sky-600 dark:text-sky-300 dark:hover:text-sky-200"
                  href="/reports/activity"
                >
                  Full log
                </Link>
              </div>

              <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-1">
                {activityRows.length > 0 ? (
                  activityRows.map((activity) => {
                    const activityTone = getActivityTone(
                      activity.entityType,
                      activity.action
                    );
                    const Icon = activityTone.icon;
                    return (
                      <div
                        className="group flex items-start gap-4 rounded-xl border border-transparent p-4 transition-all hover:border-white/5 hover:bg-white/[0.02]"
                        key={activity.id}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/5 shadow-lg transition-transform group-hover:scale-110",
                            activityTone.shell
                          )}
                        >
                          <Icon className={activityTone.iconColor} size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-start justify-between gap-2">
                            <p className="font-bold text-sm text-white leading-tight">
                              {activity.action}
                            </p>
                            <span className="shrink-0 font-bold text-[10px] text-[var(--text-muted)] uppercase">
                              {getTimeAgo(activity.timestamp)}
                            </span>
                          </div>
                          <p className="truncate font-mono text-[var(--text-muted)] text-xs">
                            {activity.entityName}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex h-full items-center justify-center text-center font-medium text-[var(--text-muted)] text-sm">
                    No recent signals detected.
                  </div>
                )}
              </div>
            </article>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
