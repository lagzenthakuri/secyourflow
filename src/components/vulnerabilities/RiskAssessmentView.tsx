"use client";

import { useState } from "react";
import { Shield, Clock, Zap, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskAssessmentViewProps {
    riskEntry: {
        status?: string;
        riskScore?: number;
        impactScore?: number;
        likelihoodScore?: number;
        aiAnalysis?: Record<string, unknown>;
        [key: string]: unknown;
    } | null | undefined;
    vulnerabilityId: string;
    onRefresh?: () => void;
}

export function RiskAssessmentView({ riskEntry, vulnerabilityId, onRefresh }: RiskAssessmentViewProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleStartAnalysis = async () => {
        try {
            setIsAnalyzing(true);
            setError(null);
            const response = await fetch(`/api/vulnerabilities/${vulnerabilityId}/analyze`, {
                method: "POST",
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to start analysis");
            }

            if (onRefresh) {
                await onRefresh();
            }
        } catch (err) {
            console.error("Analysis error:", err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    if (isAnalyzing || riskEntry?.status === "PROCESSING") {
        return (
            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10 flex items-center gap-3">
                <Clock size={18} className="text-blue-400 animate-pulse" />
                <p className="text-sm text-[var(--text-secondary)]">
                    AI Risk Assessment in progress...
                </p>
            </div>
        );
    }

    if (error || riskEntry?.status === "FAILED") {
        return (
            <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-red-400">
                    <AlertCircle size={18} />
                    <p className="text-sm">{error || "AI Risk Assessment failed. Please try again."}</p>
                </div>
                <button
                    onClick={handleStartAnalysis}
                    className="text-xs font-semibold px-3 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!riskEntry) {
        return (
            <div className="p-4 rounded-lg bg-purple-500/5 border border-purple-500/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Zap size={18} className="text-purple-400" />
                    <p className="text-sm text-[var(--text-secondary)]">
                        No AI Risk Assessment found for this vulnerability.
                    </p>
                </div>
                <button
                    onClick={handleStartAnalysis}
                    className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-2"
                >
                    <Shield size={14} />
                    Start AI Assessment
                </button>
            </div>
        );
    }

    const analysis = (riskEntry.aiAnalysis || {}) as {
        confidentiality_impact?: number;
        integrity_impact?: number;
        availability_impact?: number;
        threat?: string;
        rationale_for_risk_rating?: string;
        risk_category?: string;
        treatment_option?: string;
        current_controls?: string;
        selected_controls?: string[];
        controls_violated_iso27001?: string[];
        confidence?: number;
        [key: string]: unknown;
    };
    const score = riskEntry.riskScore ?? 0;

    const getScoreColor = (s: number) => {
        if (s >= 20) return "text-red-500";
        if (s >= 12) return "text-orange-500";
        if (s >= 5) return "text-yellow-500";
        return "text-green-500";
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield size={18} className="text-purple-400" />
                    <h4 className="font-semibold text-white">AI Risk Analysis</h4>
                </div>
                <div className={cn("px-2 py-1 rounded text-xs font-bold bg-white/5", getScoreColor(score))}>
                    RISK SCORE: {score.toFixed(1)}/25
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded bg-white/5 border border-white/10 text-center">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase">Confidentiality</p>
                    <p className="text-lg font-bold text-white">{analysis.confidentiality_impact}/5</p>
                </div>
                <div className="p-2 rounded bg-white/5 border border-white/10 text-center">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase">Integrity</p>
                    <p className="text-lg font-bold text-white">{analysis.integrity_impact}/5</p>
                </div>
                <div className="p-2 rounded bg-white/5 border border-white/10 text-center">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase">Availability</p>
                    <p className="text-lg font-bold text-white">{analysis.availability_impact}/5</p>
                </div>
            </div>

            <div className="space-y-2">
                <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Threat Statement</p>
                    <p className="text-sm text-white bg-white/5 p-2 rounded border border-white/5">
                        {analysis.threat}
                    </p>
                </div>
                <div>
                    <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Rationale</p>
                    <p className="text-sm text-[var(--text-muted)] line-clamp-3 hover:line-clamp-none transition-all cursor-help">
                        {analysis.rationale_for_risk_rating}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {analysis.controls_violated_iso27001?.map((control: string) => (
                    <span key={control} className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[10px] text-red-400">
                        {control} Violated
                    </span>
                ))}
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <span>Treatment: {analysis.treatment_option}</span>
                <span>Confidence: {((analysis.confidence ?? 0) * 100).toFixed(0)}%</span>
            </div>
        </div>
    );
}
