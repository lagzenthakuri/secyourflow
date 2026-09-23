"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Clock, RefreshCw, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskEntrySummary } from "@/types";

interface RiskAssessmentViewProps {
    riskEntry: RiskEntrySummary | null | undefined;
    vulnerabilityId: string;
    onRefresh?: () => void | Promise<void>;
}

/** How often to check whether a queued assessment has finished. */
const POLL_INTERVAL_MS = 4000;
/** Stop polling eventually; the worker's reaper will mark the row FAILED. */
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

interface AiAnalysis {
    confidentiality_impact?: number;
    integrity_impact?: number;
    availability_impact?: number;
    threat?: string;
    rationale_for_risk_rating?: string;
    risk_category?: string;
    treatment_option?: string;
    selected_controls?: string[];
    controls_violated_iso27001?: string[];
}

function Metric({ label, value }: { label: string; value: number | undefined }) {
    return (
        <div className="p-2 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-center">
            <p className="text-[10px] text-[var(--text-muted)] uppercase">{label}</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">
                {/* Rendered `undefined/5` when the row had no analysis yet. */}
                {typeof value === "number" ? `${value}/5` : "—"}
            </p>
        </div>
    );
}

export function RiskAssessmentView({ riskEntry, vulnerabilityId, onRefresh }: RiskAssessmentViewProps) {
    const [isStarting, setIsStarting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pollStartedAt = useRef<number | null>(null);

    const isProcessing = riskEntry?.status === "PROCESSING";

    const startAnalysis = useCallback(async () => {
        try {
            setIsStarting(true);
            setError(null);

            const response = await fetch(`/api/vulnerabilities/${vulnerabilityId}/analyze`, {
                method: "POST",
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to queue analysis");
            }

            pollStartedAt.current = Date.now();
            await onRefresh?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setIsStarting(false);
        }
    }, [vulnerabilityId, onRefresh]);

    // Analysis now runs in a worker, so the result arrives after this request
    // returns. Without polling the card sat on "in progress" indefinitely.
    useEffect(() => {
        if (!isProcessing || !onRefresh) {
            return;
        }

        if (pollStartedAt.current === null) {
            pollStartedAt.current = Date.now();
        }

        const timer = setInterval(() => {
            if (Date.now() - (pollStartedAt.current ?? 0) > POLL_TIMEOUT_MS) {
                clearInterval(timer);
                return;
            }
            void onRefresh();
        }, POLL_INTERVAL_MS);

        return () => clearInterval(timer);
    }, [isProcessing, onRefresh]);

    if (isStarting || isProcessing) {
        return (
            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Clock size={18} className="text-intent-accent animate-pulse" />
                    <p className="text-sm text-[var(--text-secondary)]">
                        Risk assessment in progress…
                    </p>
                </div>
                {/* An escape hatch: previously this state had no way out at all. */}
                <button
                    type="button"
                    onClick={() => void onRefresh?.()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-intent-accent transition-colors"
                >
                    <RefreshCw size={12} />
                    Check now
                </button>
            </div>
        );
    }

    if (error || riskEntry?.status === "FAILED") {
        return (
            <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-intent-danger">
                    <AlertCircle size={18} />
                    <p className="text-sm">
                        {error || riskEntry?.failureReason || "Risk assessment failed."}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void startAnalysis()}
                    className="text-xs font-semibold px-3 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-intent-danger transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!riskEntry || riskEntry.status !== "ACTIVE") {
        return (
            <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Zap size={18} className="text-purple-600 dark:text-purple-400" />
                    <p className="text-sm text-[var(--text-secondary)]">
                        No risk assessment for this vulnerability yet.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void startAnalysis()}
                    className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-2"
                >
                    <Shield size={14} />
                    Assess risk
                </button>
            </div>
        );
    }

    const analysis = (riskEntry.aiAnalysis || {}) as AiAnalysis;
    const score = riskEntry.riskScore ?? 0;
    const isAi = riskEntry.analysisSource === "AI";

    const scoreColor =
        score >= 20 ? "text-red-500"
        : score >= 12 ? "text-orange-500"
        : score >= 5 ? "text-yellow-700 dark:text-yellow-500"
        : "text-green-500";

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Shield size={18} className="text-purple-600 dark:text-purple-400" />
                    <h4 className="font-semibold text-[var(--text-primary)]">
                        {isAi ? "AI Risk Analysis" : "Risk Analysis"}
                    </h4>
                    {/* The deterministic fallback used to be presented as an AI
                        assessment, complete with an invented confidence score. */}
                    <span
                        className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            isAi
                                ? "border-purple-400/40 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                                : "border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                        )}
                        title={
                            isAi
                                ? "Produced by the configured AI provider."
                                : "Scored from CVSS, exploitation signals and asset criticality. No AI provider answered, so no control mapping or remediation plan was produced."
                        }
                    >
                        {isAi ? "AI assessed" : "Deterministic"}
                    </span>
                </div>
                <div className={cn("px-2 py-1 rounded text-xs font-bold bg-[var(--bg-tertiary)]", scoreColor)}>
                    RISK SCORE: {score.toFixed(1)}/25
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                <Metric label="Confidentiality" value={analysis.confidentiality_impact} />
                <Metric label="Integrity" value={analysis.integrity_impact} />
                <Metric label="Availability" value={analysis.availability_impact} />
            </div>

            <div className="space-y-2">
                {analysis.threat ? (
                    <div>
                        <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Threat</p>
                        <p className="text-sm text-[var(--text-primary)] bg-[var(--bg-tertiary)] p-2 rounded border border-[var(--border-color)]">
                            {analysis.threat}
                        </p>
                    </div>
                ) : null}
                {analysis.rationale_for_risk_rating ? (
                    <div>
                        <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Rationale</p>
                        <p className="text-sm text-[var(--text-muted)] line-clamp-3 hover:line-clamp-none transition-all cursor-help">
                            {analysis.rationale_for_risk_rating}
                        </p>
                    </div>
                ) : null}
            </div>

            {analysis.controls_violated_iso27001?.length ? (
                <div className="flex flex-wrap gap-2">
                    {analysis.controls_violated_iso27001.map((control) => (
                        <span
                            key={control}
                            className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[10px] text-intent-danger"
                        >
                            {control} violated
                        </span>
                    ))}
                </div>
            ) : null}

            <div className="pt-2 border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--text-muted)]">
                <span>{analysis.treatment_option ? `Treatment: ${analysis.treatment_option}` : "Treatment not set"}</span>
                <div className="flex items-center gap-3">
                    {isAi && typeof riskEntry.confidence === "number" ? (
                        <span>Confidence: {(riskEntry.confidence * 100).toFixed(0)}%</span>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => void startAnalysis()}
                        className="inline-flex items-center gap-1 hover:text-[var(--text-secondary)] transition-colors"
                    >
                        <RefreshCw size={11} />
                        Re-assess
                    </button>
                </div>
            </div>
        </div>
    );
}
