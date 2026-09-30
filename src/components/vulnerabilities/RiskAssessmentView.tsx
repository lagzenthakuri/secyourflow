"use client";

import { AlertCircle, Clock, RefreshCw, Shield, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { RiskEntrySummary } from "@/types";

interface RiskAssessmentViewProps {
  onRefresh?: () => void | Promise<void>;
  riskEntry: RiskEntrySummary | null | undefined;
  vulnerabilityId: string;
}

/** How often to check whether a queued assessment has finished. */
const POLL_INTERVAL_MS = 4000;
/** Stop polling eventually; the worker's reaper will mark the row FAILED. */
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

interface AiAnalysis {
  availability_impact?: number;
  confidentiality_impact?: number;
  controls_violated_iso27001?: string[];
  integrity_impact?: number;
  rationale_for_risk_rating?: string;
  risk_category?: string;
  selected_controls?: string[];
  threat?: string;
  treatment_option?: string;
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number | undefined;
}) {
  return (
    <div className="rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2 text-center">
      <p className="text-[10px] text-[var(--text-muted)] uppercase">{label}</p>
      <p className="font-bold text-[var(--text-primary)] text-lg">
        {/* Rendered `undefined/5` when the row had no analysis yet. */}
        {typeof value === "number" ? `${value}/5` : "—"}
      </p>
    </div>
  );
}

export function RiskAssessmentView({
  riskEntry,
  vulnerabilityId,
  onRefresh,
}: RiskAssessmentViewProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollStartedAt = useRef<number | null>(null);

  const isProcessing = riskEntry?.status === "PROCESSING";

  const startAnalysis = useCallback(async () => {
    try {
      setIsStarting(true);
      setError(null);

      const response = await fetch(
        `/api/vulnerabilities/${vulnerabilityId}/analyze`,
        {
          method: "POST",
        }
      );
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
    if (!(isProcessing && onRefresh)) {
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
      <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-500/10 bg-blue-500/5 p-4">
        <div className="flex items-center gap-3">
          <Clock className="animate-pulse text-intent-accent" size={18} />
          <p className="text-[var(--text-secondary)] text-sm">
            Risk assessment in progress…
          </p>
        </div>
        {/* An escape hatch: previously this state had no way out at all. */}
        <button
          className="inline-flex items-center gap-1.5 rounded bg-blue-500/10 px-3 py-1 font-semibold text-intent-accent text-xs transition-colors hover:bg-blue-500/20"
          onClick={() => void onRefresh?.()}
          type="button"
        >
          <RefreshCw size={12} />
          Check now
        </button>
      </div>
    );
  }

  if (error || riskEntry?.status === "FAILED") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-red-500/10 bg-red-500/5 p-4">
        <div className="flex items-center gap-3 text-intent-danger">
          <AlertCircle size={18} />
          <p className="text-sm">
            {error || riskEntry?.failureReason || "Risk assessment failed."}
          </p>
        </div>
        <button
          className="rounded bg-red-500/10 px-3 py-1 font-semibold text-intent-danger text-xs transition-colors hover:bg-red-500/20"
          onClick={() => void startAnalysis()}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!riskEntry || riskEntry.status !== "ACTIVE") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-purple-500/10 bg-purple-500/5 p-4">
        <div className="flex items-center gap-3">
          <Zap className="text-purple-600 dark:text-purple-400" size={18} />
          <p className="text-[var(--text-secondary)] text-sm">
            No risk assessment for this vulnerability yet.
          </p>
        </div>
        <button
          className="btn btn-primary flex items-center gap-2 px-3 py-1.5 text-xs"
          onClick={() => void startAnalysis()}
          type="button"
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
    score >= 20
      ? "text-red-500"
      : score >= 12
        ? "text-orange-500"
        : score >= 5
          ? "text-yellow-700 dark:text-yellow-500"
          : "text-green-500";

  return (
    <div className="fade-in slide-in-from-top-2 animate-in space-y-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className="text-purple-600 dark:text-purple-400" size={18} />
          <h4 className="font-semibold text-[var(--text-primary)]">
            {isAi ? "AI Risk Analysis" : "Risk Analysis"}
          </h4>
          {/* The deterministic fallback used to be presented as an AI
                        assessment, complete with an invented confidence score. */}
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 font-medium text-[10px]",
              isAi
                ? "border-purple-400/40 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                : "border-amber-400/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
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
        <div
          className={cn(
            "rounded bg-[var(--bg-tertiary)] px-2 py-1 font-bold text-xs",
            scoreColor
          )}
        >
          RISK SCORE: {score.toFixed(1)}/25
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric
          label="Confidentiality"
          value={analysis.confidentiality_impact}
        />
        <Metric label="Integrity" value={analysis.integrity_impact} />
        <Metric label="Availability" value={analysis.availability_impact} />
      </div>

      <div className="space-y-2">
        {analysis.threat ? (
          <div>
            <p className="mb-1 font-medium text-[var(--text-secondary)] text-xs">
              Threat
            </p>
            <p className="rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2 text-[var(--text-primary)] text-sm">
              {analysis.threat}
            </p>
          </div>
        ) : null}
        {analysis.rationale_for_risk_rating ? (
          <div>
            <p className="mb-1 font-medium text-[var(--text-secondary)] text-xs">
              Rationale
            </p>
            <p className="line-clamp-3 cursor-help text-[var(--text-muted)] text-sm transition-all hover:line-clamp-none">
              {analysis.rationale_for_risk_rating}
            </p>
          </div>
        ) : null}
      </div>

      {analysis.controls_violated_iso27001?.length ? (
        <div className="flex flex-wrap gap-2">
          {analysis.controls_violated_iso27001.map((control) => (
            <span
              className="rounded border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] text-intent-danger"
              key={control}
            >
              {control} violated
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-[var(--border-color)] border-t pt-2 text-[10px] text-[var(--text-muted)]">
        <span>
          {analysis.treatment_option
            ? `Treatment: ${analysis.treatment_option}`
            : "Treatment not set"}
        </span>
        <div className="flex items-center gap-3">
          {isAi && typeof riskEntry.confidence === "number" ? (
            <span>Confidence: {(riskEntry.confidence * 100).toFixed(0)}%</span>
          ) : null}
          <button
            className="inline-flex items-center gap-1 transition-colors hover:text-[var(--text-secondary)]"
            onClick={() => void startAnalysis()}
            type="button"
          >
            <RefreshCw size={11} />
            Re-assess
          </button>
        </div>
      </div>
    </div>
  );
}
