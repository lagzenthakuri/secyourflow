import React, { useEffect, useState } from "react";
import {
    Download,
    Search,
    X,
    Loader2,
    Edit2,
    Save,
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ShieldLoader } from "@/components/ui/ShieldLoader";

interface RiskEntry {
    id: string;
    displayId: string;
    threat: string;
    confidentiality: number;
    integrity: number;
    availability: number;
    impactScore: number;
    likelihoodScore: number;
    riskCategory: string;
    rationale: string;
    currentControls: string;
    riskCategory2: string;
    treatmentOption: string;
    selectedControls: string;
    actionPlan: string;
    responsibleParty: string;
    controlsViolated: string;
    remarks: string;
    isResolved: boolean;
    vulnerabilityTitle?: string;
    assetName?: string;
}

export function RiskRegisterTable() {
    const [risks, setRisks] = useState<RiskEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<RiskEntry>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateRisks = async () => {
        setError(null);
        try {
            setIsGenerating(true);
            const res = await fetch("/api/risk-register/generate", {
                method: "POST"
            });

            if (res.ok) {
                setTimeout(fetchRisks, 2000);
            } else {
                const data = await res.json();
                setError(data.error || "Failed to generate risks");
            }
        } catch (err) {
            console.error("Failed to generate risks", err);
            setError("Network error occurred");
        } finally {
            setTimeout(() => setIsGenerating(false), 2000);
        }
    };

    useEffect(() => {
        fetchRisks();
    }, []);

    const fetchRisks = async () => {
        try {
            setIsLoading(true);
            const res = await fetch("/api/risk-register");
            if (res.ok) {
                const data = await res.json();
                setRisks(data.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch risks", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (risk: RiskEntry) => {
        setEditingId(risk.id);
        setEditForm(risk);
        // Auto-expand the row being edited so fields are visible
        setExpandedRows(prev => new Set(prev).add(risk.id));
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleSave = async () => {
        if (!editingId) return;
        try {
            setIsSaving(true);
            const res = await fetch("/api/risk-register", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editForm),
            });

            if (res.ok) {
                await fetchRisks();
                setEditingId(null);
                setEditForm({});
            }
        } catch (error) {
            console.error("Failed to update risk", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleResolvedToggle = async (id: string, currentValue: boolean) => {
        // Optimistic update
        setRisks(risks.map(r => r.id === id ? { ...r, isResolved: !currentValue } : r));

        try {
            const res = await fetch("/api/risk-register", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, isResolved: !currentValue }),
            });
            if (!res.ok) fetchRisks(); // Revert on failure
        } catch {
            fetchRisks();
        }
    };

    const toggleRow = (id: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleExport = () => {
        if (risks.length === 0) return;

        const headers = [
            "Risk ID", "Threat", "Confidentiality", "Integrity", "Availability",
            "Impact", "Likelihood", "Risk Category", "Rationale",
            "Current Controls", "Category 2", "Treatment",
            "Selected Controls", "Action Plan", "Responsible Party",
            "Controls Violated", "Remarks", "Resolved"
        ];

        const csvContent = [
            headers.join(","),
            ...risks.map(r => [
                r.displayId,
                `"${r.threat.replace(/"/g, '""')}"`,
                r.confidentiality, r.integrity, r.availability,
                r.impactScore.toFixed(1), r.likelihoodScore,
                r.riskCategory,
                `"${r.rationale.replace(/"/g, '""')}"`,
                `"${r.currentControls.replace(/"/g, '""')}"`,
                r.riskCategory2, r.treatmentOption,
                `"${r.selectedControls.replace(/"/g, '""')}"`,
                `"${r.actionPlan.replace(/"/g, '""')}"`,
                r.responsibleParty,
                `"${r.controlsViolated.replace(/"/g, '""')}"`,
                `"${r.remarks.replace(/"/g, '""')}"`,
                r.isResolved ? "Yes" : "No"
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `risk_register_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const filteredRisks = risks.filter(r =>
        r.threat.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.displayId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.vulnerabilityTitle?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getImpactColor = (score: number) => {
        if (score >= 4) return "text-red-500 font-bold";
        if (score >= 3) return "text-orange-500 font-bold";
        if (score >= 2) return "text-yellow-700 dark:text-yellow-500";
        return "text-green-500";
    };

    const getCategoryColor = (category: string) => {
        const cat = category.toLowerCase();
        if (cat.includes('critical')) return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
        if (cat.includes('high')) return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
        if (cat.includes('medium')) return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/20";
        return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <ShieldLoader size="lg" variant="cyber" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search risks using threat, CVE, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleGenerateRisks}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-md text-sm font-medium transition-colors"
                    >
                        <Loader2 className={cn("w-4 h-4", isGenerating ? "animate-spin" : "")} />
                        {isGenerating ? "Assessing..." : "Risk Assessment"}
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-[11px] uppercase bg-[var(--bg-tertiary)] text-[var(--text-muted)] font-semibold whitespace-nowrap">
                        <tr>
                            <th className="p-4 w-[20px]"></th>
                            <th className="p-4 text-left">ID & Threat</th>
                            <th className="p-4 text-center">Impact Details</th>
                            <th className="p-4 text-center">Score</th>
                            <th className="p-4 text-left">Treatment</th>
                            <th className="p-4 text-center">Resolved</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                        {filteredRisks.map(risk => {
                            const isExpanded = expandedRows.has(risk.id);
                            const isEditing = editingId === risk.id;

                            return (
                                <React.Fragment key={risk.id}>
                                    {/* Main Row */}
                                    <tr
                                        className={cn(
                                            "hover:bg-[var(--bg-tertiary)]/30 transition-colors cursor-pointer",
                                            isExpanded && "bg-[var(--bg-tertiary)]/50"
                                        )}
                                        onClick={() => toggleRow(risk.id)}
                                    >
                                        <td className="p-4 text-[var(--text-muted)]">
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 rounded">{risk.displayId}</span>
                                                    <span className={cn(
                                                        "text-[10px] px-2 py-0.5 rounded-full border",
                                                        getCategoryColor(risk.riskCategory)
                                                    )}>
                                                        {risk.riskCategory}
                                                    </span>
                                                </div>
                                                <span className="font-medium text-[var(--text-primary)] line-clamp-1 text-base">{risk.threat}</span>
                                                <span className="text-xs text-[var(--text-secondary)]">{risk.vulnerabilityTitle}</span>
                                            </div>
                                        </td>

                                        {/* Impact Details (Mini Grid) */}
                                        <td className="p-4">
                                            <div className="flex justify-center gap-3 text-xs font-mono text-[var(--text-secondary)]">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] uppercase text-[var(--text-muted)]">Conf</span>
                                                    <span className={cn(risk.confidentiality >= 4 && "text-red-600 dark:text-red-400 font-bold")}>{risk.confidentiality}</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] uppercase text-[var(--text-muted)]">Int</span>
                                                    <span className={cn(risk.integrity >= 4 && "text-red-600 dark:text-red-400 font-bold")}>{risk.integrity}</span>
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] uppercase text-[var(--text-muted)]">Avail</span>
                                                    <span className={cn(risk.availability >= 4 && "text-red-600 dark:text-red-400 font-bold")}>{risk.availability}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Risk Score */}
                                        <td className="p-4 text-center">
                                            <div className="inline-flex flex-col items-center">
                                                <span className={cn("text-lg font-bold font-mono", getImpactColor(risk.impactScore * risk.likelihoodScore))}>
                                                    {(risk.impactScore * risk.likelihoodScore).toFixed(1)}
                                                </span>
                                                <span className="text-[10px] text-[var(--text-muted)]">
                                                    I:{risk.impactScore.toFixed(1)} x L:{risk.likelihoodScore}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="p-4 text-sm">
                                            {isEditing ? (
                                                <select
                                                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                                                    value={editForm.treatmentOption || "Mitigate"}
                                                    onChange={e => setEditForm({ ...editForm, treatmentOption: e.target.value })}
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <option value="Mitigate">Mitigate</option>
                                                    <option value="Avoid">Avoid</option>
                                                    <option value="Transfer">Transfer</option>
                                                    <option value="Accept">Accept</option>
                                                </select>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "px-2 py-1 rounded text-xs font-medium border",
                                                        risk.treatmentOption === "Mitigate" && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
                                                        risk.treatmentOption === "Avoid" && "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
                                                        risk.treatmentOption === "Transfer" && "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
                                                        risk.treatmentOption === "Accept" && "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
                                                        !["Mitigate", "Avoid", "Transfer", "Accept"].includes(risk.treatmentOption) && "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
                                                    )}>
                                                        {risk.treatmentOption}
                                                    </span>
                                                </div>
                                            )}
                                        </td>

                                        <td className="p-4 text-center">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleResolvedToggle(risk.id, risk.isResolved);
                                                }}
                                                className={cn(
                                                    "p-1.5 rounded-full transition-colors inline-block",
                                                    risk.isResolved ? "bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/30" : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                                )}
                                            >
                                                {risk.isResolved ? <CheckCircle2 size={18} /> : <div className="w-4 h-4 rounded-full border-2 border-[var(--text-muted)]" />}
                                            </button>
                                        </td>

                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                                {isEditing ? (
                                                    <>
                                                        <button onClick={handleSave} disabled={isSaving} className="p-1.5 rounded bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20">
                                                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                        </button>
                                                        <button onClick={handleCancelEdit} className="p-1.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20">
                                                            <X size={16} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => handleEdit(risk)} className="p-1.5 text-[var(--text-muted)] hover:text-blue-600 dark:hover:text-blue-400 hover:bg-[var(--bg-elevated)] rounded transition-all">
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded Details Row */}
                                    {isExpanded && (
                                        <tr className="bg-[var(--bg-tertiary)]/20 border-b border-[var(--border-color)] animate-in fade-in zoom-in-95 duration-200">
                                            <td colSpan={7} className="p-6 pt-2">
                                                <div className="grid grid-cols-12 gap-6">

                                                    {/* Column 1: Rationale & Plan (Wider) */}
                                                    <div className="col-span-12 md:col-span-7 space-y-6">
                                                        <div>
                                                            <h4 className="text-xs uppercase text-[var(--text-muted)] font-semibold mb-2 flex items-center gap-2">
                                                                <ShieldAlert size={14} /> Risk Rationale
                                                            </h4>
                                                            <div className="p-3 bg-[var(--bg-primary)] rounded-md border border-[var(--border-color)] text-sm text-[var(--text-secondary)] leading-relaxed">
                                                                {risk.rationale || "No rationale provided."}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <h4 className="text-xs uppercase text-[var(--text-muted)] font-semibold mb-2">Remediation Action Plan</h4>
                                                            {isEditing ? (
                                                                <textarea
                                                                    className="w-full bg-[var(--bg-primary)] border border-blue-500/50 rounded-md p-3 text-sm min-h-[100px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                    value={editForm.actionPlan || ""}
                                                                    onChange={e => setEditForm({ ...editForm, actionPlan: e.target.value })}
                                                                    placeholder="Describe the steps to mitigate this risk..."
                                                                />
                                                            ) : (
                                                                <div className="p-3 bg-[var(--bg-primary)] rounded-md border border-[var(--border-color)] text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                                                                    {risk.actionPlan || "No action plan defined. Click edit to add one."}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Column 2: Controls & Details */}
                                                    <div className="col-span-12 md:col-span-5 space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                                                                <span className="text-[10px] uppercase text-[var(--text-muted)] block mb-1">Risk Category II</span>
                                                                {isEditing ? (
                                                                    <input
                                                                        className="w-full bg-transparent border-b border-[var(--border-color)] text-sm focus:outline-none focus:border-blue-500"
                                                                        value={editForm.riskCategory2 || ""}
                                                                        onChange={e => setEditForm({ ...editForm, riskCategory2: e.target.value })}
                                                                    />
                                                                ) : (
                                                                    <span className="text-sm font-medium">{risk.riskCategory2 || "N/A"}</span>
                                                                )}
                                                            </div>
                                                            <div className="p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                                                                <span className="text-[10px] uppercase text-[var(--text-muted)] block mb-1">Responsible Party</span>
                                                                {isEditing ? (
                                                                    <input
                                                                        className="w-full bg-transparent border-b border-[var(--border-color)] text-sm focus:outline-none focus:border-blue-500"
                                                                        value={editForm.responsibleParty || ""}
                                                                        onChange={e => setEditForm({ ...editForm, responsibleParty: e.target.value })}
                                                                    />
                                                                ) : (
                                                                    <span className="text-sm font-medium">{risk.responsibleParty || "Unassigned"}</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3 pt-2">
                                                            <div>
                                                                <span className="text-xs text-[var(--text-muted)] block mb-1">Current Controls</span>
                                                                {isEditing ? (
                                                                    <input
                                                                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-sm"
                                                                        value={editForm.currentControls || ""}
                                                                        onChange={e => setEditForm({ ...editForm, currentControls: e.target.value })}
                                                                    />
                                                                ) : (
                                                                    <div className="text-xs text-[var(--text-secondary)] p-2 bg-[var(--bg-primary)] rounded border border-[var(--border-color)]">
                                                                        {risk.currentControls || "None specified"}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-[var(--text-muted)] block mb-1">Proposed Controls</span>
                                                                <div className="text-xs text-[var(--text-secondary)] p-2 bg-[var(--bg-primary)] rounded border border-[var(--border-color)]">
                                                                    {risk.selectedControls || "None specified"}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-[var(--text-muted)] block mb-1">Violated Controls</span>
                                                                <div className="text-xs text-red-600 dark:text-red-400 p-2 bg-red-500/5 rounded border border-red-500/10 font-mono">
                                                                    {risk.controlsViolated || "None"}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-[var(--text-muted)] block mb-1">Remarks</span>
                                                                {isEditing ? (
                                                                    <input
                                                                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-sm"
                                                                        value={editForm.remarks || ""}
                                                                        onChange={e => setEditForm({ ...editForm, remarks: e.target.value })}
                                                                    />
                                                                ) : (
                                                                    <div className="text-xs text-[var(--text-muted)] italic">
                                                                        {risk.remarks || "No remarks."}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
                {risks.length === 0 && !isGenerating && (
                    <div className="p-16 text-center text-[var(--text-muted)] flex flex-col items-center">
                        <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-full flex items-center justify-center mb-6">
                            <ShieldAlert className="w-8 h-8 opacity-40" />
                        </div>
                        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No Risk Entries Found</h3>
                        <p className="mb-6 max-w-md">Your risk register is empty. Analyzing your vulnerabilities reveals potential risks, impact, and remediation steps.</p>
                        <button
                            onClick={handleGenerateRisks}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2 shadow-lg shadow-blue-900/20"
                        >
                            <Loader2 className={cn("w-4 h-4", isGenerating ? "animate-spin" : "hidden")} />
                            Start Risk Assessment
                        </button>
                    </div>
                )}
                {risks.length === 0 && isGenerating && (
                    <div className="p-16 text-center text-[var(--text-muted)]">
                        <div className="w-16 h-16 mx-auto mb-6 relative">
                            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Analyzing Risks with AI...</h3>
                        <p className="max-w-md mx-auto">Our security engine is evaluating threats, calculating risk scores, and generating remediation plans.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
