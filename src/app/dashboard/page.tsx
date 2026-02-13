"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { getTimeAgo } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  FileCheck2,
  Gauge,
  RefreshCw,
  Server,
  ShieldAlert,
  Siren,
  LogIn,
  UserPlus,
  Settings,
  Bell,
  Calculator,
  FileText,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  Upload,
  Download,
  Lock,
  Unlock,
  UserCheck,
  AlertCircle,
} from "lucide-react";

const RiskTrendChart = dynamic(
  () =>
    import("@/components/charts/DashboardCharts").then((mod) => mod.RiskTrendChart),
  {
    ssr: false,
    loading: () => <div className="h-[280px] animate-pulse rounded-xl bg-white/5" />,
  },
);

const VulnStatusChart = dynamic(
  () =>
    import("@/components/charts/DashboardCharts").then((mod) => mod.VulnStatusChart),
  {
    ssr: false,
    loading: () => <div className="h-[240px] animate-pulse rounded-xl bg-white/5" />,
  },
);

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";

interface DashboardStats {
  totalAssets: number;
  criticalAssets: number;
  totalVulnerabilities: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  mediumVulnerabilities: number;
  lowVulnerabilities: number;
  exploitedVulnerabilities: number;
  cisaKevCount: number;
  threatIndicatorCount: number;
  overallRiskScore: number;
  complianceScore: number;
  openVulnerabilities: number;
  fixedThisMonth: number;
  meanTimeToRemediate: number;
}

interface RiskTrendPoint {
  date: string;
  riskScore: number;
  criticalVulns: number;
  highVulns: number;
}

interface SeverityPoint {
  severity: Severity;
  count: number;
  percentage: number;
}

interface RiskAsset {
  id: string;
  name: string;
  type: string;
  vulnerabilityCount: number;
  criticalVulnCount: number;
  riskScore: number;
}

interface ComplianceOverviewItem {
  frameworkId: string;
  frameworkName: string;
  compliant: number;
  nonCompliant: number;
  compliancePercentage: number;
}

interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityName: string;
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
  id: string;
  cveId?: string | null;
  title: string;
  severity: Severity;
  epssScore?: number | null;
  affectedAssets?: number | null;
  cisaKev?: boolean;
}

interface RemediationPoint {
  month: string;
  opened: number;
  closed: number;
}

