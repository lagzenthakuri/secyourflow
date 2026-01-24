"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, ProgressBar } from "@/components/ui/Cards";
import { mockComplianceOverview } from "@/lib/mock-data";
import { ComplianceBarChart } from "@/components/charts/DashboardCharts";
import {
    FileCheck,
    ChevronDown,
    ChevronRight,
    CheckCircle,
    XCircle,
    AlertTriangle,
    HelpCircle,
    Download,
    Plus,
    Filter,
    Search,
    Calendar,
    Shield,
    TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock compliance controls for detailed view
const mockControls = [
    {
        id: "A.5.1",
        title: "Policies for information security",
        category: "Organizational Controls",
        status: "COMPLIANT",
        implementationStatus: "IMPLEMENTED",
        lastAssessed: "2024-01-15",
        linkedVulns: 0,
    },
    {
        id: "A.5.2",
        title: "Information security roles and responsibilities",
        category: "Organizational Controls",
        status: "COMPLIANT",
        implementationStatus: "IMPLEMENTED",
        lastAssessed: "2024-01-15",
        linkedVulns: 0,
    },
    {
        id: "A.8.8",
        title: "Management of technical vulnerabilities",
        category: "Technological Controls",
        status: "NON_COMPLIANT",
        implementationStatus: "PARTIALLY_IMPLEMENTED",
        lastAssessed: "2024-01-10",
        linkedVulns: 127,
    },
    {
        id: "A.8.9",
        title: "Configuration management",
        category: "Technological Controls",
        status: "PARTIALLY_COMPLIANT",
        implementationStatus: "PARTIALLY_IMPLEMENTED",
        lastAssessed: "2024-01-12",
        linkedVulns: 45,
    },
    {
        id: "A.8.12",
        title: "Data leakage prevention",
        category: "Technological Controls",
        status: "COMPLIANT",
        implementationStatus: "IMPLEMENTED",
        lastAssessed: "2024-01-08",
        linkedVulns: 3,
    },
    {
        id: "A.8.15",
        title: "Logging",
        category: "Technological Controls",
        status: "COMPLIANT",
        implementationStatus: "IMPLEMENTED",
        lastAssessed: "2024-01-14",
        linkedVulns: 0,
    },
    {
        id: "A.8.16",
        title: "Monitoring activities",
        category: "Technological Controls",
        status: "PARTIALLY_COMPLIANT",
        implementationStatus: "PARTIALLY_IMPLEMENTED",
        lastAssessed: "2024-01-14",
        linkedVulns: 12,
    },
    {
        id: "A.8.20",
        title: "Networks security",
        category: "Technological Controls",
        status: "NON_COMPLIANT",
        implementationStatus: "PLANNED",
        lastAssessed: "2024-01-05",
        linkedVulns: 28,
    },
];

const statusConfig = {
    COMPLIANT: { label: "Compliant", color: "#22c55e", icon: CheckCircle },
    NON_COMPLIANT: { label: "Non-Compliant", color: "#ef4444", icon: XCircle },
    PARTIALLY_COMPLIANT: { label: "Partial", color: "#eab308", icon: AlertTriangle },
    NOT_ASSESSED: { label: "Not Assessed", color: "#6b7280", icon: HelpCircle },
    NOT_APPLICABLE: { label: "N/A", color: "#6b7280", icon: HelpCircle },
};

export default function CompliancePage() {
    const [selectedFramework, setSelectedFramework] = useState(mockComplianceOverview[0]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

    const filteredControls = mockControls.filter((control) => {
        const matchesSearch =
            control.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            control.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = !selectedStatus || control.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    const complianceStats = {
        total: mockControls.length,
        compliant: mockControls.filter((c) => c.status === "COMPLIANT").length,
        nonCompliant: mockControls.filter((c) => c.status === "NON_COMPLIANT").length,
        partial: mockControls.filter((c) => c.status === "PARTIALLY_COMPLIANT").length,
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Compliance</h1>
                        <p className="text-[var(--text-secondary)] mt-1">
                            Track compliance status across frameworks and controls
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="btn btn-secondary">
                            <Download size={16} />
                            Export Report
                        </button>
                        <button className="btn btn-primary">
                            <Plus size={16} />
                            Add Framework
                        </button>
                    </div>
                </div>

                {/* Framework Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {mockComplianceOverview.map((framework) => (
                        <div
                            key={framework.frameworkId}
                            onClick={() => setSelectedFramework(framework)}
                            className={cn(
                                "card p-4 cursor-pointer transition-all",
                                selectedFramework.frameworkId === framework.frameworkId
                                    ? "border-blue-500/50 bg-blue-500/5"
                                    : "hover:border-[var(--border-hover)]"
                            )}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 rounded-lg bg-blue-500/10">
                                    <FileCheck size={18} className="text-blue-400" />
                                </div>
                                <span
                                    className="text-2xl font-bold"
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
                            <h3 className="font-medium text-white mb-1">{framework.frameworkName}</h3>
                            <p className="text-xs text-[var(--text-muted)]">
                                {framework.totalControls} controls
                            </p>
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
                                className="mt-3"
                            />
                            <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
                                <span className="text-green-400">{framework.compliant} ✓</span>
                                <span className="text-red-400">{framework.nonCompliant} ✗</span>
                                <span className="text-yellow-400">{framework.partiallyCompliant} ~</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Controls List */}
                    <div className="lg:col-span-8">
                        <Card
                            title={`${selectedFramework.frameworkName} Controls`}
                            subtitle={`${selectedFramework.totalControls} total controls`}
                            noPadding
                        >
                            {/* Filters */}
                            <div className="p-4 border-b border-[var(--border-color)] flex flex-col md:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search
                                        size={16}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search controls..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="input pl-9 py-2 text-sm"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button className="btn btn-secondary text-sm py-2">
                                        <Filter size={14} />
                                        Filters
                                        <ChevronDown size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Status Tabs */}
                            <div className="px-4 py-3 border-b border-[var(--border-color)] flex gap-2 overflow-x-auto">
                                <button
                                    onClick={() => setSelectedStatus(null)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                                        !selectedStatus
                                            ? "bg-blue-500/20 text-blue-400"
                                            : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
                                    )}
                                >
                                    All ({complianceStats.total})
                                </button>
                                <button
                                    onClick={() => setSelectedStatus("COMPLIANT")}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1",
                                        selectedStatus === "COMPLIANT"
                                            ? "bg-green-500/20 text-green-400"
                                            : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
                                    )}
                                >
                                    <CheckCircle size={12} />
                                    Compliant ({complianceStats.compliant})
                                </button>
                                <button
                                    onClick={() => setSelectedStatus("NON_COMPLIANT")}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1",
                                        selectedStatus === "NON_COMPLIANT"
                                            ? "bg-red-500/20 text-red-400"
                                            : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
                                    )}
                                >
                                    <XCircle size={12} />
                                    Non-Compliant ({complianceStats.nonCompliant})
                                </button>
                                <button
                                    onClick={() => setSelectedStatus("PARTIALLY_COMPLIANT")}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1",
                                        selectedStatus === "PARTIALLY_COMPLIANT"
                                            ? "bg-yellow-500/20 text-yellow-400"
                                            : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
                                    )}
                                >
                                    <AlertTriangle size={12} />
                                    Partial ({complianceStats.partial})
                                </button>
                            </div>

                            {/* Controls List */}
                            <div className="divide-y divide-[var(--border-color)]">
                                {filteredControls.map((control) => {
                                    const status = statusConfig[control.status as keyof typeof statusConfig];
                                    const StatusIcon = status.icon;

                                    return (
                                        <div
                                            key={control.id}
                                            className="p-4 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div
                                                    className="p-2 rounded-lg"
                                                    style={{ background: `${status.color}15` }}
                                                >
                                                    <StatusIcon size={18} style={{ color: status.color }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-mono text-sm text-blue-400">
                                                            {control.id}
                                                        </span>
                                                        <span
                                                            className="px-2 py-0.5 rounded text-[10px] font-medium"
                                                            style={{
                                                                background: `${status.color}15`,
                                                                color: status.color,
                                                            }}
                                                        >
                                                            {status.label}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-medium text-white mb-1">{control.title}</h3>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                                                        <span>{control.category}</span>
                                                        <span>Implementation: {control.implementationStatus.replace(/_/g, " ")}</span>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={10} />
                                                            Last assessed: {control.lastAssessed}
                                                        </span>
                                                    </div>
                                                </div>
                                                {control.linkedVulns > 0 && (
                                                    <div className="text-right hidden md:block">
                                                        <div className="flex items-center gap-1 text-orange-400">
                                                            <Shield size={14} />
                                                            <span className="text-sm font-medium">{control.linkedVulns}</span>
                                                        </div>
                                                        <span className="text-xs text-[var(--text-muted)]">
                                                            Related Vulns
                                                        </span>
                                                    </div>
                                                )}
                                                <ChevronRight
                                                    size={18}
                                                    className="text-[var(--text-muted)] flex-shrink-0"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-4">
                        {/* Compliance Score Breakdown */}
                        <Card title="Compliance Scores" subtitle="All frameworks">
                            <ComplianceBarChart data={mockComplianceOverview} />
                        </Card>

                        {/* Non-Compliant Summary */}
                        <Card title="Non-Compliance Summary" subtitle="Items requiring attention">
                            <div className="space-y-3">
                                {[
                                    {
                                        control: "A.8.8",
                                        issue: "127 unpatched critical vulnerabilities",
                                        priority: "critical",
                                    },
                                    {
                                        control: "A.8.20",
                                        issue: "Network segmentation incomplete",
                                        priority: "high",
                                    },
                                    {
                                        control: "A.8.9",
                                        issue: "45 configuration drift detected",
                                        priority: "medium",
                                    },
                                ].map((item) => (
                                    <div
                                        key={item.control}
                                        className="p-3 rounded-lg bg-[var(--bg-tertiary)] border-l-2"
                                        style={{
                                            borderColor:
                                                item.priority === "critical"
                                                    ? "#ef4444"
                                                    : item.priority === "high"
                                                        ? "#f97316"
                                                        : "#eab308",
                                        }}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-mono text-xs text-blue-400">{item.control}</span>
                                            <span
                                                className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase"
                                                style={{
                                                    background:
                                                        item.priority === "critical"
                                                            ? "rgba(239, 68, 68, 0.1)"
                                                            : item.priority === "high"
                                                                ? "rgba(249, 115, 22, 0.1)"
                                                                : "rgba(234, 179, 8, 0.1)",
                                                    color:
                                                        item.priority === "critical"
                                                            ? "#ef4444"
                                                            : item.priority === "high"
                                                                ? "#f97316"
                                                                : "#eab308",
                                                }}
                                            >
                                                {item.priority}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)]">{item.issue}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Quick Stats */}
                        <Card title="Assessment Schedule">
                            <div className="space-y-3">
                                {[
                                    { framework: "ISO 27001:2022", nextDate: "Feb 15, 2024", daysLeft: 22 },
                                    { framework: "PCI DSS 4.0", nextDate: "Mar 1, 2024", daysLeft: 36 },
                                    { framework: "SOC 2 Type II", nextDate: "Apr 10, 2024", daysLeft: 76 },
                                ].map((item) => (
                                    <div
                                        key={item.framework}
                                        className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)]"
                                    >
                                        <div>
                                            <p className="text-sm text-white">{item.framework}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{item.nextDate}</p>
                                        </div>
                                        <div className="text-right">
                                            <span
                                                className={cn(
                                                    "text-sm font-medium",
                                                    item.daysLeft <= 30 ? "text-orange-400" : "text-green-400"
                                                )}
                                            >
                                                {item.daysLeft} days
                                            </span>
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
