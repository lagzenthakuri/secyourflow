"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { cn, getTimeAgo } from "@/lib/utils";
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
    loading: () => <div className="h-[280px] animate-pulse rounded-xl bg-[var(--bg-tertiary)]" />,
  },
);

const VulnStatusChart = dynamic(
  () =>
    import("@/components/charts/DashboardCharts").then((mod) => mod.VulnStatusChart),
  {
    ssr: false,
    loading: () => <div className="h-[240px] animate-pulse rounded-xl bg-[var(--bg-tertiary)]" />,
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
  if (score >= 80) return { label: "Critical", color: "text-red-600 dark:text-red-300", rail: "bg-red-400" };
  if (score >= 60) return { label: "High", color: "text-orange-600 dark:text-orange-300", rail: "bg-orange-400" };
  if (score >= 40) return { label: "Medium", color: "text-yellow-600 dark:text-yellow-300", rail: "bg-yellow-400" };
  return { label: "Low", color: "text-emerald-600 dark:text-emerald-300", rail: "bg-emerald-400" };
}

function getComplianceTone(value: number) {
  if (value >= 80) return "bg-emerald-400";
  if (value >= 60) return "bg-yellow-400";
  return "bg-red-400";
}

function getSeverityBadgeTone(severity: Severity) {
  if (severity === "CRITICAL") return "border-red-400/35 bg-red-500/10 text-red-700 dark:text-red-200";
  if (severity === "HIGH") return "border-orange-400/35 bg-orange-500/10 text-orange-700 dark:text-orange-200";
  if (severity === "MEDIUM") return "border-yellow-400/35 bg-yellow-500/10 text-yellow-700 dark:text-yellow-200";
  if (severity === "LOW") return "border-emerald-400/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200";
  return "border-[var(--border-hover)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]";
}

function getSeverityRailTone(severity: Severity) {
  if (severity === "CRITICAL") return "bg-red-400";
  if (severity === "HIGH") return "bg-orange-400";
  if (severity === "MEDIUM") return "bg-yellow-400";
  if (severity === "LOW") return "bg-emerald-400";
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

  if (action === "VULNERABILITY_CREATED" || action.toLowerCase().includes("vulnerability created")) {
    return {
      icon: ShieldAlert,
      iconColor: "text-red-600 dark:text-red-300",
      shell: "border-red-400/20 bg-red-500/10",
    };
  }

  if (action === "RISK_ASSESSMENT_COMPLETED" || action.toLowerCase().includes("risk")) {
    return {
      icon: Calculator,
      iconColor: "text-orange-600 dark:text-orange-300",
      shell: "border-orange-400/20 bg-orange-500/10",
    };
  }

  if (action.toLowerCase().includes("user created") || action.toLowerCase().includes("user added")) {
    return {
      icon: UserPlus,
      iconColor: "text-blue-600 dark:text-blue-300",
      shell: "border-blue-400/20 bg-blue-500/10",
    };
  }

  if (action.toLowerCase().includes("role updated") || action.toLowerCase().includes("permission")) {
    return {
      icon: UserCheck,
      iconColor: "text-purple-600 dark:text-purple-300",
      shell: "border-purple-400/20 bg-purple-500/10",
    };
  }

  if (action.toLowerCase().includes("settings") || action.toLowerCase().includes("config")) {
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

  if (action.toLowerCase().includes("scan") || action.toLowerCase().includes("scanner")) {
    return {
      icon: Activity,
      iconColor: "text-indigo-600 dark:text-indigo-300",
      shell: "border-indigo-400/20 bg-indigo-500/10",
    };
  }

  if (action.toLowerCase().includes("report") || action.toLowerCase().includes("export")) {
    return {
      icon: FileText,
      iconColor: "text-amber-600 dark:text-amber-300",
      shell: "border-amber-400/20 bg-amber-500/10",
    };
  }

  if (action.toLowerCase().includes("deleted") || action.toLowerCase().includes("removed")) {
    return {
      icon: Trash2,
      iconColor: "text-red-600 dark:text-red-300",
      shell: "border-red-400/20 bg-red-500/10",
    };
  }

  if (action.toLowerCase().includes("updated") || action.toLowerCase().includes("modified") || action.toLowerCase().includes("edited")) {
    return {
      icon: Edit,
      iconColor: "text-yellow-600 dark:text-yellow-300",
      shell: "border-yellow-400/20 bg-yellow-500/10",
    };
  }

  if (action.toLowerCase().includes("approved") || action.toLowerCase().includes("completed") || action.toLowerCase().includes("resolved")) {
    return {
      icon: CheckCircle2,
      iconColor: "text-green-600 dark:text-green-300",
      shell: "border-green-400/20 bg-green-500/10",
    };
  }

  if (action.toLowerCase().includes("rejected") || action.toLowerCase().includes("failed")) {
    return {
      icon: XCircle,
      iconColor: "text-red-600 dark:text-red-300",
      shell: "border-red-400/20 bg-red-500/10",
    };
  }

  if (action.toLowerCase().includes("upload") || action.toLowerCase().includes("import")) {
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

  if (action.toLowerCase().includes("locked") || action.toLowerCase().includes("disabled")) {
    return {
      icon: Lock,
      iconColor: "text-gray-600 dark:text-gray-300",
      shell: "border-gray-400/20 bg-gray-500/10",
    };
  }

  if (action.toLowerCase().includes("unlocked") || action.toLowerCase().includes("enabled")) {
    return {
      icon: Unlock,
      iconColor: "text-green-600 dark:text-green-300",
      shell: "border-green-400/20 bg-green-500/10",
    };
  }

  if (action.toLowerCase().includes("alert") || action.toLowerCase().includes("warning")) {
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
      <div className="space-y-8 animate-fade-in max-w-[1600px] mx-auto">
        <PageHeader
          title="Command Surface"
          description="Operational intelligence across your cyber risk perimeter. Real-time signals from assets, threats, and compliance frameworks."
          badge={
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest">
              <Activity size={12} className="animate-pulse" />
              Live Intelligence
            </div>
          }
          actions={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  void fetchDashboardData({ silent: true });
                  void fetchRecentActivity();
                }}
                className="btn btn-secondary !bg-transparent hover:!bg-white/5"
              >
                <RefreshCw size={16} className={cn("transition-transform", isRefreshing && "animate-spin")} />
                Sync
              </button>
              <Link
                href="/threats"
                className="btn btn-primary"
              >
                Triage Queue
                <ArrowRight size={16} />
              </Link>
            </div>
          }
          stats={[
            {
              label: "Assets",
              value: stats.totalAssets,
              icon: Server
            },
            {
              label: "Risk Score",
              value: stats.overallRiskScore.toFixed(1),
              icon: Gauge,
              trend: { value: riskBand.label, neutral: true }
            },
            {
              label: "CISA KEV",
              value: stats.cisaKevCount,
              icon: ShieldAlert,
              trend: { value: "Exploitable", isUp: true }
            }
          ]}
        />

        {error ? (
          <section className="rounded-2xl border border-red-400/25 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-200">
            {error}
          </section>
        ) : null}

        {/* HIGH PRIORITY SECTION */}
        {activeThreats > 0 ? (
          <section className="rounded-2xl border border-red-400/25 bg-red-50/80 p-4 animate-slide-in-up transition-all duration-300 hover:border-red-400/35 hover:bg-red-50/95 dark:border-red-400/20 dark:bg-red-500/5 dark:hover:border-red-400/30 dark:hover:bg-red-500/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg border border-red-400/30 bg-red-100/90 p-2 animate-pulse-subtle dark:border-red-400/25 dark:bg-red-500/10">
                  <AlertTriangle size={16} className="text-red-700 dark:text-red-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">Active Exploitation Signals</h2>
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white dark:bg-red-500">HIGH PRIORITY</span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {stats.exploitedVulnerabilities} exploited vulnerabilities and{" "}
                    {stats.cisaKevCount} KEV-listed issues require attention.
                  </p>
                </div>
              </div>
              <Link
                href="/vulnerabilities?filter=exploited"
                className="inline-flex items-center gap-2 self-start rounded-lg border border-red-300/45 bg-red-100/90 px-3 py-1.5 text-sm text-red-800 transition-all duration-200 hover:bg-red-200/80 hover:scale-105 dark:border-red-300/35 dark:bg-red-400/10 dark:text-red-100 dark:hover:bg-red-400/20 sm:self-auto"
              >
                Review now
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* MAIN KPIS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: "Vulnerability Stance",
              value: stats.openVulnerabilities,
              hint: `${stats.criticalVulnerabilities} Critical Issues`,
              icon: ShieldAlert,
              color: "from-blue-500 to-cyan-400",
              percent: stats.totalVulnerabilities ? (stats.openVulnerabilities / stats.totalVulnerabilities) * 100 : 0
            },
            {
              label: "Risk Posture",
              value: stats.overallRiskScore.toFixed(1),
              hint: `${riskBand.label} Exposure`,
              icon: Gauge,
              color: "from-purple-500 to-indigo-400",
              percent: stats.overallRiskScore
            },
            {
              label: "Compliance Delta",
              value: `${stats.complianceScore.toFixed(0)}%`,
              hint: "Framework Coverage",
              icon: CheckCircle2,
              color: "from-emerald-500 to-teal-400",
              percent: stats.complianceScore
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
                      <span className="mt-1 inline-block rounded-full border border-orange-300/55 bg-orange-100/90 px-2 py-0.5 text-[10px] font-semibold text-orange-800 dark:border-orange-400/35 dark:bg-orange-500/15 dark:text-orange-200">
                        NEEDS ATTENTION
                      </span>
                    )}
                  </div>
                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2 transition-all duration-300 group-hover:scale-110 group-hover:bg-sky-300/10">
                    <Icon size={15} className="text-[var(--text-muted)] transition-colors group-hover:text-sky-500 dark:group-hover:text-sky-300" />
                  </div>
                </div>
                <p className="mt-4 text-3xl font-semibold text-[var(--text-primary)] transition-all duration-300 group-hover:text-sky-500 dark:group-hover:text-sky-300">{metric.value}</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{metric.hint}</p>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                  <div
                    className="h-full rounded-full bg-sky-400 transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(Math.max(metric.bar, 0), 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Priority Queue</h2>
                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white animate-pulse-subtle">
                    TOP PRIORITY
                  </span>
                </div>
              </div>
              <Link
                href="/vulnerabilities?filter=exploited"
                className="text-sm text-sky-700 dark:text-sky-300 transition-all duration-200 hover:text-sky-600 dark:hover:text-sky-200 hover:scale-105"
              >
                View all
              </Link>
            </div>
          ))}
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
                          <span className="rounded-md bg-orange-400/20 px-2 py-0.5 text-xs font-semibold text-orange-700 dark:text-orange-300 transition-all duration-200 group-hover:bg-orange-400/30">
                            #{index + 1}
                          </span>
                          <span className="font-mono text-xs text-sky-700 dark:text-sky-300 transition-all duration-200 group-hover:text-sky-600 dark:group-hover:text-sky-200">
                            {vuln.cveId || "No CVE ID"}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] transition-all duration-200 ${getSeverityBadgeTone(vuln.severity)}`}
                          >
                            {vuln.severity}
                          </span>
                          {vuln.cisaKev ? (
                            <span className="rounded-full border border-red-400/35 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-700 dark:text-red-200 animate-pulse-subtle">
                              KEV
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 truncate text-sm text-[var(--text-secondary)] transition-colors duration-200 group-hover:text-[var(--text-primary)]">{vuln.title}</p>
                      </div>

                      <div className="flex items-center gap-5 text-right">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)] transition-all duration-200 group-hover:text-orange-500 dark:group-hover:text-orange-300">
                            {((vuln.epssScore || 0) * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">EPSS</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)] transition-all duration-200 group-hover:text-orange-500 dark:group-hover:text-orange-300">{vuln.affectedAssets || 0}</p>
                          <p className="text-xs text-[var(--text-muted)]">Assets</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-white truncate leading-tight">{vuln.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-white">{((vuln.epssScore || 0) * 100).toFixed(1)}%</div>
                      <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">EPSS</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-[var(--text-muted)] text-sm font-medium">No critical vulnerabilities detected.</div>
              )}
            </div>
          </div>

          {/* RISK SNAPSHOT */}
          <div className="card flex flex-col items-center justify-center py-12 px-8 text-center bg-gradient-to-b from-[var(--bg-card)] to-[var(--bg-primary)]">
            <div className="relative mb-8">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="8" className="text-[var(--bg-tertiary)]" />
                <circle
                  cx="96" cy="96" r="88" fill="none" stroke="url(#riskGradient)" strokeWidth="12"
                  strokeDasharray={2 * Math.PI * 88}
                  strokeDashoffset={2 * Math.PI * 88 * (1 - riskMeter / 100)}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]"
                />
                <defs>
                  <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black text-white tracking-tighter">{stats.overallRiskScore.toFixed(1)}</span>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mt-1">System Risk</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 w-full max-w-md mx-auto">
              {severityRows.map((entry) => (
                <div key={entry.severity} className="text-left group">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">{entry.severity}</span>
                    <span className="text-xs font-black text-white">{entry.count}</span>
                  </div>
                  <div className="h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-1000",
                        entry.severity === "CRITICAL" ? "bg-red-500" :
                          entry.severity === "HIGH" ? "bg-orange-500" :
                            entry.severity === "MEDIUM" ? "bg-yellow-500" : "bg-blue-500"
                      )}
                      style={{ width: `${entry.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* THIRD ROW - ANALYTICS & ACTIVITY */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ANALYTICS */}
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Compliance Overview</h2>
                  <span className="rounded-full bg-[var(--bg-tertiary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
                    MONITOR
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Framework posture by control status.</p>
              </div>
              <Link
                href="/compliance"
                className="text-sm text-sky-700 dark:text-sky-300 transition-all duration-200 hover:text-sky-600 dark:hover:text-sky-200 hover:scale-105"
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
                    <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
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
                  <span className="rounded-full border border-amber-300/60 bg-amber-100/85 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-400/35 dark:bg-amber-500/15 dark:text-amber-200">
                    REVIEW
                  </span>
                </div>
              </div>
              <Link href="/assets" className="text-sm text-sky-700 dark:text-sky-300 transition-all duration-200 hover:text-sky-600 dark:hover:text-sky-200 hover:scale-105">
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
                      <p className="text-sm font-medium text-[var(--text-primary)] transition-all duration-200 group-hover:text-sky-500 dark:group-hover:text-sky-300">{asset.riskScore.toFixed(1)}</p>
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
          </div>

          {isMainOfficer && (
            <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Recent Activity</h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">Latest high-signal events and updates.</p>
                </div>
                <Link
                  href="/reports/activity"
                  className="text-sm text-sky-700 dark:text-sky-300 transition hover:text-sky-600 dark:hover:text-sky-200"
                >
                  Full log
                </Link>
              </div>
              <Link href="/reports/activity" className="p-2 rounded-lg hover:bg-white/5 transition-colors text-[var(--text-muted)]">
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {activityRows.length > 0 ? (
                activityRows.map((activity) => {
                  const activityTone = getActivityTone(activity.entityType, activity.action);
                  const Icon = activityTone.icon;
                  return (
                    <div key={activity.id} className="flex items-start gap-4 p-4 rounded-xl hover:bg-white/[0.02] transition-all group">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5 transition-transform group-hover:scale-110 shadow-lg",
                        activityTone.shell
                      )}>
                        <Icon size={16} className={activityTone.iconColor} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <p className="text-sm font-bold text-white leading-tight">{activity.action}</p>
                          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase shrink-0">
                            {getTimeAgo(activity.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] truncate font-mono">{activity.entityName}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-10 text-center text-[var(--text-muted)] text-sm font-medium">No recent signals detected.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
