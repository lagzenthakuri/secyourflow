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
    Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";

import { AddControlModal } from "@/components/compliance/AddControlModal";
import { AssessControlModal } from "@/components/compliance/AssessControlModal";
import { ControlActions } from "@/components/compliance/ControlActions";
import { FrameworkActions } from "@/components/compliance/FrameworkActions";
import { SecurityLoader } from "@/components/ui/SecurityLoader";

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

    // Framework Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditFrameworkModalOpen, setIsEditFrameworkModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newFramework, setNewFramework] = useState({ name: "", description: "" });
    const [deletingFrameworkId, setDeletingFrameworkId] = useState<string | null>(null);

    // Control Modals
    const [isAddControlModalOpen, setIsAddControlModalOpen] = useState(false);
    const [isAssessModalOpen, setIsAssessModalOpen] = useState(false);
    const [selectedControl, setSelectedControl] = useState<any>(null);
    const [deletingControlId, setDeletingControlId] = useState<string | null>(null);

    const fetchCompliance = async () => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/compliance");
            const result = await response.json();
            if (result && Array.isArray(result.data)) {
                setFrameworks(result.data);

                // If we already had a selected framework, refresh its data from the new list
                if (selectedFramework) {
                    const updated = result.data.find((f: any) => f.frameworkId === selectedFramework.frameworkId);
                    if (updated) setSelectedFramework(updated);
                    else if (result.data.length > 0) setSelectedFramework(result.data[0]);
                } else if (result.data.length > 0) {
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

    const handleUpdateFramework = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFramework) return;
        try {
            setIsSubmitting(true);
            const response = await fetch(`/api/compliance/${selectedFramework.frameworkId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: selectedFramework.frameworkName,
                    description: selectedFramework.description,
                }),
            });
            if (response.ok) {
                setIsEditFrameworkModalOpen(false);
                fetchCompliance();
            }
        } catch (error) {
            console.error("Failed to update framework:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteFramework = async (id: string) => {
        try {
            setDeletingFrameworkId(id);
            const response = await fetch(`/api/compliance/${id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                if (selectedFramework?.frameworkId === id) setSelectedFramework(null);
                fetchCompliance();
            }
        } catch (error) {
            console.error("Failed to delete framework:", error);
        } finally {
            setDeletingFrameworkId(null);
        }
    };

    const handleDeleteControl = async (id: string) => {
        try {
            setDeletingControlId(id);
            const response = await fetch(`/api/compliance/controls/${id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                fetchCompliance();
            }
        } catch (error) {
            console.error("Failed to delete control:", error);
        } finally {
            setDeletingControlId(null);
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
                    <SecurityLoader
                        size="xl"
                        icon="shield"
                        variant="cyber"
                        text="Gathering compliance data..."
                    />
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
                        <button
                            className="btn btn-secondary"
                            onClick={async () => {
                                try {
                                    const res = await fetch("/api/compliance/monitor", { method: "POST" });
                                    if (res.ok) {
                                        alert("Compliance monitoring started. Evidence is being pulled from logs.");
                                        fetchCompliance();
                                    }
                                } catch (e) {
                                    alert("Failed to start monitoring.");
                                }
                            }}
                        >
                            <Activity size={16} />
                            Monitor & Pull Evidence
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
                                "card p-4 cursor-pointer transition-all group relative",
                                selectedFramework?.frameworkId === framework.frameworkId
                                    ? "border-blue-500/50 bg-blue-500/5"
                                    : "hover:border-[var(--border-hover)]"
                            )}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 rounded-lg bg-blue-500/10">
                                    <FileCheck size={18} className="text-blue-400" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className="text-lg font-bold"
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
                                    <FrameworkActions
                                        framework={framework}
                                        onEdit={() => {
                                            setSelectedFramework(framework);
                                            setIsEditFrameworkModalOpen(true);
                                        }}
                                        onDelete={() => handleDeleteFramework(framework.frameworkId)}
                                        isDeleting={deletingFrameworkId === framework.frameworkId}
                                    />
                                </div>
                            </div>
                            <h3 className="font-medium text-white mb-1 truncate pr-8">{framework.frameworkName}</h3>
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
                    {frameworks.length === 0 && (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="card p-4 border-dashed border-2 flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all duration-300 ease-in-out"
                        >
                            <Plus className="text-[var(--text-muted)]" />
                            <span className="text-sm font-medium text-[var(--text-muted)]">Add First Framework</span>
                        </button>
                    )}
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
                                action={
                                    <button
                                        className="btn btn-primary text-xs py-1.5 px-3"
                                        onClick={() => setIsAddControlModalOpen(true)}
                                    >
                                        <Plus size={14} />
                                        Add Control
                                    </button>
                                }
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
                                        </button>
                                    </div>
                                </div>

                                {/* Status Tabs */}
                                <div className="px-4 py-3 border-b border-[var(--border-color)] flex gap-2 overflow-x-auto">
                                    <button
                                        onClick={() => setSelectedStatus(null)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-300 ease-in-out",
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
                                            "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-300 ease-in-out flex items-center gap-1",
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
                                            "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-300 ease-in-out flex items-center gap-1",
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
                                            "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-300 ease-in-out flex items-center gap-1",
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
                                    {filteredControls.length === 0 ? (
                                        <div className="p-20 text-center">
                                            <FileCheck className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4 opacity-20" />
                                            <p className="text-[var(--text-secondary)]">No controls found matching your criteria.</p>
                                        </div>
                                    ) : (
                                        filteredControls.map((control: any) => {
                                            const status = statusConfig[control.status as keyof typeof statusConfig] || statusConfig.NOT_ASSESSED;
                                            const StatusIcon = status.icon;

                                            return (
                                                <div
                                                    key={control.id}
                                                    className="p-4 hover:bg-[var(--bg-tertiary)] transition-all duration-300 ease-in-out cursor-pointer group"
                                                    onClick={() => {
                                                        setSelectedControl(control);
                                                        setIsAssessModalOpen(true);
                                                    }}
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
                                                                <span className="font-mono text-xs text-blue-400 font-bold bg-blue-400/5 px-1.5 py-0.5 rounded">
                                                                    {control.controlId}
                                                                </span>
                                                                <span
                                                                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                                                                    style={{
                                                                        background: `${status.color}15`,
                                                                        color: status.color,
                                                                    }}
                                                                >
                                                                    {status.label}
                                                                </span>
                                                            </div>
                                                            <h3 className="font-medium text-white mb-1 group-hover:text-blue-400 transition-all duration-300 ease-in-out">
                                                                {control.title}
                                                            </h3>
                                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[var(--text-muted)] uppercase tracking-tight">
                                                                {control.category && (
                                                                    <span className="bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">
                                                                        {control.category}
                                                                    </span>
                                                                )}
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar size={10} />
                                                                    Updated: {new Date(control.updatedAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <ControlActions
                                                            control={control}
                                                            onAssess={() => {
                                                                setSelectedControl(control);
                                                                setIsAssessModalOpen(true);
                                                            }}
                                                            onDelete={() => handleDeleteControl(control.id)}
                                                            isDeleting={deletingControlId === control.id}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </Card>
                        ) : (
                            <div className="card p-20 text-center">
                                <FileCheck className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4 opacity-10" />
                                <p className="text-lg font-medium text-white mb-2">No Framework Selected</p>
                                <p className="text-[var(--text-secondary)] mb-6">Create or select a compliance framework to start tracking controls.</p>
                                <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
                                    <Plus size={16} />
                                    Add New Framework
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-4">
                        {/* Compliance Score Breakdown */}
                        <Card title="Framework Benchmark" subtitle="Compliance scores comparison">
                            <ComplianceBarChart data={frameworks} />
                        </Card>

                        {/* Recent Activity or Assessment Stats */}
                        {selectedFramework && (
                            <Card title="Quick Stats">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                                        <p className="text-xl font-bold text-white">{complianceStats.total}</p>
                                        <p className="text-[10px] text-[var(--text-muted)] uppercase">Total Controls</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                                        <p className="text-xl font-bold text-green-400">{complianceStats.compliant}</p>
                                        <p className="text-[10px] text-[var(--text-muted)] uppercase">Compliant</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                                        <p className="text-xl font-bold text-red-400">{complianceStats.nonCompliant}</p>
                                        <p className="text-[10px] text-[var(--text-muted)] uppercase">Non-Compliant</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                                        <p className="text-xl font-bold text-yellow-400">{complianceStats.partial}</p>
                                        <p className="text-[10px] text-[var(--text-muted)] uppercase">Partial</p>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Assessment Schedule */}
                        <Card title="Next Assessments">
                            <div className="space-y-3">
                                {frameworks.length > 0 ? frameworks.map((item: any) => (
                                    <div
                                        key={item.frameworkId}
                                        className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{item.frameworkName}</p>
                                            <p className="text-[10px] text-[var(--text-muted)] uppercase">Health Check Pending</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 uppercase">
                                                Active
                                            </span>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-xs text-[var(--text-muted)] text-center py-4 italic">No frameworks registered</p>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Framework Modals */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Add Compliance Framework"
            >
                <form className="space-y-4" onSubmit={handleAddFramework}>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Framework Name *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. NIST CSF 2.0 or ISO 27001"
                            className="input w-full"
                            value={newFramework.name}
                            onChange={(e) => setNewFramework({ ...newFramework, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Description
                        </label>
                        <textarea
                            placeholder="Brief description of the framework..."
                            className="input w-full min-h-[100px] py-2"
                            value={newFramework.description}
                            onChange={(e) => setNewFramework({ ...newFramework, description: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting || !newFramework.name}>
                            {isSubmitting ? (
                                <SecurityLoader size="xs" icon="shield" variant="cyber" className="mr-2" />
                            ) : (
                                <Plus size={16} className="mr-2" />
                            )}
                            {isSubmitting ? "Adding..." : "Add Framework"}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={isEditFrameworkModalOpen}
                onClose={() => setIsEditFrameworkModalOpen(false)}
                title="Edit Framework Info"
            >
                <form className="space-y-4" onSubmit={handleUpdateFramework}>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Framework Name
                        </label>
                        <input
                            type="text"
                            required
                            className="input w-full"
                            value={selectedFramework?.frameworkName || ""}
                            onChange={(e) => setSelectedFramework({ ...selectedFramework, frameworkName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                            Description
                        </label>
                        <textarea
                            className="input w-full min-h-[100px] py-2"
                            value={selectedFramework?.description || ""}
                            onChange={(e) => setSelectedFramework({ ...selectedFramework, description: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" className="btn btn-secondary" onClick={() => setIsEditFrameworkModalOpen(false)}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? <SecurityLoader size="xs" icon="shield" variant="cyber" className="mr-2" /> : null}
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Control Modals */}
            {selectedFramework && (
                <AddControlModal
                    isOpen={isAddControlModalOpen}
                    onClose={() => setIsAddControlModalOpen(false)}
                    onSuccess={fetchCompliance}
                    frameworkId={selectedFramework.frameworkId}
                />
            )}

            {selectedControl && (
                <AssessControlModal
                    isOpen={isAssessModalOpen}
                    onClose={() => {
                        setIsAssessModalOpen(false);
                        setSelectedControl(null);
                    }}
                    onSuccess={fetchCompliance}
                    control={selectedControl}
                />
            )}
        </DashboardLayout>
    );
}
