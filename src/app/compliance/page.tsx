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
    Activity,
    Target,
    Eye,
    Wrench,
    User,
    Layers,
    BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

const nistCsfConfig = {
    GOVERN: { label: "Govern", color: "#8b5cf6", icon: Layers },
    IDENTIFY: { label: "Identify", color: "#3b82f6", icon: Search },
    PROTECT: { label: "Protect", color: "#22c55e", icon: Shield },
    DETECT: { label: "Detect", color: "#f97316", icon: Eye },
    RESPOND: { label: "Respond", color: "#ef4444", icon: Target },
    RECOVER: { label: "Recover", color: "#06b6d4", icon: Wrench },
};

const maturityLabels = [
    { level: 0, label: "Non-existent", color: "#6b7280" },
    { level: 1, label: "Ad Hoc", color: "#ef4444" },
    { level: 2, label: "Repeatable", color: "#f97316" },
    { level: 3, label: "Defined", color: "#eab308" },
    { level: 4, label: "Managed", color: "#22c55e" },
    { level: 5, label: "Optimized", color: "#3b82f6" },
];

const controlTypeConfig = {
    PREVENTIVE: { label: "Preventive", color: "#22c55e" },
    DETECTIVE: { label: "Detective", color: "#f97316" },
    CORRECTIVE: { label: "Corrective", color: "#3b82f6" },
};

