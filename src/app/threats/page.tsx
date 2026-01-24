"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, SeverityBadge, ProgressBar } from "@/components/ui/Cards";
import { mockExploitedVulnerabilities, mockVulnerabilities } from "@/lib/mock-data";
import {
    AlertTriangle,
    Zap,
    Shield,
    ExternalLink,
    ChevronRight,
    Clock,
    Target,
    Globe,
    Activity,
    TrendingUp,
    RefreshCw,
    Filter,
} from "lucide-react";

export default function ThreatsPage() {
    const exploitedVulns = mockVulnerabilities.filter((v) => v.isExploited);
    const kevVulns = mockVulnerabilities.filter((v) => v.cisaKev);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Live Threats</h1>
                        <p className="text-[var(--text-secondary)] mt-1">
                            Active exploitation and threat intelligence overview
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                            <span className="live-indicator text-xs font-medium text-red-400">
                                Real-time Updates
                            </span>
                        </div>
                        <button className="btn btn-secondary">
                            <RefreshCw size={16} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Alert Banner */}
                <div className="card p-5 border-l-4 border-red-500 bg-red-500/5">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-red-500/10">
                            <Zap size={24} className="text-red-400" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-white mb-1">
                                Active Exploitation Detected
                            </h2>
                            <p className="text-[var(--text-secondary)] mb-3">
                                {exploitedVulns.length} vulnerabilities in your environment are being actively
                                exploited in the wild. {kevVulns.length} are listed in the CISA Known
                                Exploited Vulnerabilities catalog requiring urgent remediation.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)]">
                                    <AlertTriangle size={14} className="text-red-400" />
                                    <span className="text-sm text-white">{exploitedVulns.length} Exploited</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)]">
                                    <Shield size={14} className="text-orange-400" />
                                    <span className="text-sm text-white">{kevVulns.length} CISA KEV</span>
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)]">
                                    <Target size={14} className="text-blue-400" />
                                    <span className="text-sm text-white">
                                        {exploitedVulns.reduce((acc, v) => acc + (v.affectedAssets || 0), 0)} Assets at Risk
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="card p-4 border-l-2 border-red-500">
                        <p className="text-xs text-[var(--text-muted)] mb-1">High Risk EPSS</p>
                        <p className="text-2xl font-bold text-red-400">
                            {mockVulnerabilities.filter((v) => v.epssScore && v.epssScore > 0.7).length}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">&gt;70% exploitation probability</p>
                    </div>
                    <div className="card p-4 border-l-2 border-orange-500">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Weaponized</p>
                        <p className="text-2xl font-bold text-orange-400">
                            {mockVulnerabilities.filter((v) => v.exploitMaturity === "HIGH" || v.exploitMaturity === "FUNCTIONAL").length}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">Exploit code available</p>
                    </div>
                    <div className="card p-4 border-l-2 border-yellow-500">
                        <p className="text-xs text-[var(--text-muted)] mb-1">POC Available</p>
                        <p className="text-2xl font-bold text-yellow-400">
                            {mockVulnerabilities.filter((v) => v.exploitMaturity === "POC").length}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">Proof of concept exists</p>
                    </div>
                    <div className="card p-4 border-l-2 border-blue-500">
                        <p className="text-xs text-[var(--text-muted)] mb-1">Threat Feeds Active</p>
                        <p className="text-2xl font-bold text-blue-400">6</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">Connected sources</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Exploited Vulnerabilities List */}
                    <div className="lg:col-span-8">
                        <Card
                            title="Actively Exploited Vulnerabilities"
                            subtitle="Prioritized by risk and exploitation status"
                            action={
                                <button className="btn btn-ghost text-sm py-1">
                                    <Filter size={14} />
                                    Filter
                                </button>
                            }
                        >
                            <div className="space-y-4">
                                {mockExploitedVulnerabilities.map((vuln, idx) => (
                                    <div
                                        key={vuln.id}
                                        className="p-4 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                                                style={{
                                                    background: idx < 3 ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.05)",
                                                    color: idx < 3 ? "#ef4444" : "#94a3b8",
                                                }}
                                            >
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <a
                                                        href={`https://nvd.nist.gov/vuln/detail/${vuln.cveId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-mono text-sm text-blue-400 hover:underline flex items-center gap-1"
                                                    >
                                                        {vuln.cveId}
                                                        <ExternalLink size={10} />
                                                    </a>
                                                    <SeverityBadge severity={vuln.severity} size="sm" />
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[10px] font-semibold text-red-400">
                                                        <Zap size={10} />
                                                        ACTIVELY EXPLOITED
                                                    </span>
                                                    {vuln.cisaKev && <span className="kev-badge">CISA KEV</span>}
                                                </div>
                                                <h3 className="font-medium text-white mb-2">{vuln.title}</h3>

                                                {/* EPSS Score Bar */}
                                                <div className="mb-3">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs text-[var(--text-muted)]">
                                                            Exploitation Probability (EPSS)
                                                        </span>
                                                        <span className="text-xs font-medium text-white">
                                                            {(vuln.epssScore * 100).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                    <div className="epss-bar">
                                                        <div
                                                            className="epss-bar-fill"
                                                            style={{ width: `${vuln.epssScore * 100}%` }}
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
                                                            Exploit Maturity:{" "}
                                                            <span className="text-orange-400">{vuln.exploitMaturity}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="text-[var(--text-muted)] flex-shrink-0" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-4">
                        {/* Threat Feeds */}
                        <Card title="Active Threat Feeds" subtitle="Connected intelligence sources">
                            <div className="space-y-3">
                                {[
                                    { name: "NVD CVE Feed", status: "active", lastSync: "2 min ago" },
                                    { name: "CISA KEV Catalog", status: "active", lastSync: "5 min ago" },
                                    { name: "EPSS Scores", status: "active", lastSync: "1 hour ago" },
                                    { name: "MITRE ATT&CK", status: "active", lastSync: "6 hours ago" },
                                    { name: "Exploit-DB", status: "syncing", lastSync: "Syncing..." },
                                    { name: "AlienVault OTX", status: "active", lastSync: "12 hours ago" },
                                ].map((feed) => (
                                    <div
                                        key={feed.name}
                                        className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-2 h-2 rounded-full ${feed.status === "active"
                                                        ? "bg-green-400"
                                                        : feed.status === "syncing"
                                                            ? "bg-yellow-400 animate-pulse"
                                                            : "bg-gray-500"
                                                    }`}
                                            />
                                            <span className="text-sm text-white">{feed.name}</span>
                                        </div>
                                        <span className="text-xs text-[var(--text-muted)]">{feed.lastSync}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* MITRE ATT&CK Techniques */}
                        <Card title="Top ATT&CK Techniques" subtitle="Observed in your environment">
                            <div className="space-y-3">
                                {[
                                    { id: "T1190", name: "Exploit Public-Facing Application", count: 18 },
                                    { id: "T1133", name: "External Remote Services", count: 12 },
                                    { id: "T1078", name: "Valid Accounts", count: 8 },
                                    { id: "T1059", name: "Command & Scripting Interpreter", count: 6 },
                                    { id: "T1021", name: "Remote Services", count: 5 },
                                ].map((technique) => (
                                    <div key={technique.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-blue-400">{technique.id}</span>
                                            <span className="text-sm text-[var(--text-secondary)] truncate max-w-[160px]">
                                                {technique.name}
                                            </span>
                                        </div>
                                        <span className="text-sm font-medium text-white">{technique.count}</span>
                                    </div>
                                ))}
                            </div>
                            <a
                                href="https://attack.mitre.org"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-blue-400 hover:underline mt-4"
                            >
                                View full ATT&CK mapping
                                <ExternalLink size={10} />
                            </a>
                        </Card>

                        {/* Recent Threat Updates */}
                        <Card title="Recent Threat Updates">
                            <div className="space-y-3">
                                {[
                                    {
                                        title: "New critical vulnerability added to KEV",
                                        time: "15 min ago",
                                        type: "critical",
                                    },
                                    {
                                        title: "EPSS scores updated for 127 CVEs",
                                        time: "1 hour ago",
                                        type: "info",
                                    },
                                    {
                                        title: "Exploit code published for CVE-2024-3400",
                                        time: "3 hours ago",
                                        type: "warning",
                                    },
                                    {
                                        title: "Threat actor campaign targeting your sector",
                                        time: "6 hours ago",
                                        type: "warning",
                                    },
                                ].map((update, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer"
                                    >
                                        <div
                                            className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${update.type === "critical"
                                                    ? "bg-red-400"
                                                    : update.type === "warning"
                                                        ? "bg-orange-400"
                                                        : "bg-blue-400"
                                                }`}
                                        />
                                        <div>
                                            <p className="text-sm text-[var(--text-secondary)]">{update.title}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{update.time}</p>
                                        </div>
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
