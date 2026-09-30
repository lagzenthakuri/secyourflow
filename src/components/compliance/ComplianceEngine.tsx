"use client";

import { useState, useEffect } from "react";
import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
    Upload,
    XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ComplianceCheck {
    id: string;
    name: string;
    frameworks: string[];
    status: "PASS" | "FAIL" | "WARNING";
    lastChecked: string;
}

interface EvidenceTask {
    id: string;
    description: string;
    controlId: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    dueDate: string;
}

interface AssessmentNote {
    controlId: string;
    explanation: string;
    status: "COMPLIANT" | "NON_COMPLIANT" | "NEEDS_REVIEW" | "NOT_APPLICABLE" | "MIXED";
}

export function ComplianceEngine() {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [checks, setChecks] = useState<ComplianceCheck[]>([]);
    const [evidenceTasks, setEvidenceTasks] = useState<EvidenceTask[]>([]);
    const [assessmentNotes, setAssessmentNotes] = useState<AssessmentNote[]>([]);

    const fetchData = async () => {
        try {
            setIsRefreshing(true);
            const response = await fetch("/api/compliance/engine");
            if (!response.ok) throw new Error("Failed to fetch compliance engine data");

            const data = await response.json();

            // Map API response to component state if necessary, 
            // but the API was designed to match the component's expected structure.
            // Check for empty data and provide fallbacks/placeholders if needed
            if (data.checks && data.checks.length > 0) {
                setChecks(data.checks);
            } else {
                // Fallback to initial mock data or empty state if desired
                // For now, let's keep the mock data if API returns empty to show off the UI
                // Actually, better to show "No active checks" if empty, but for demo purposes, 
                // users might prefer seeing something.
                // let's stick to empty if API returns empty, meaning "no data"
                setChecks([]);
            }

            if (data.evidenceTasks && data.evidenceTasks.length > 0) {
                setEvidenceTasks(data.evidenceTasks);
            } else {
                setEvidenceTasks([]);
            }

            if (data.assessmentNotes && data.assessmentNotes.length > 0) {
                setAssessmentNotes(data.assessmentNotes);
            } else {
                setAssessmentNotes([]);
            }

        } catch (error) {
            console.error("Error fetching compliance data:", error);
        } finally {
            setIsRefreshing(false);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Set up polling every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleRefresh = () => {
        fetchData();
    };

    return (
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                            Compliance Engine
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Control status and evidence follow-up
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <RefreshCw size={18} className={cn(isRefreshing && "animate-spin")} />
                    </button>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="grid grid-cols-1 xl:grid-cols-3 divide-y xl:divide-y-0 xl:divide-x divide-[var(--border-color)]">
                    {/* Column 1: Active Checks */}
                    <div className="p-5 space-y-4">
                        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
                            <ShieldCheck size={14} /> Active Monitoring
                        </h3>
                        <div className="space-y-3">
                            {isLoading ? (
                                <div className="animate-pulse space-y-3">
                                    <div className="h-20 bg-[var(--bg-tertiary)] rounded-xl" />
                                    <div className="h-20 bg-[var(--bg-tertiary)] rounded-xl" />
                                </div>
                            ) : checks.length === 0 ? (
                                <div className="text-center p-4 border border-dashed border-[var(--border-color)] rounded-xl text-[var(--text-muted)] text-sm">
                                    No active monitoring checks.
                                </div>
                            ) : (
                                checks.map((check) => (
                                    <div
                                        key={check.id}
                                        className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] hover:border-indigo-500/30 transition-colors"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium text-sm text-[var(--text-primary)]">
                                                {check.name}
                                            </span>
                                            {check.status === "PASS" && (
                                                <CheckCircle2 size={16} className="text-emerald-500" />
                                            )}
                                            {check.status === "FAIL" && (
                                                <XCircle size={16} className="text-red-500" />
                                            )}
                                            {check.status === "WARNING" && (
                                                <AlertCircle size={16} className="text-amber-500" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {check.frameworks.map((fw) => (
                                                <span
                                                    key={fw}
                                                    className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)]"
                                                >
                                                    {fw}
                                                </span>
                                            ))}
                                            <span className="text-[10px] text-[var(--text-muted)] ml-auto">
                                                {check.lastChecked}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Column 2: Evidence Tasks */}
                    <div className="p-5 space-y-4">
                        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
                            <Upload size={14} /> Pending Evidence Tasks
                        </h3>
                        <div className="space-y-3">
                            {isLoading ? (
                                <div className="animate-pulse space-y-3">
                                    <div className="h-20 bg-[var(--bg-tertiary)] rounded-xl" />
                                    <div className="h-20 bg-[var(--bg-tertiary)] rounded-xl" />
                                </div>
                            ) : evidenceTasks.length === 0 ? (
                                <div className="text-center p-4 border border-dashed border-[var(--border-color)] rounded-xl text-[var(--text-muted)] text-sm">
                                    No pending evidence tasks.
                                </div>
                            ) : (
                                <>
                                    {evidenceTasks.map((task) => (
                                        <div
                                            key={`${task.id}-${task.controlId}`}
                                            className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)]"
                                        >
                                            <p className="text-sm font-medium text-[var(--text-primary)]">
                                                {task.description}
                                            </p>
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-card)] px-1.5 py-0.5 rounded">
                                                    {task.controlId}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={cn(
                                                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                                            task.priority === "HIGH"
                                                                ? "bg-red-500/10 text-red-500"
                                                                : "bg-amber-500/10 text-amber-500"
                                                        )}
                                                    >
                                                        {task.priority}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--text-muted)]">
                                                        Due {task.dueDate}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Column 3: Stored assessment notes and status summaries */}
                    <div className="p-5 space-y-4">
                        <h3 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-2">
                            <ShieldCheck size={14} /> Assessment notes
                        </h3>
                        <div className="space-y-3">
                            {isLoading ? (
                                <div className="animate-pulse space-y-3">
                                    <div className="h-24 bg-[var(--bg-tertiary)] rounded-xl" />
                                    <div className="h-24 bg-[var(--bg-tertiary)] rounded-xl" />
                                </div>
                            ) : assessmentNotes.length === 0 ? (
                                <div className="text-center p-4 border border-dashed border-[var(--border-color)] rounded-xl text-[var(--text-muted)] text-sm">
                                    No assessment notes yet.
                                </div>
                            ) : (
                                assessmentNotes.map((insight) => (
                                        <div
                                            key={insight.controlId}
                                            className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]"
                                        >
                                            <div>
                                                <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                                                    <span className="font-semibold text-[var(--text-primary)] mr-1">
                                                        {insight.controlId}:
                                                    </span>
                                                    {insight.explanation}
                                                </p>
                                                {insight.status === "COMPLIANT" && (
                                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-500">
                                                        <CheckCircle2 size={12} />
                                                        <span>Marked compliant</span>
                                                    </div>
                                                )}
                                                {insight.status === "NEEDS_REVIEW" && (
                                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-500">
                                                        <ShieldAlert size={12} />
                                                        <span>Review needed</span>
                                                    </div>
                                                )}
                                                {insight.status === "NON_COMPLIANT" && (
                                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
                                                        <ShieldAlert size={12} />
                                                        <span>Marked non-compliant</span>
                                                    </div>
                                                )}
                                                {insight.status === "NOT_APPLICABLE" && (
                                                    <div className="mt-2 text-xs text-[var(--text-muted)]">
                                                        Not applicable
                                                    </div>
                                                )}
                                                {insight.status === "MIXED" && (
                                                    <div className="mt-2 text-xs text-[var(--text-muted)]">
                                                        Compliant or not applicable
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
