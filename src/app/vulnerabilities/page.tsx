"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, SeverityBadge, ProgressBar } from "@/components/ui/Cards";
import { mockVulnerabilities, mockSeverityDistribution, mockVulnSourceDistribution } from "@/lib/mock-data";
import { SeverityDistributionChart } from "@/components/charts/DashboardCharts";
import { formatDate } from "@/lib/utils";
import {
    Shield,
    Search,
    Filter,
    Download,
    ChevronDown,
    ChevronRight,
    AlertTriangle,
    Zap,
    Clock,
    CheckCircle,
    XCircle,
    ExternalLink,
    MoreVertical,
    TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
    OPEN: { label: "Open", color: "#ef4444", icon: AlertTriangle },
    IN_PROGRESS: { label: "In Progress", color: "#3b82f6", icon: Clock },
    MITIGATED: { label: "Mitigated", color: "#8b5cf6", icon: Shield },
    FIXED: { label: "Fixed", color: "#22c55e", icon: CheckCircle },
    ACCEPTED: { label: "Accepted", color: "#6b7280", icon: CheckCircle },
    FALSE_POSITIVE: { label: "False Positive", color: "#6b7280", icon: XCircle },
};

export default function VulnerabilitiesPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [showExploited, setShowExploited] = useState(false);

    const filteredVulns = mockVulnerabilities.filter((vuln) => {
        const matchesSearch =
            vuln.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vuln.cveId?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSeverity = !selectedSeverity || vuln.severity === selectedSeverity;
        const matchesStatus = !selectedStatus || vuln.status === selectedStatus;
        const matchesExploited = !showExploited || vuln.isExploited;
        return matchesSearch && matchesSeverity && matchesStatus && matchesExploited;
    });

    const stats = {
        total: mockVulnerabilities.length,
        critical: mockVulnerabilities.filter((v) => v.severity === "CRITICAL").length,
        exploited: mockVulnerabilities.filter((v) => v.isExploited).length,
        open: mockVulnerabilities.filter((v) => v.status === "OPEN").length,
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Vulnerabilities</h1>
                        <p className="text-[var(--text-secondary)] mt-1">
                            Track and remediate vulnerabilities across your environment
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="btn btn-secondary">
                            <Download size={16} />
                            Export
                        </button>
                        <button className="btn btn-primary">
                            <TrendingUp size={16} />
                            Import Scan
                        </button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Shield size={18} className="text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stats.total}</p>
                                <p className="text-xs text-[var(--text-muted)]">Total Vulnerabilities</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-500/10">
                                <AlertTriangle size={18} className="text-red-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
                                <p className="text-xs text-[var(--text-muted)]">Critical</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-orange-500/10">
                                <Zap size={18} className="text-orange-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-orange-400">{stats.exploited}</p>
                                <p className="text-xs text-[var(--text-muted)]">Actively Exploited</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-yellow-500/10">
                                <Clock size={18} className="text-yellow-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stats.open}</p>
                                <p className="text-xs text-[var(--text-muted)]">Open</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Vulnerability List */}
                    <div className="lg:col-span-8">
                        <Card noPadding>
                            {/* Filters */}
                            <div className="p-4 border-b border-[var(--border-color)] flex flex-col md:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search
                                        size={16}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search by CVE ID or title..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="input pl-9 py-2 text-sm"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowExploited(!showExploited)}
                                        className={cn(
                                            "btn text-sm py-2",
                                            showExploited
                                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                                : "btn-secondary"
                                        )}
                                    >
                                        <Zap size={14} />
                                        Exploited Only
                                    </button>
                                    <button className="btn btn-secondary text-sm py-2">
                                        <Filter size={14} />
                                        Filters
                                        <ChevronDown size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Severity Tabs */}
                            <div className="px-4 py-3 border-b border-[var(--border-color)] flex gap-2 overflow-x-auto">
                                <button
                                    onClick={() => setSelectedSeverity(null)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                                        !selectedSeverity
                                            ? "bg-blue-500/20 text-blue-400"
                                            : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
                                    )}
                                >
                                    All Severities
                                </button>
                                {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((severity) => (
                                    <button
                                        key={severity}
                                        onClick={() => setSelectedSeverity(severity)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                                            selectedSeverity === severity
                                                ? `severity-${severity.toLowerCase()}`
                                                : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
                                        )}
                                    >
                                        {severity}
                                    </button>
                                ))}
                            </div>

                            {/* Vulnerability List */}
                            <div className="divide-y divide-[var(--border-color)]">
                                {filteredVulns.map((vuln) => {
                                    const status = statusConfig[vuln.status];

                                    return (
                                        <div
                                            key={vuln.id}
                                            className="p-4 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div
                                                    className="p-2.5 rounded-lg"
                                                    style={{
                                                        background:
                                                            vuln.severity === "CRITICAL"
                                                                ? "rgba(239, 68, 68, 0.1)"
                                                                : vuln.severity === "HIGH"
                                                                    ? "rgba(249, 115, 22, 0.1)"
                                                                    : "rgba(59, 130, 246, 0.1)",
                                                    }}
                                                >
                                                    <Shield
                                                        size={20}
                                                        style={{
                                                            color:
                                                                vuln.severity === "CRITICAL"
                                                                    ? "#ef4444"
                                                                    : vuln.severity === "HIGH"
                                                                        ? "#f97316"
                                                                        : "#3b82f6",
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        {vuln.cveId && (
                                                            <a
                                                                href={`https://nvd.nist.gov/vuln/detail/${vuln.cveId}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="font-mono text-sm text-blue-400 hover:underline flex items-center gap-1"
                                                            >
                                                                {vuln.cveId}
                                                                <ExternalLink size={10} />
                                                            </a>
                                                        )}
                                                        <SeverityBadge severity={vuln.severity} size="sm" />
                                                        {vuln.isExploited && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[10px] font-semibold text-red-400">
                                                                <Zap size={10} />
                                                                EXPLOITED
                                                            </span>
                                                        )}
                                                        {vuln.cisaKev && (
                                                            <span className="kev-badge">CISA KEV</span>
                                                        )}
                                                    </div>
                                                    <h3 className="font-medium text-white mb-1 line-clamp-1">
                                                        {vuln.title}
                                                    </h3>
                                                    <p className="text-sm text-[var(--text-muted)] line-clamp-2">
                                                        {vuln.description}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-[var(--text-muted)]">
                                                        {vuln.cvssScore && (
                                                            <span>
                                                                CVSS:{" "}
                                                                <span className="text-white font-medium">
                                                                    {vuln.cvssScore.toFixed(1)}
                                                                </span>
                                                            </span>
                                                        )}
                                                        {vuln.epssScore && (
                                                            <span>
                                                                EPSS:{" "}
                                                                <span className="text-white font-medium">
                                                                    {(vuln.epssScore * 100).toFixed(1)}%
                                                                </span>
                                                            </span>
                                                        )}
                                                        <span>
                                                            Status:{" "}
                                                            <span style={{ color: status.color }}>{status.label}</span>
                                                        </span>
                                                        <span>Source: {vuln.source}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right hidden md:block">
                                                    <div className="text-sm font-medium text-orange-400">
                                                        {vuln.affectedAssets}
                                                    </div>
                                                    <div className="text-xs text-[var(--text-muted)]">
                                                        Affected Assets
                                                    </div>
                                                </div>
                                                <button className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                                                    <MoreVertical size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            <div className="p-4 border-t border-[var(--border-color)] flex items-center justify-between">
                                <span className="text-sm text-[var(--text-muted)]">
                                    Showing {filteredVulns.length} vulnerabilities
                                </span>
                                <div className="flex gap-2">
                                    <button className="btn btn-secondary text-sm py-1.5 px-3" disabled>
                                        Previous
                                    </button>
                                    <button className="btn btn-secondary text-sm py-1.5 px-3">
                                        Next
                                    </button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-4">
                        <Card title="Severity Distribution">
                            <SeverityDistributionChart data={mockSeverityDistribution} />
                            <div className="space-y-2 mt-4">
                                {mockSeverityDistribution.map((item) => (
                                    <div key={item.severity} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded"
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
                                            <span className="text-sm text-[var(--text-secondary)]">
                                                {item.severity}
                                            </span>
                                        </div>
                                        <span className="text-sm font-medium text-white">{item.count}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card title="By Scanner Source">
                            <div className="space-y-3">
                                {mockVulnSourceDistribution.map((source) => (
                                    <div key={source.source}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm text-[var(--text-secondary)]">
                                                {source.source}
                                            </span>
                                            <span className="text-sm font-medium text-white">
                                                {source.count}
                                            </span>
                                        </div>
                                        <ProgressBar
                                            value={source.count}
                                            max={1600}
                                            showLabel={false}
                                            color="#06b6d4"
                                        />
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card title="EPSS Score Ranges">
                            <div className="space-y-3">
                                {[
                                    { range: "High (>70%)", count: 23, color: "#ef4444" },
                                    { range: "Medium (30-70%)", count: 89, color: "#f97316" },
                                    { range: "Low (10-30%)", count: 256, color: "#eab308" },
                                    { range: "Minimal (<10%)", count: 892, color: "#22c55e" },
                                ].map((item) => (
                                    <div
                                        key={item.range}
                                        className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-tertiary)]"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ background: item.color }}
                                            />
                                            <span className="text-sm text-[var(--text-secondary)]">
                                                {item.range}
                                            </span>
                                        </div>
                                        <span className="text-sm font-medium text-white">{item.count}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