interface DashboardResponse {
  stats: DashboardStats;
  riskTrends: RiskTrendPoint[];
  severityDistribution: SeverityPoint[];
  topRiskyAssets: RiskAsset[];
  complianceOverview: ComplianceOverviewItem[];
  recentActivities: ActivityItem[];
  exploitedVulnerabilities: ExploitedVulnerability[];
  remediationTrends: RemediationPoint[];
  lastUpdated: string;
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

const numberFormatter = new Intl.NumberFormat("en-US");

function buildFallbackDashboardResponse(): DashboardResponse {
  const now = new Date();
  const riskTrends = Array.from({ length: 6 }, (_, index) => {
    const pointDate = new Date(now);
    pointDate.setDate(pointDate.getDate() - (5 - index) * 7);

    return {
      date: pointDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
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
  if (score >= 80) return { label: "Critical", color: "text-red-300", rail: "bg-red-400" };
  if (score >= 60) return { label: "High", color: "text-orange-300", rail: "bg-orange-400" };
  if (score >= 40) return { label: "Medium", color: "text-yellow-300", rail: "bg-yellow-400" };
  return { label: "Low", color: "text-emerald-300", rail: "bg-emerald-400" };
}

function getComplianceTone(value: number) {
  if (value >= 80) return "bg-emerald-400";
  if (value >= 60) return "bg-yellow-400";
  return "bg-red-400";
}

function getSeverityBadgeTone(severity: Severity) {
  if (severity === "CRITICAL") return "border-red-400/35 bg-red-500/10 text-red-200";
  if (severity === "HIGH") return "border-orange-400/35 bg-orange-500/10 text-orange-200";
  if (severity === "MEDIUM") return "border-yellow-400/35 bg-yellow-500/10 text-yellow-200";
  if (severity === "LOW") return "border-emerald-400/35 bg-emerald-500/10 text-emerald-200";
  return "border-slate-400/35 bg-slate-500/10 text-[var(--text-secondary)]";
}

function getSeverityRailTone(severity: Severity) {
  if (severity === "CRITICAL") return "bg-red-400";
  if (severity === "HIGH") return "bg-orange-400";
  if (severity === "MEDIUM") return "bg-yellow-400";
  if (severity === "LOW") return "bg-emerald-400";
  return "bg-slate-400";
}

function getActivityTone(entityType: string, action: string) {
  // Specific action-based icons
  if (action === "User login" || action.toLowerCase().includes("login")) {
    return {
      icon: LogIn,
      iconColor: "text-emerald-300",
      shell: "border-emerald-400/20 bg-emerald-500/10",
    };
  }

  if (action === "VULNERABILITY_CREATED" || action.toLowerCase().includes("vulnerability created")) {
    return {
      icon: ShieldAlert,
      iconColor: "text-red-300",
      shell: "border-red-400/20 bg-red-500/10",
    };
  }

  if (action === "RISK_ASSESSMENT_COMPLETED" || action.toLowerCase().includes("risk")) {
    return {
      icon: Calculator,
      iconColor: "text-orange-300",
      shell: "border-orange-400/20 bg-orange-500/10",
    };
  }

  if (action.toLowerCase().includes("user created") || action.toLowerCase().includes("user added")) {
    return {
      icon: UserPlus,
      iconColor: "text-blue-300",
      shell: "border-blue-400/20 bg-blue-500/10",
    };
  }

  if (action.toLowerCase().includes("role updated") || action.toLowerCase().includes("permission")) {
    return {
      icon: UserCheck,
      iconColor: "text-purple-300",
      shell: "border-purple-400/20 bg-purple-500/10",
    };
  }

  if (action.toLowerCase().includes("settings") || action.toLowerCase().includes("config")) {
    return {
      icon: Settings,
      iconColor: "text-[var(--text-secondary)]",
      shell: "border-slate-400/20 bg-slate-500/10",
    };
  }

  if (action.toLowerCase().includes("notification")) {
    return {
      icon: Bell,
      iconColor: "text-cyan-300",
      shell: "border-cyan-400/20 bg-cyan-500/10",
    };
  }

  if (action.toLowerCase().includes("scan") || action.toLowerCase().includes("scanner")) {
    return {
      icon: Activity,
      iconColor: "text-indigo-300",
      shell: "border-indigo-400/20 bg-indigo-500/10",
    };
  }

  if (action.toLowerCase().includes("report") || action.toLowerCase().includes("export")) {
    return {
      icon: FileText,
      iconColor: "text-amber-300",
      shell: "border-amber-400/20 bg-amber-500/10",
    };
  }

  if (action.toLowerCase().includes("deleted") || action.toLowerCase().includes("removed")) {
    return {
      icon: Trash2,
      iconColor: "text-red-300",
      shell: "border-red-400/20 bg-red-500/10",
    };
  }

  if (action.toLowerCase().includes("updated") || action.toLowerCase().includes("modified") || action.toLowerCase().includes("edited")) {
    return {
      icon: Edit,
      iconColor: "text-yellow-300",
      shell: "border-yellow-400/20 bg-yellow-500/10",
    };
  }

  if (action.toLowerCase().includes("approved") || action.toLowerCase().includes("completed") || action.toLowerCase().includes("resolved")) {
    return {
      icon: CheckCircle2,
      iconColor: "text-green-300",
      shell: "border-green-400/20 bg-green-500/10",
    };
  }

  if (action.toLowerCase().includes("rejected") || action.toLowerCase().includes("failed")) {
    return {
      icon: XCircle,
      iconColor: "text-red-300",
      shell: "border-red-400/20 bg-red-500/10",
    };
  }

  if (action.toLowerCase().includes("upload") || action.toLowerCase().includes("import")) {
    return {
      icon: Upload,
      iconColor: "text-teal-300",
      shell: "border-teal-400/20 bg-teal-500/10",
    };
  }

  if (action.toLowerCase().includes("download")) {
    return {
      icon: Download,
      iconColor: "text-blue-300",
      shell: "border-blue-400/20 bg-blue-500/10",
    };
  }

  if (action.toLowerCase().includes("locked") || action.toLowerCase().includes("disabled")) {
    return {
      icon: Lock,
      iconColor: "text-gray-300",
      shell: "border-gray-400/20 bg-gray-500/10",
    };
  }

  if (action.toLowerCase().includes("unlocked") || action.toLowerCase().includes("enabled")) {
    return {
      icon: Unlock,
      iconColor: "text-green-300",
      shell: "border-green-400/20 bg-green-500/10",
    };
  }

  if (action.toLowerCase().includes("alert") || action.toLowerCase().includes("warning")) {
    return {
      icon: AlertCircle,
      iconColor: "text-orange-300",
      shell: "border-orange-400/20 bg-orange-500/10",
    };
  }

  // Entity type fallbacks
  if (entityType === "vulnerability") {
    return {
      icon: ShieldAlert,
      iconColor: "text-red-300",
      shell: "border-red-400/20 bg-red-500/10",
    };
  }

  if (entityType === "asset") {
    return {
      icon: Server,
      iconColor: "text-sky-300",
      shell: "border-sky-400/20 bg-sky-500/10",
    };
  }

  if (entityType === "user" || entityType === "auth") {
    return {
      icon: UserCheck,
      iconColor: "text-violet-300",
      shell: "border-violet-400/20 bg-violet-500/10",
    };
  }

  if (entityType === "compliance") {
    return {
      icon: FileCheck2,
      iconColor: "text-emerald-300",
      shell: "border-emerald-400/20 bg-emerald-500/10",
    };
  }

  if (entityType === "RiskRegister" || entityType === "risk") {
    return {
      icon: Calculator,
      iconColor: "text-orange-300",
      shell: "border-orange-400/20 bg-orange-500/10",
    };
  }

  // Default fallback
  return {
    icon: Activity,
    iconColor: "text-violet-300",
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
  const [recentActivityLogs, setRecentActivityLogs] = useState<ActivityItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const isMainOfficer = session?.user?.role === "MAIN_OFFICER";

  const fetchDashboardData = useCallback(
    async ({ signal, silent }: { signal?: AbortSignal; silent?: boolean } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        setError(null);
        const response = await fetch("/api/dashboard", { signal, cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }
        const payload = (await response.json()) as DashboardResponse;
        setData(payload);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
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
    [],
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
      if (err instanceof Error && err.name === "AbortError") return;
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
    }, 30000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [fetchDashboardData, fetchRecentActivity, isMainOfficer]);

  const stats = data?.stats ?? defaultStats;
  const riskBand = useMemo(() => getRiskBand(stats.overallRiskScore), [stats.overallRiskScore]);
  const lastUpdatedLabel = data?.lastUpdated
    ? getTimeAgo(new Date(data.lastUpdated))
    : "just now";
  const activeThreats = stats.exploitedVulnerabilities + stats.threatIndicatorCount;

  const severityRows = useMemo(() => {
    const distributionMap = new Map(
      (data?.severityDistribution ?? []).map((item) => [item.severity, item.count]),
    );
    return severityOrder.map((severity) => {
      const count = distributionMap.get(severity) ?? 0;
      const percentage =
        stats.totalVulnerabilities > 0 ? (count / stats.totalVulnerabilities) * 100 : 0;

      return {
        severity,
        count,
        percentage,
      };
    });
  }, [data?.severityDistribution, stats.totalVulnerabilities]);

  const priorityQueue = useMemo(
    () => (data?.exploitedVulnerabilities ?? []).slice(0, 6),
    [data?.exploitedVulnerabilities],
  );

  const riskyAssets = useMemo(
    () => (data?.topRiskyAssets ?? []).slice(0, 5),
    [data?.topRiskyAssets],
  );

  const complianceRows = useMemo(
    () => (data?.complianceOverview ?? []).slice(0, 4),
    [data?.complianceOverview],
  );

  const activityRows = useMemo(
    () => (recentActivityLogs ?? data?.recentActivities ?? []).slice(0, 6),
    [data?.recentActivities, recentActivityLogs],
  );

  const remediationTrends = data?.remediationTrends ?? [];
  const riskTrends = data?.riskTrends ?? [];

  if (isLoading && !data) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <ShieldLoader size="lg" variant="cyber" />
        </div>
      </DashboardLayout>
    );
  }

  const riskMeter = Math.min(Math.max(stats.overallRiskScore, 0), 100);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Security Dashboard"
          description="Centralized view for risk, threat activity, and remediation progress. Built to keep triage and action fast for SOC teams."
          badge={
            <>
              <Siren size={13} className="mr-2" />
              SOC Command Surface
            </>
          }
          actions={
            <>
              <button
                type="button"
                onClick={() => {
                  void fetchDashboardData({ silent: true });
                  void fetchRecentActivity();
                }}
                className="btn btn-secondary !px-4 !py-2.5"
              >
                <RefreshCw size={15} className={isRefreshing ? "animate-spin mr-2" : "mr-2"} />
                <span className="text-[var(--text-primary)]">Refresh</span>
              </button>
              <Link
                href="/risk-register"
                className="btn btn-secondary !px-4 !py-2.5"
              >
                <span className="text-[var(--text-primary)]">Risk Register</span>
                <ArrowRight size={14} className="ml-2 text-[var(--text-primary)]" />
              </Link>
              <Link
                href="/threats"
                className="btn btn-primary !px-5 !py-2.5 bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 hover:to-sky-300 border-none shadow-lg shadow-sky-500/20"
              >
                Threat Queue
                <ChevronRight size={14} className="ml-2" />
              </Link>
            </>
          }
          stats={[
            {
              label: "Last updated",
              value: lastUpdatedLabel,
              icon: Activity
            },
            {
              label: "Open Vulnerabilities",
              value: stats.openVulnerabilities,
              icon: ShieldAlert,
              trend: { value: `${stats.criticalVulnerabilities} critical`, isUp: false }
            },
            {
              label: "Active Threats",
              value: activeThreats,
              icon: Siren,
              trend: { value: "Live signals", neutral: true }
            },
            {
              label: "Overall Risk",
              value: `${stats.overallRiskScore.toFixed(1)}/100`,
              icon: Gauge,
              trend: { value: riskBand.label, neutral: true }
            }
          ]}
        />

        {error ? (
          <section className="rounded-2xl border border-red-400/25 bg-red-500/5 p-4 text-sm text-red-500 theme-dark:text-red-200">
            {error}
          </section>
        ) : null}

        {/* HIGH PRIORITY SECTION */}
        {activeThreats > 0 ? (
          <section className="rounded-2xl border border-red-400/20 bg-red-500/5 p-4 animate-slide-in-up transition-all duration-300 hover:border-red-400/30 hover:bg-red-500/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg border border-red-400/25 bg-red-500/10 p-2 animate-pulse-subtle">
                  <AlertTriangle size={16} className="text-red-500 theme-dark:text-red-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-red-600 theme-dark:text-red-100">Active Exploitation Signals</h2>
                    <span className="rounded-full bg-red-400 px-2 py-0.5 text-[10px] font-bold text-[var(--text-primary)]">HIGH PRIORITY</span>
                  </div>
                  <p className="mt-1 text-sm text-red-600/80 theme-dark:text-red-100/80">
                    {stats.exploitedVulnerabilities} exploited vulnerabilities and{" "}
                    {stats.cisaKevCount} KEV-listed issues require attention.
                  </p>
                </div>
              </div>
              <Link
                href="/vulnerabilities?filter=exploited"
                className="inline-flex items-center gap-2 self-start rounded-lg border border-red-300/35 bg-red-400/10 px-3 py-1.5 text-sm text-red-600 theme-dark:text-red-100 transition-all duration-200 hover:bg-red-400/20 hover:scale-105 sm:self-auto"
              >
                Review now
                <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        ) : null}

        {/* KEY METRICS */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Overall Risk Score",
              value: stats.overallRiskScore.toFixed(1),
              hint: `${riskBand.label} risk posture`,
              icon: Gauge,
              bar: stats.overallRiskScore,
              priority: stats.overallRiskScore >= 60 ? "high" : "low",
            },
            {
              label: "Open Vulnerabilities",
              value: numberFormatter.format(stats.openVulnerabilities),
              hint: `${stats.criticalVulnerabilities} critical · ${stats.highVulnerabilities} high`,
              icon: ShieldAlert,
              bar: stats.totalVulnerabilities
                ? (stats.openVulnerabilities / stats.totalVulnerabilities) * 100
                : 0,
              priority: stats.criticalVulnerabilities > 0 ? "high" : "low",
            },
            {
              label: "Active Threat Signals",
              value: numberFormatter.format(activeThreats),
              hint: `${stats.exploitedVulnerabilities} exploited · ${stats.threatIndicatorCount} indicators`,
              icon: Siren,
              bar: Math.min(activeThreats, 100),
              priority: activeThreats > 0 ? "high" : "low",
            },
            {
              label: "Compliance Score",
              value: `${stats.complianceScore.toFixed(0)}%`,
              hint: "Framework coverage health",
              icon: FileCheck2,
              bar: stats.complianceScore,
              priority: stats.complianceScore < 80 ? "high" : "low",
            },
          ].map((metric, idx) => {
            const Icon = metric.icon;

            return (
              <article
                key={metric.label}
                className="group rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/35 hover:shadow-lg hover:shadow-sky-500/10 animate-fade-in"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-[var(--text-secondary)]">{metric.label}</p>
                    {metric.priority === "high" && (
                      <span className="mt-1 inline-block rounded-full bg-orange-400/10 px-2 py-0.5 text-[10px] font-semibold text-orange-500 theme-dark:text-orange-300">
                        NEEDS ATTENTION
                      </span>
                    )}
                  </div>
                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2 transition-all duration-300 group-hover:scale-110 group-hover:bg-sky-300/10">
                    <Icon size={15} className="text-[var(--text-muted)] transition-colors group-hover:text-sky-500 theme-dark:group-hover:text-sky-300" />
                  </div>
                </div>
                <p className="mt-4 text-3xl font-semibold text-[var(--text-primary)] transition-all duration-300 group-hover:text-sky-500 theme-dark:group-hover:text-sky-300">{metric.value}</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{metric.hint}</p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                  <div
                    className="h-full rounded-full bg-sky-400 transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(Math.max(metric.bar, 0), 100)}%` }}
                  />
                </div>
              </article>
            );
          })}
        </section>

        {/* TOP PRIORITY SECTION */}
        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 transition-all duration-300 hover:border-orange-300/30 animate-slide-in-left">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Priority Queue</h2>
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-[var(--text-primary)] animate-pulse-subtle">
                    TOP PRIORITY
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Exploited vulnerabilities ranked for immediate SOC action.
                </p>
              </div>
              <Link
                href="/vulnerabilities?filter=exploited"
                className="text-sm text-sky-500 theme-dark:text-sky-300 transition-all duration-200 hover:text-sky-600 theme-dark:hover:text-sky-200 hover:scale-105"
              >
                View all
              </Link>
            </div>

            {priorityQueue.length > 0 ? (
              <div className="mt-5 space-y-3">
                {priorityQueue.map((vuln, index) => (
                  <div
                    key={vuln.id}
                    className="group rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-3 transition-all duration-300 hover:border-orange-300/40 hover:bg-[var(--bg-elevated)] hover:-translate-y-0.5 hover:shadow-lg animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-orange-400/20 px-2 py-0.5 text-xs font-semibold text-orange-500 theme-dark:text-orange-300 transition-all duration-200 group-hover:bg-orange-400/30">
                            #{index + 1}
                          </span>
                          <span className="font-mono text-xs text-sky-500 theme-dark:text-sky-300 transition-all duration-200 group-hover:text-sky-600 theme-dark:group-hover:text-sky-200">
                            {vuln.cveId || "No CVE ID"}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] transition-all duration-200 ${getSeverityBadgeTone(vuln.severity)}`}
                          >
                            {vuln.severity}
                          </span>
                          {vuln.cisaKev ? (
                            <span className="rounded-full border border-red-400/35 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-500 theme-dark:text-red-200 animate-pulse-subtle">
                              KEV
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 truncate text-sm text-[var(--text-secondary)] transition-colors duration-200 group-hover:text-[var(--text-primary)]">{vuln.title}</p>
                      </div>

                      <div className="flex items-center gap-5 text-right">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)] transition-all duration-200 group-hover:text-orange-500 theme-dark:group-hover:text-orange-300">
                            {((vuln.epssScore || 0) * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">EPSS</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)] transition-all duration-200 group-hover:text-orange-500 theme-dark:group-hover:text-orange-300">{vuln.affectedAssets || 0}</p>
                          <p className="text-xs text-[var(--text-muted)]">Assets</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-5 text-sm text-[var(--text-muted)]">
                No exploited vulnerabilities are currently tracked.
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 transition-all duration-300 hover:border-sky-300/30 animate-slide-in-right">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">SOC Risk Snapshot</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Distribution of vulnerability severity and current risk pressure.
            </p>

            <div className="mt-6 flex items-center justify-center">
              <div
                className="h-32 w-32 rounded-full p-[10px]"
                style={{
                  background: `conic-gradient(rgba(125,211,252,1) ${riskMeter}%, rgba(125,125,125,0.12) ${riskMeter}% 100%)`,
                }}
              >
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[var(--bg-card)]">
                  <p className="text-2xl font-semibold text-[var(--text-primary)]">{stats.overallRiskScore.toFixed(1)}</p>
                  <p className={`text-xs ${riskBand.color}`}>{riskBand.label}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {severityRows.map((entry) => (
                <div key={entry.severity}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">{entry.severity}</span>
                    <span className="text-[var(--text-muted)]">
                      {entry.count} ({entry.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                    <div
                      className={`h-full rounded-full ${getSeverityRailTone(entry.severity)}`}
                      style={{ width: `${Math.min(Math.max(entry.percentage, 0), 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        {/* LOWER PRIORITY SECTION */}
        <section className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 transition-all duration-300 hover:border-sky-300/30 animate-fade-in" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Compliance Overview</h2>
                  <span className="rounded-full bg-slate-500/20 px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                    MONITOR
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Framework posture by control status.</p>
              </div>
              <Link
                href="/compliance"
                className="text-sm text-sky-500 theme-dark:text-sky-300 transition-all duration-200 hover:text-sky-600 theme-dark:hover:text-sky-200 hover:scale-105"
              >
                Open module
              </Link>
            </div>

            <div className="mt-5 space-y-4">
              {complianceRows.length > 0 ? (
                complianceRows.map((framework) => (
                  <div key={framework.frameworkId}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-sm text-[var(--text-secondary)]">{framework.frameworkName}</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
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
                    <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                      {framework.compliant} compliant · {framework.nonCompliant} non-compliant
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4 text-sm text-[var(--text-muted)]">
                  Compliance frameworks are not configured yet.
                </p>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 transition-all duration-300 hover:border-sky-300/30 animate-fade-in" style={{ animationDelay: "300ms" }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Top Risky Assets</h2>
                  <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 text-[10px] font-semibold text-yellow-500 theme-dark:text-yellow-300">
                    REVIEW
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Assets with highest security exposure.</p>
              </div>
              <Link href="/assets" className="text-sm text-sky-500 theme-dark:text-sky-300 transition-all duration-200 hover:text-sky-600 theme-dark:hover:text-sky-200 hover:scale-105">
                View assets
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {riskyAssets.length > 0 ? (
                riskyAssets.map((asset, idx) => (
                  <div
                    key={asset.id}
                    className="group rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-3 transition-all duration-300 hover:border-sky-300/30 hover:bg-[var(--bg-elevated)] hover:-translate-y-0.5 animate-fade-in"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--text-secondary)] transition-colors duration-200 group-hover:text-[var(--text-primary)]">{asset.name}</p>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{formatAssetType(asset.type)}</p>
                      </div>
                      <p className="text-sm font-medium text-[var(--text-primary)] transition-all duration-200 group-hover:text-sky-500 theme-dark:group-hover:text-sky-300">{asset.riskScore.toFixed(1)}</p>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]/50">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${getRiskBand(asset.riskScore).rail}`}
                        style={{ width: `${Math.min(Math.max(asset.riskScore, 0), 100)}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                      {asset.vulnerabilityCount} vulnerabilities · {asset.criticalVulnCount} critical
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4 text-sm text-[var(--text-muted)]">
                  No asset risk data is available yet.
                </p>
              )}
            </div>
          </article>
        </section>

        <section className={`grid gap-4 ${isMainOfficer ? 'xl:grid-cols-[1.15fr_0.85fr]' : 'xl:grid-cols-1'}`}>
          <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Risk and Remediation Trends</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Weekly risk evolution and monthly fix velocity.
            </p>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Risk Trend
              </p>
              <div className="mt-2">
                <RiskTrendChart data={riskTrends} />
              </div>
            </div>

            <div className="mt-6 border-t border-[var(--border-color)] pt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Remediation Velocity
              </p>
              <div className="mt-2">
                <VulnStatusChart data={remediationTrends} />
              </div>
            </div>
          </article>

          {isMainOfficer && (
            <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Recent Activity</h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">Latest high-signal events and updates.</p>
                </div>
                <Link
                  href="/reports/activity"
                  className="text-sm text-sky-500 theme-dark:text-sky-300 transition hover:text-sky-600 theme-dark:hover:text-sky-200"
                >
                  Full log
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {activityRows.length > 0 ? (
                  activityRows.map((activity) => {
                    const activityTone = getActivityTone(activity.entityType, activity.action);
                    const Icon = activityTone.icon;

                    return (
                      <div
                        key={activity.id}
                        className="group rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-3 transition-all duration-300 hover:border-sky-300/20 hover:bg-[var(--bg-elevated)]"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-300 group-hover:scale-110 ${activityTone.shell}`}
                          >
                            <Icon size={14} className={`${activityTone.iconColor} transition-all duration-300`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-[var(--text-secondary)] transition-colors duration-200 group-hover:text-[var(--text-primary)]">{activity.action}</p>
                            <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{activity.entityName}</p>
                          </div>
                          <p className="text-xs text-[var(--text-muted)]">
                            {getTimeAgo(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4 text-sm text-[var(--text-muted)]">
                    No recent activities were recorded.
                  </p>
                )}
              </div>
            </article>
          )}
        </section>
      </div>
    </DashboardLayout >
  );
}