export default function CompliancePage() {
    const [frameworks, setFrameworks] = useState<any[]>([]);
    const [selectedFramework, setSelectedFramework] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [selectedNistFunction, setSelectedNistFunction] = useState<string | null>(null);

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

    const exportToPDF = () => {
        if (!selectedFramework) return;

        const doc = new jsPDF();
        const frameworkName = selectedFramework.frameworkName;
        const date = new Date().toLocaleDateString();

        // Header Style
        doc.setFontSize(22);
        doc.setTextColor(33, 150, 243); // Blue
        doc.text("SECYOURFLOW", 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text("Enterprise Security GRC Platform", 14, 28);

        // Report Title
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text(`${frameworkName} Compliance Report`, 14, 45);

        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated on: ${date}`, 14, 52);

        // Summary Section
        doc.setFontSize(14);
        doc.setTextColor(60, 60, 60);
        doc.text("Executive Summary", 14, 65);

        const stats = [
            ["Total Controls", selectedFramework.totalControls.toString()],
            ["Compliant Controls", selectedFramework.compliant.toString()],
            ["Non-Compliant Controls", selectedFramework.nonCompliant.toString()],
            ["Partially Compliant Controls", selectedFramework.partiallyCompliant.toString()],
            ["Aggregated Compliance Score", `${selectedFramework.compliancePercentage.toFixed(1)}%`],
            ["Capability Maturity Level (Avg)", `Level ${(selectedFramework.avgMaturityLevel || 0).toFixed(1)}`]
        ];

        autoTable(doc, {
            startY: 70,
            head: [["Compliance Governance Metric", "Current Assessment"]],
            body: stats,
            theme: 'striped',
            headStyles: { fillColor: [33, 150, 243], textColor: 255 },
            styles: { cellPadding: 5 }
        });

        // NIST CSF Breakdown
        if (selectedFramework.nistCsfBreakdown) {
            const finalY = (doc as any).lastAutoTable.finalY + 15;
            doc.setFontSize(14);
            doc.text("NIST CSF 2.0 Mapping Breakdown", 14, finalY);

            const nistData = Object.entries(nistCsfConfig).map(([key, config]) => [
                config.label,
                selectedFramework.nistCsfBreakdown[key] || 0
            ]);

            autoTable(doc, {
                startY: finalY + 5,
                head: [["NIST Function", "Control Count"]],
                body: nistData,
                theme: 'grid',
                headStyles: { fillColor: [88, 88, 88] }
            });
        }

        // Detailed Table
        doc.addPage();
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text("Detailed Control Assessment List", 14, 22);

        const tableData = selectedFramework.controls.map((c: any) => [
            c.controlId,
            c.title,
            c.status.replace(/_/g, " "),
            `L${c.maturityLevel || 0}`,
            c.ownerRole || "N/A"
        ]);

        autoTable(doc, {
            startY: 30,
            head: [["ID", "Control Description", "Compliance Status", "Maturity", "Accountable Role"]],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [33, 150, 243] },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                1: { cellWidth: 80 }
            }
        });

        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Confidential - SECYOURFLOW GRC Platform - Page ${i} of ${pageCount}`, 14, 285);
        }

        doc.save(`${frameworkName}_Board_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    useEffect(() => {
        fetchCompliance();
    }, []);

    const filteredControls = selectedFramework?.controls?.filter((control: any) => {
        const matchesSearch =
            control.controlId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            control.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = !selectedStatus || control.status === selectedStatus;
        const matchesNist = !selectedNistFunction || control.nistCsfFunction === selectedNistFunction;
        return matchesSearch && matchesStatus && matchesNist;
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
                            const headers = ["Control ID", "Title", "Status", "Maturity", "NIST Function", "Type", "Frequency", "Owner", "Category"];
                            const rows = selectedFramework.controls.map((c: any) => [
                                c.controlId,
                                `"${c.title}"`,
                                c.status,
                                c.maturityLevel,
                                c.nistCsfFunction || "N/A",
                                c.controlType,
                                c.frequency,
                                c.ownerRole || "N/A",
                                c.category || "N/A"
                            ].join(","));
                            const csv = [headers.join(","), ...rows].join("\n");
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${selectedFramework.frameworkName}_Compliance_Report.csv`;
                            a.click();
                        }}>
                            <Download size={16} />
                            Export CSV
                        </button>
                        <button className="btn btn-secondary" onClick={exportToPDF}>
                            <FileCheck size={16} />
                            Board PDF
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
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-[var(--text-muted)]">
                                    {framework.totalControls} controls
                                </p>
                                {framework.avgMaturityLevel !== undefined && (
                                    <div className="flex items-center gap-1">
                                        <BarChart3 size={12} className="text-[var(--text-muted)]" />
                                        <span
                                            className="text-xs font-bold"
                                            style={{ color: maturityLabels[Math.round(framework.avgMaturityLevel)]?.color || "#6b7280" }}
                                        >
                                            L{framework.avgMaturityLevel.toFixed(1)}
                                        </span>
                                    </div>
                                )}
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

                                {/* NIST CSF Function Filters */}
                                <div className="px-4 py-2 border-b border-[var(--border-color)] flex gap-1.5 overflow-x-auto">
                                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider flex items-center mr-2">NIST CSF:</span>
                                    <button
                                        onClick={() => setSelectedNistFunction(null)}
                                        className={cn(
                                            "px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-all",
                                            !selectedNistFunction
                                                ? "bg-white/10 text-white"
                                                : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
                                        )}
                                    >
                                        All
                                    </button>
                                    {Object.entries(nistCsfConfig).map(([key, config]) => {
                                        const NistIcon = config.icon;
                                        const count = selectedFramework?.nistCsfBreakdown?.[key] || 0;
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => setSelectedNistFunction(key)}
                                                className={cn(
                                                    "px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-all flex items-center gap-1",
                                                    selectedNistFunction === key
                                                        ? "text-white"
                                                        : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
                                                )}
                                                style={selectedNistFunction === key ? { background: `${config.color}30`, color: config.color } : {}}
                                            >
                                                <NistIcon size={10} />
                                                {config.label} ({count})
                                            </button>
                                        );
                                    })}
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
                                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                                                                {/* Maturity Level Badge */}
                                                                {control.maturityLevel !== undefined && (
                                                                    <span
                                                                        className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                                                        style={{
                                                                            background: `${maturityLabels[control.maturityLevel]?.color}15`,
                                                                            color: maturityLabels[control.maturityLevel]?.color,
                                                                        }}
                                                                    >
                                                                        L{control.maturityLevel}
                                                                    </span>
                                                                )}
                                                                {/* NIST CSF Function Badge */}
                                                                {control.nistCsfFunction && nistCsfConfig[control.nistCsfFunction as keyof typeof nistCsfConfig] && (
                                                                    <span
                                                                        className="px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5"
                                                                        style={{
                                                                            background: `${nistCsfConfig[control.nistCsfFunction as keyof typeof nistCsfConfig].color}15`,
                                                                            color: nistCsfConfig[control.nistCsfFunction as keyof typeof nistCsfConfig].color,
                                                                        }}
                                                                    >
                                                                        {nistCsfConfig[control.nistCsfFunction as keyof typeof nistCsfConfig].label}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <h3 className="font-medium text-white mb-1 group-hover:text-blue-400 transition-all duration-300 ease-in-out">
                                                                {control.title}
                                                            </h3>
                                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--text-muted)] uppercase tracking-tight">
                                                                {control.category && (
                                                                    <span className="bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">
                                                                        {control.category}
                                                                    </span>
                                                                )}
                                                                {/* Control Type */}
                                                                {control.controlType && controlTypeConfig[control.controlType as keyof typeof controlTypeConfig] && (
                                                                    <span
                                                                        className="px-1.5 py-0.5 rounded"
                                                                        style={{
                                                                            background: `${controlTypeConfig[control.controlType as keyof typeof controlTypeConfig].color}10`,
                                                                            color: controlTypeConfig[control.controlType as keyof typeof controlTypeConfig].color,
                                                                        }}
                                                                    >
                                                                        {controlTypeConfig[control.controlType as keyof typeof controlTypeConfig].label}
                                                                    </span>
                                                                )}
                                                                {/* Owner Role */}
                                                                {control.ownerRole && (
                                                                    <span className="flex items-center gap-1 text-[var(--text-secondary)]">
                                                                        <User size={10} />
                                                                        {control.ownerRole}
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
                                <div className="grid grid-cols-2 gap-3 mb-4">
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
                                        <p
                                            className="text-xl font-bold"
                                            style={{ color: maturityLabels[Math.round(selectedFramework.avgMaturityLevel || 0)]?.color || "#6b7280" }}
                                        >
                                            L{(selectedFramework.avgMaturityLevel || 0).toFixed(1)}
                                        </p>
                                        <p className="text-[10px] text-[var(--text-muted)] uppercase">Avg Maturity</p>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* NIST CSF Breakdown */}
                        {selectedFramework?.nistCsfBreakdown && (
                            <Card title="NIST CSF 2.0 Coverage" subtitle="Controls by security function">
                                <div className="space-y-2">
                                    {Object.entries(nistCsfConfig).map(([key, config]) => {
                                        const count = selectedFramework.nistCsfBreakdown[key] || 0;
                                        const total = selectedFramework.totalControls || 1;
                                        const percentage = (count / total) * 100;
                                        const NistIcon = config.icon;
                                        return (
                                            <div key={key} className="flex items-center gap-3">
                                                <div
                                                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                                                    style={{ background: `${config.color}15` }}
                                                >
                                                    <NistIcon size={14} style={{ color: config.color }} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-medium text-white">{config.label}</span>
                                                        <span className="text-xs text-[var(--text-muted)]">{count}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{ width: `${percentage}%`, background: config.color }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
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

                        {/* Maturity Level Legend */}
                        <Card title="Maturity Levels" subtitle="Control maturity scale (0-5)">
                            <div className="space-y-1.5">
                                {maturityLabels.map((level) => (
                                    <div key={level.level} className="flex items-center gap-2">
                                        <span
                                            className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                                            style={{ background: `${level.color}20`, color: level.color }}
                                        >
                                            {level.level}
                                        </span>
                                        <span className="text-xs text-[var(--text-secondary)]">{level.label}</span>
                                    </div>
                                ))}
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
