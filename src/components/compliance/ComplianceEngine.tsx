"use client";

import { useState, useEffect } from "react";
import {
    AlertCircle,
    Bot,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    FileText,
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

interface AIInsight {
    controlId: string;
    explanation: string;
    sentiment: "positive" | "negative" | "neutral";
}

export function ComplianceEngine() {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [checks, setChecks] = useState<ComplianceCheck[]>([]);
    const [evidenceTasks, setEvidenceTasks] = useState<EvidenceTask[]>([]);
    const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);

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

            if (data.aiInsights && data.aiInsights.length > 0) {
                setAiInsights(data.aiInsights);
            } else {
                setAiInsights([]);
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
                        <Bot size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                            Compliance Engine
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            AI-driven controls monitoring & evidence automation
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
                                            key={task.id}
                                            className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] group hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
                                        >
                                            <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-indigo-400 transition-colors">
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
                                    <button className="w-full py-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 border border-dashed border-indigo-500/30 rounded-xl hover:bg-indigo-500/5 transition-colors">
                                        + Generate New Task
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Column 3: AI Insights */}
                    <div className="p-5 space-y-4 bg-gradient-to-b from-indigo-500/5 to-transparent">
                        <h3 className="text-sm font-medium text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                            <Bot size={14} /> AI Auditor Insights
                        </h3>
                        <div className="space-y-3">
                            {isLoading ? (
                                <div className="animate-pulse space-y-3">
                                    <div className="h-24 bg-[var(--bg-tertiary)] rounded-xl" />
                                    <div className="h-24 bg-[var(--bg-tertiary)] rounded-xl" />
                                </div>
                            ) : aiInsights.length === 0 ? (
                                <div className="text-center p-4 border border-dashed border-indigo-500/20 rounded-xl text-indigo-400/70 text-sm">
                                    No AI insights available yet.
                                </div>
                            ) : (
                                <>
                                    {aiInsights.map((insight, idx) => (
                                        <div
                                            key={idx}
                                            className="group relative p-3 rounded-xl border border-indigo-200/20 bg-[var(--bg-card)]/80 backdrop-blur-sm"
                                        >
                                            <div className="absolute -left-1 top-4 w-1 h-6 bg-indigo-500 rounded-r-full" />
                                            <div className="ml-2">
                                                <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                                                    <span className="font-semibold text-indigo-400 mr-1">
                                                        {insight.controlId}:
                                                    </span>
                                                    {insight.explanation}
                                                </p>
                                                {insight.sentiment === "positive" && (
                                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-500">
                                                        <CheckCircle2 size={12} />
                                                        <span>Compliance verified</span>
                                                    </div>
                                                )}
                                                {insight.sentiment === "neutral" && (
                                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-500">
                                                        <ShieldAlert size={12} />
                                                        <span>Attention needed</span>
                                                    </div>
                                                )}
                                                {insight.sentiment === "negative" && (
                                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
                                                        <ShieldAlert size={12} />
                                                        <span>Critical issue</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)]/50 text-center">
                                        <p className="text-xs text-[var(--text-muted)]">
                                            AI is continuously analyzing controls...
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
