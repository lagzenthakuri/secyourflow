"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
    StatCard,
    RiskScoreCard,
    SeverityBadge,
    Card,
    ProgressBar,
} from "@/components/ui/Cards";
import {
    RiskTrendChart,
    SeverityDistributionChart,
    ComplianceBarChart,
    VulnStatusChart,
    AssetTypeChart,
    EPSSChart,
} from "@/components/charts/DashboardCharts";
import { getTimeAgo } from "@/lib/utils";
import {
    Shield,
    Server,
    AlertTriangle,
    Bug,
    TrendingDown,
    Clock,
    ExternalLink,
    ChevronRight,
    Zap,
    Target,
    FileCheck,
    Activity,
} from "lucide-react";
import { SecurityLoader } from "@/components/ui/SecurityLoader";
import Link from "next/link";

export default function DashboardPage() {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setIsLoading(true);
                const response = await fetch("/api/dashboard");
                if (!response.ok) throw new Error("Failed to fetch dashboard data");
                const jsonData = await response.json();
                setData(jsonData);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <SecurityLoader
                        size="xl"
                        icon="shield"
                        variant="cyber"
                        text="Calculating risk scores and gathering intelligence..."
                    />
                </div>
            </DashboardLayout>
        );
    }

    if (error || !data) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-white mb-2">Error Loading Dashboard</h2>
                        <p className="text-[var(--text-secondary)] max-w-md mx-auto">
                            {error || "We couldn't load your security data. Please try refreshing the page."}
                        </p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="btn btn-primary mt-4"
                    >
                        Try Again
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const { stats, riskTrends, severityDistribution, topRiskyAssets, complianceOverview, recentActivities, exploitedVulnerabilities, remediationTrends, assetTypeDistribution, lastUpdated } = data as any;

    const lastUpdatedFormatted = lastUpdated ? getTimeAgo(new Date(lastUpdated)) : "Just now";

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            Security Dashboard
                        </h1>
                        <p className="text-[var(--text-secondary)] mt-1">
                            Real-time overview of your cyber risk posture
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-[var(--text-muted)]">
                            Last updated: {lastUpdatedFormatted}
                        </span>
                        <button className="btn btn-primary">
                            <Activity size={16} />
                            Run Scan
                        </button>
                    </div>
                </div>

                {/* Top Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        title="Total Assets"
                        value={(stats?.totalAssets || 0).toLocaleString()}
                        subtitle={`${stats?.criticalAssets || 0} critical`}
                        icon={<Server size={18} className="text-blue-400" />}
                        trend={{ value: 12, label: "this month" }}
                    />
                    <StatCard
                        title="Open Vulnerabilities"
                        value={(stats?.openVulnerabilities || 0).toLocaleString()}
                        subtitle={`${stats?.criticalVulnerabilities || 0} critical, ${stats?.highVulnerabilities || 0} high`}
                        icon={<Bug size={18} className="text-orange-400" />}
                        trend={{ value: -8, label: "this week" }}
                    />
                    <StatCard
                        title="Active Threats"
                        value={(stats?.exploitedVulnerabilities || 0) + (stats?.threatIndicatorCount || 0)}
                        subtitle={`${stats?.cisaKevCount || 0} KEV, ${stats?.threatIndicatorCount || 0} AI Identified`}
                        icon={<AlertTriangle size={18} className="text-red-400" />}
                        severity="CRITICAL"
                    />
                    <StatCard
                        title="Fixed This Month"
                        value={stats?.fixedThisMonth || 0}
                        subtitle={`MTTR: ${stats?.meanTimeToRemediate || 0} days`}
                        icon={<TrendingDown size={18} className="text-green-400" />}
                        trend={{ value: -15, label: "faster" }}
                    />
                </div>

                {/* Risk Score and Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Risk Score */}
                    <div className="lg:col-span-3">
                        <RiskScoreCard
                            score={stats?.overallRiskScore || 0}
                            label="Overall Risk Score"
                        />
                    </div>

                    {/* Risk Trend */}
                    <div className="lg:col-span-6">
                        <Card
                            title="Risk Score Trend"
                            subtitle="Last 6 weeks"
                            action={
                                <Link
                                    href="/reports"
                                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                >
                                    View Report <ChevronRight size={14} />
                                </Link>
                            }
                        >
                            <RiskTrendChart data={riskTrends} />
                        </Card>
                    </div>

                    {/* Severity Distribution */}
                    <div className="lg:col-span-3">
                        <Card title="Severity Distribution">
                            <SeverityDistributionChart data={severityDistribution} />
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                {(severityDistribution || []).map((item: any) => (
                                    <div key={item.severity} className="flex items-center gap-2">
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{
                                                background:
                                                    item.severity === "CRITICAL"
                                                        ? "#ef4444"
                                                        : item.severity === "HIGH"
                                                            ? "#f97316"
                                                            : item.severity === "MEDIUM"
                                                                ? "#eab308"
                                                                : "#22c55e",
                                            }}
                                        />
                                        <span className="text-xs text-[var(--text-muted)]">
                                            {item.severity}: {item.count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Exploited Vulnerabilities Banner */}
                <div className="card p-4 border-l-4 border-red-500 bg-red-500/5">
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-red-500/10">
                            <Zap size={20} className="text-red-400" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-white">
                                    Active Exploitation Detected
                                </h3>
                                <span className="live-indicator text-xs font-medium text-red-400">
                                    Live Threats
                                </span>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)]">
                                {stats?.exploitedVulnerabilities || 0} vulnerabilities are being
                                actively exploited in the wild. {stats?.cisaKevCount || 0} are listed
                                in the CISA Known Exploited Vulnerabilities catalog.
                            </p>
                        </div>
                        <Link
                            href="/threats"
                            className="btn btn-secondary text-red-400 border-red-500/30 hover:bg-red-500/10"
                        >
                            View Threats
                        </Link>
                    </div>
                </div>

                {/* Middle Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Top Exploited Vulnerabilities */}
                    <div className="lg:col-span-8">
                        <Card
                            title="Top Exploited Vulnerabilities"
                            subtitle="Prioritized by EPSS score and exploitation status"
                            action={
                                <Link
                                    href="/vulnerabilities?filter=exploited"
                                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                >
                                    View All <ChevronRight size={14} />
                                </Link>
                            }
                        >
                            <div className="space-y-3">
                                {(exploitedVulnerabilities || []).slice(0, 5).map((vuln: any, idx: number) => (
                                    <div
                                        key={vuln.id}
                                        className="flex items-center gap-4 p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] transition-all duration-300 ease-in-out cursor-pointer group"
                                    >
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                                            style={{
                                                background:
                                                    idx === 0
                                                        ? "rgba(239, 68, 68, 0.2)"
                                                        : "rgba(255, 255, 255, 0.05)",
                                                color: idx === 0 ? "#ef4444" : "#94a3b8",
                                            }}
                                        >
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono text-sm text-blue-400">
                                                    {vuln.cveId}
                                                </span>
                                                <SeverityBadge severity={vuln.severity} size="sm" />
                                                {vuln.cisaKev && <span className="kev-badge">KEV</span>}
                                            </div>
                                            <p className="text-sm text-[var(--text-secondary)] truncate">
                                                {vuln.title}
                                            </p>
                                        </div>
                                        <div className="text-right hidden md:block">
                                            <div className="text-sm font-medium text-white">
                                                {((vuln.epssScore || 0) * 100).toFixed(1)}%
                                            </div>
                                            <div className="text-xs text-[var(--text-muted)]">
                                                EPSS Score
                                            </div>
                                        </div>
                                        <div className="text-right hidden md:block">
                                            <div className="text-sm font-medium text-orange-400">
                                                {vuln.affectedAssets}
                                            </div>
                                            <div className="text-xs text-[var(--text-muted)]">
                                                Assets
                                            </div>
                                        </div>
                                        <ChevronRight
                                            size={18}
                                            className="text-[var(--text-muted)] group-hover:text-white transition-all duration-300 ease-in-out"
                                        />
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* EPSS Chart */}
                    <div className="lg:col-span-4">
                        <Card
                            title="Exploit Prediction (EPSS)"
                            subtitle="Probability of exploitation in next 30 days"
                        >
                            <EPSSChart
                                data={(exploitedVulnerabilities || []).map((v: any) => ({
                                    cveId: v.cveId,
                                    epssScore: v.epssScore,
                                    title: v.title,
                                }))}
                            />
                        </Card>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Top Risky Assets */}
                    <div className="lg:col-span-4">
                        <Card
                            title="Top Risky Assets"
                            subtitle="By risk score"
                            action={
                                <Link
                                    href="/assets?sort=risk"
                                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                >
                                    View All <ChevronRight size={14} />
                                </Link>
                            }
                        >
                            <div className="space-y-3">
                                {(topRiskyAssets || []).map((asset: any) => (
                                    <div
                                        key={asset.id}
                                        className="p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] transition-all duration-300 ease-in-out cursor-pointer"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Target size={14} className="text-[var(--text-muted)]" />
                                                <span className="text-sm font-medium text-white truncate max-w-[160px]">
                                                    {asset.name}
                                                </span>
                                            </div>
                                            <span
                                                className="text-sm font-bold"
                                                style={{
                                                    color:
                                                        asset.riskScore >= 80
                                                            ? "#ef4444"
                                                            : asset.riskScore >= 60
                                                                ? "#f97316"
                                                                : "#eab308",
                                                }}
                                            >
                                                {(asset.riskScore || 0).toFixed(1)}
                                            </span>
                                        </div>
                                        <ProgressBar
                                            value={asset.riskScore}
                                            color={
                                                asset.riskScore >= 80
                                                    ? "#ef4444"
                                                    : asset.riskScore >= 60
                                                        ? "#f97316"
                                                        : "#eab308"
                                            }
                                            showLabel={false}
                                        />
                                        <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                                            <span>{asset.vulnerabilityCount} vulns</span>
                                            <span>•</span>
                                            <span className="text-red-400">
                                                {asset.criticalVulnCount} critical
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Compliance Overview */}
                    <div className="lg:col-span-4">
                        <Card
                            title="Compliance Status"
                            subtitle="Framework compliance scores"
                            action={
                                <Link
                                    href="/compliance"
                                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                >
                                    View All <ChevronRight size={14} />
                                </Link>
                            }
                        >
                            <div className="space-y-4">
                                {(complianceOverview || []).map((framework: any) => (
                                    <div key={framework.frameworkId}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <FileCheck size={14} className="text-blue-400" />
                                                <span className="text-sm font-medium text-white">
                                                    {framework.frameworkName}
                                                </span>
                                            </div>
                                            <span
                                                className="text-sm font-bold"
                                                style={{
                                                    color:
                                                        (framework.compliancePercentage || 0) >= 80
                                                            ? "#22c55e"
                                                            : (framework.compliancePercentage || 0) >= 60
                                                                ? "#eab308"
                                                                : "#ef4444",
                                                }}
                                            >
                                                {(framework.compliancePercentage || 0).toFixed(0)}%
                                            </span>
                                        </div>
                                        <ProgressBar
                                            value={framework.compliancePercentage || 0}
                                            color={
                                                (framework.compliancePercentage || 0) >= 80
                                                    ? "#22c55e"
                                                    : (framework.compliancePercentage || 0) >= 60
                                                        ? "#eab308"
                                                        : "#ef4444"
                                            }
                                            showLabel={false}
                                        />
                                        <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-muted)]">
                                            <span className="text-green-400">
                                                {framework.compliant || 0} compliant
                                            </span>
                                            <span>•</span>
                                            <span className="text-red-400">
                                                {framework.nonCompliant || 0} non-compliant
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Recent Activity */}
                    <div className="lg:col-span-4">
                        <Card
                            title="Recent Activity"
                            subtitle="Latest security events"
                            action={
                                <Link
                                    href="/reports/activity"
                                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                >
                                    View All <ChevronRight size={14} />
                                </Link>
                            }
                        >
                            <div className="space-y-3">
                                {(recentActivities || []).map((activity: any) => (
                                    <div
                                        key={activity.id}
                                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-all duration-300 ease-in-out cursor-pointer"
                                    >
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{
                                                background:
                                                    activity.entityType === "vulnerability"
                                                        ? "rgba(239, 68, 68, 0.1)"
                                                        : activity.entityType === "asset"
                                                            ? "rgba(59, 130, 246, 0.1)"
                                                            : "rgba(139, 92, 246, 0.1)",
                                            }}
                                        >
                                            {activity.entityType === "vulnerability" ? (
                                                <Shield
                                                    size={14}
                                                    style={{ color: "#ef4444" }}
                                                />
                                            ) : activity.entityType === "asset" ? (
                                                <Server
                                                    size={14}
                                                    style={{ color: "#3b82f6" }}
                                                />
                                            ) : (
                                                <Activity
                                                    size={14}
                                                    style={{ color: "#8b5cf6" }}
                                                />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-[var(--text-secondary)]">
                                                {activity.action}
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)] truncate">
                                                {activity.entityName}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-xs text-[var(--text-muted)]">
                                                {getTimeAgo(activity.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Bottom Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Vulnerability Remediation Trends */}
                    <Card
                        title="Vulnerability Remediation"
                        subtitle="Monthly opened vs closed vulnerabilities"
                    >
                        <VulnStatusChart data={remediationTrends} />
                    </Card>

                    {/* Asset Type Distribution */}
                    <Card
                        title="Asset Distribution"
                        subtitle="By asset type"
                    >
                        <AssetTypeChart data={assetTypeDistribution} />
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
