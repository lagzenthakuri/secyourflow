"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, ProgressBar } from "@/components/ui/Cards";
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
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";

const statusConfig = {
    COMPLIANT: { label: "Compliant", color: "#22c55e", icon: CheckCircle },
    NON_COMPLIANT: { label: "Non-Compliant", color: "#ef4444", icon: XCircle },
    PARTIALLY_COMPLIANT: { label: "Partial", color: "#eab308", icon: AlertTriangle },
    NOT_ASSESSED: { label: "Not Assessed", color: "#6b7280", icon: HelpCircle },
    NOT_APPLICABLE: { label: "N/A", color: "#6b7280", icon: HelpCircle },
};

export default function CompliancePage() {
    const [frameworks, setFrameworks] = useState<any[]>([]);
    const [selectedFramework, setSelectedFramework] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newFramework, setNewFramework] = useState({ name: "", description: "" });

    const fetchCompliance = async () => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/compliance");
            const result = await response.json();
            if (result && Array.isArray(result.data)) {
                setFrameworks(result.data);
                if (result.data.length > 0 && !selectedFramework) {
                    setSelectedFramework(result.data[0]);
                }
            } else {
                setFrameworks([]);
            }
        } catch (error) {
            console.error("Failed to fetch compliance:", error);
            setFrameworks([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddFramework = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const response = await fetch("/api/compliance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newFramework),
            });
            if (response.ok) {
                setIsAddModalOpen(false);
                setNewFramework({ name: "", description: "" });
                fetchCompliance();
            }
        } catch (error) {
            console.error("Failed to add framework:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        fetchCompliance();
    }, []);

    const filteredControls = selectedFramework?.controls?.filter((control: any) => {
        const matchesSearch =
            control.controlId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            control.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = !selectedStatus || control.status === selectedStatus;
        return matchesSearch && matchesStatus;
    }) || [];

    const complianceStats = {
        total: selectedFramework?.controls?.length || 0,
        compliant: selectedFramework?.controls?.filter((c: any) => c.status === "COMPLIANT").length || 0,
        nonCompliant: selectedFramework?.controls?.filter((c: any) => c.status === "NON_COMPLIANT").length || 0,
        partial: selectedFramework?.controls?.filter((c: any) => c.status === "PARTIALLY_COMPLIANT").length || 0,
    };

    if (isLoading && frameworks.length === 0) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                    <p className="text-[var(--text-secondary)]">Gathering compliance data...</p>
                </div>
            </DashboardLayout>
        );
    }

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
                        <button className="btn btn-secondary" onClick={() => {
                            if (!selectedFramework) return;
                            const csv = [
                                ["Control ID", "Title", "Status", "Category"].join(","),
                                ...selectedFramework.controls.map((c: any) => [c.controlId, c.title, c.status, c.category].join(","))
                            ].join("\n");
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${selectedFramework.frameworkName}_report.csv`;
                            a.click();
                        }}>
                            <Download size={16} />
                            Export Report
                        </button>
                        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
                            <Plus size={16} />
                            Add Framework
                        </button>
                    </div>
                </div>

                {/* Framework Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {frameworks.map((framework) => (
                        <div
                            key={framework.frameworkId}
                            onClick={() => setSelectedFramework(framework)}
                            className={cn(
                                "card p-4 cursor-pointer transition-all",
                                selectedFramework?.frameworkId === framework.frameworkId
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
                        {selectedFramework ? (
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
                                    {filteredControls.map((control: any) => {
                                        const status = statusConfig[control.status as keyof typeof statusConfig] || statusConfig.NOT_ASSESSED;
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
                                                                {control.controlId}
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
                                                            <span className="flex items-center gap-1">
                                                                <Calendar size={10} />
                                                                Last assessed: {new Date(control.updatedAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
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
                        ) : (
                            <div className="card p-20 text-center">
                                <FileCheck className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4 opacity-20" />
                                <p className="text-[var(--text-secondary)]">Select a framework to view controls</p>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-4">
                        {/* Compliance Score Breakdown */}
                        <Card title="Compliance Scores" subtitle="All frameworks">
                            <ComplianceBarChart data={frameworks} />
                        </Card>

                        {/* Assessment Schedule */}
                        <Card title="Assessment Schedule">
                            <div className="space-y-3">
                                {frameworks.map((item: any) => (
                                    <div
                                        key={item.frameworkId}
                                        className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)]"
                                    >
                                        <div>
                                            <p className="text-sm text-white">{item.frameworkName}</p>
                                            <p className="text-xs text-[var(--text-muted)]">Scheduled for review</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-medium text-green-400">
                                                Active
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Add New Compliance Framework"
                footer={
                    <div className="flex justify-end gap-3">
                        <button
                            className="btn btn-secondary"
                            onClick={() => setIsAddModalOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleAddFramework}
                            disabled={isSubmitting || !newFramework.name}
                        >
                            {isSubmitting ? "Adding..." : "Add Framework"}
                        </button>
                    </div>
                }
            >
                <form className="space-y-4" onSubmit={handleAddFramework}>
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Framework Name
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. NIST CSF 2.0"
                            className="input"
                            value={newFramework.name}
                            onChange={(e) => setNewFramework({ ...newFramework, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Description
                        </label>
                        <textarea
                            placeholder="Brief description of the framework..."
                            className="input min-h-[100px]"
                            value={newFramework.description}
                            onChange={(e) => setNewFramework({ ...newFramework, description: e.target.value })}
                        />
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    );
}
