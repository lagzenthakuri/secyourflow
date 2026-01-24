"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, ProgressBar } from "@/components/ui/Cards";
import {
    RiskTrendChart,
    VulnStatusChart,
    ComplianceBarChart,
} from "@/components/charts/DashboardCharts";
import {
    mockRiskTrends,
    mockComplianceOverview,
    mockRemediationTrends,
    mockDashboardStats,
} from "@/lib/mock-data";
import {
    BarChart3,
    Download,
    FileText,
    Calendar,
    Clock,
    ChevronRight,
    TrendingDown,
    TrendingUp,
    Shield,
    Target,
    FileCheck,
    Plus,
} from "lucide-react";

const reports = [
    {
        id: "1",
        name: "Executive Risk Summary",
        description: "High-level overview of cyber risk posture for leadership",
        type: "executive",
        frequency: "Weekly",
        lastGenerated: "Jan 22, 2024",
        format: "PDF",
    },
    {
        id: "2",
        name: "Vulnerability Status Report",
        description: "Detailed breakdown of all vulnerabilities by severity and status",
        type: "technical",
        frequency: "Daily",
        lastGenerated: "Jan 24, 2024",
        format: "PDF/CSV",
    },
    {
        id: "3",
        name: "Compliance Audit Report",
        description: "Control status across all compliance frameworks",
        type: "compliance",
        frequency: "Monthly",
        lastGenerated: "Jan 1, 2024",
        format: "PDF",
    },
    {
        id: "4",
        name: "Asset Inventory Report",
        description: "Complete inventory of all monitored assets",
        type: "inventory",
        frequency: "Weekly",
        lastGenerated: "Jan 21, 2024",
        format: "CSV/Excel",
    },
    {
        id: "5",
        name: "Threat Intelligence Brief",
        description: "Summary of active threats and exploitation activity",
        type: "threat",
        frequency: "Daily",
        lastGenerated: "Jan 24, 2024",
        format: "PDF",
    },
    {
        id: "6",
        name: "Remediation Progress Report",
        description: "Tracking of vulnerability remediation over time",
        type: "tracking",
        frequency: "Weekly",
        lastGenerated: "Jan 22, 2024",
        format: "PDF/CSV",
    },
];

const reportTypeIcons: Record<string, typeof BarChart3> = {
    executive: TrendingUp,
    technical: Shield,
    compliance: FileCheck,
    inventory: Target,
    threat: TrendingDown,
    tracking: BarChart3,
};

export default function ReportsPage() {
    const stats = mockDashboardStats;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Reports</h1>
                        <p className="text-[var(--text-secondary)] mt-1">
                            Generate and schedule security reports
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="btn btn-secondary">
                            <Calendar size={16} />
                            Schedule
                        </button>
                        <button className="btn btn-primary">
                            <Plus size={16} />
                            Create Report
                        </button>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <TrendingDown size={18} className="text-blue-400" />
                            </div>
                            <div>
                                <p className="text-xl font-bold text-white">
                                    {stats.overallRiskScore.toFixed(1)}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">Risk Score</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/10">
                                <FileCheck size={18} className="text-green-400" />
                            </div>
                            <div>
                                <p className="text-xl font-bold text-white">
                                    {stats.complianceScore.toFixed(0)}%
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">Compliance</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-orange-500/10">
                                <Shield size={18} className="text-orange-400" />
                            </div>
                            <div>
                                <p className="text-xl font-bold text-white">{stats.fixedThisMonth}</p>
                                <p className="text-xs text-[var(--text-muted)]">Fixed This Month</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/10">
                                <Clock size={18} className="text-purple-400" />
                            </div>
                            <div>
                                <p className="text-xl font-bold text-white">
                                    {stats.meanTimeToRemediate} days
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">MTTR</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Risk Score Trend" subtitle="Last 6 weeks">
                        <RiskTrendChart data={mockRiskTrends} />
                    </Card>
                    <Card title="Remediation Activity" subtitle="Opened vs Closed">
                        <VulnStatusChart data={mockRemediationTrends} />
                    </Card>
                </div>

                {/* Compliance Overview */}
                <Card title="Compliance Overview" subtitle="Framework compliance scores">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ComplianceBarChart data={mockComplianceOverview} />
                        <div className="space-y-4">
                            {mockComplianceOverview.map((framework) => (
                                <div key={framework.frameworkId}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-white">{framework.frameworkName}</span>
                                        <span
                                            className="text-sm font-bold"
                                            style={{
                                                color:
                                                    framework.compliancePercentage >= 80
                                                        ? "#22c55e"
                                                        : framework.compliancePercentage >= 60
                                                            ? "#eab308"
                                                            : "#ef4444",
                                            }}
                                        >
                                            {framework.compliancePercentage.toFixed(0)}%
                                        </span>
                                    </div>
                                    <ProgressBar
                                        value={framework.compliancePercentage}
                                        color={
                                            framework.compliancePercentage >= 80
                                                ? "#22c55e"
                                                : framework.compliancePercentage >= 60
                                                    ? "#eab308"
                                                    : "#ef4444"
                                        }
                                        showLabel={false}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                {/* Available Reports */}
                <Card title="Report Templates" subtitle="Generate or schedule reports">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {reports.map((report) => {
                            const Icon = reportTypeIcons[report.type] || BarChart3;
                            return (
                                <div
                                    key={report.id}
                                    className="p-4 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer border border-transparent hover:border-blue-500/20"
                                >
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="p-2 rounded-lg bg-blue-500/10">
                                            <Icon size={18} className="text-blue-400" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-medium text-white mb-1">{report.name}</h3>
                                            <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                                                {report.description}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                                        <span>{report.frequency}</span>
                                        <span>{report.format}</span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-color)]">
                                        <button className="btn btn-primary text-xs py-1.5 flex-1">
                                            <Download size={12} />
                                            Generate
                                        </button>
                                        <button className="btn btn-secondary text-xs py-1.5">
                                            <Calendar size={12} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Recent Reports */}
                <Card title="Recently Generated" subtitle="Download previous reports">
                    <div className="space-y-2">
                        {[
                            { name: "Executive Risk Summary", date: "Jan 22, 2024", size: "1.2 MB" },
                            { name: "Vulnerability Status Report", date: "Jan 24, 2024", size: "3.4 MB" },
                            { name: "Asset Inventory Report", date: "Jan 21, 2024", size: "856 KB" },
                            { name: "Threat Intelligence Brief", date: "Jan 24, 2024", size: "542 KB" },
                        ].map((report, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-[var(--bg-tertiary)]">
                                        <FileText size={16} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-white">{report.name}</p>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            {report.date} • {report.size}
                                        </p>
                                    </div>
                                </div>
                                <button className="btn btn-ghost text-sm py-1.5">
                                    <Download size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    );
}
