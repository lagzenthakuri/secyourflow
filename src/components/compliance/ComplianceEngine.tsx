"use client";

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
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ComplianceCheck {
  frameworks: string[];
  id: string;
  lastChecked: string;
  name: string;
  status: "PASS" | "FAIL" | "WARNING";
}

interface EvidenceTask {
  controlId: string;
  description: string;
  dueDate: string;
  id: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

interface AssessmentNote {
  controlId: string;
  explanation: string;
  status:
    | "COMPLIANT"
    | "NON_COMPLIANT"
    | "NEEDS_REVIEW"
    | "NOT_APPLICABLE"
    | "MIXED";
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
      if (!response.ok) {
        throw new Error("Failed to fetch compliance engine data");
      }

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
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  return (
    <section className="fade-in slide-in-from-bottom-4 animate-in overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] duration-500">
      <div className="flex items-center justify-between border-[var(--border-color)] border-b p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-500">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)] text-lg">
              Compliance Engine
            </h2>
            <p className="text-[var(--text-secondary)] text-sm">
              Control status and evidence follow-up
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            onClick={handleRefresh}
          >
            <RefreshCw
              className={cn(isRefreshing && "animate-spin")}
              size={18}
            />
          </button>
          <button
            className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 divide-y divide-[var(--border-color)] xl:grid-cols-3 xl:divide-x xl:divide-y-0">
          {/* Column 1: Active Checks */}
          <div className="space-y-4 p-5">
            <h3 className="flex items-center gap-2 font-medium text-[var(--text-muted)] text-sm uppercase tracking-wider">
              <ShieldCheck size={14} /> Active Monitoring
            </h3>
            <div className="space-y-3">
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-20 rounded-xl bg-[var(--bg-tertiary)]" />
                  <div className="h-20 rounded-xl bg-[var(--bg-tertiary)]" />
                </div>
              ) : checks.length === 0 ? (
                <div className="rounded-xl border border-[var(--border-color)] border-dashed p-4 text-center text-[var(--text-muted)] text-sm">
                  No active monitoring checks.
                </div>
              ) : (
                checks.map((check) => (
                  <div
                    className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-3 transition-colors hover:border-indigo-500/30"
                    key={check.id}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <span className="font-medium text-[var(--text-primary)] text-sm">
                        {check.name}
                      </span>
                      {check.status === "PASS" && (
                        <CheckCircle2 className="text-emerald-500" size={16} />
                      )}
                      {check.status === "FAIL" && (
                        <XCircle className="text-red-500" size={16} />
                      )}
                      {check.status === "WARNING" && (
                        <AlertCircle className="text-amber-500" size={16} />
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {check.frameworks.map((fw) => (
                        <span
                          className="rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]"
                          key={fw}
                        >
                          {fw}
                        </span>
                      ))}
                      <span className="ml-auto text-[10px] text-[var(--text-muted)]">
                        {check.lastChecked}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 2: Evidence Tasks */}
          <div className="space-y-4 p-5">
            <h3 className="flex items-center gap-2 font-medium text-[var(--text-muted)] text-sm uppercase tracking-wider">
              <Upload size={14} /> Pending Evidence Tasks
            </h3>
            <div className="space-y-3">
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-20 rounded-xl bg-[var(--bg-tertiary)]" />
                  <div className="h-20 rounded-xl bg-[var(--bg-tertiary)]" />
                </div>
              ) : evidenceTasks.length === 0 ? (
                <div className="rounded-xl border border-[var(--border-color)] border-dashed p-4 text-center text-[var(--text-muted)] text-sm">
                  No pending evidence tasks.
                </div>
              ) : (
                <>
                  {evidenceTasks.map((task) => (
                    <div
                      className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-3"
                      key={`${task.id}-${task.controlId}`}
                    >
                      <p className="font-medium text-[var(--text-primary)] text-sm">
                        {task.description}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="rounded bg-[var(--bg-card)] px-1.5 py-0.5 font-mono text-[var(--text-muted)] text-xs">
                          {task.controlId}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 font-bold text-[10px]",
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
          <div className="space-y-4 p-5">
            <h3 className="flex items-center gap-2 font-medium text-[var(--text-muted)] text-sm uppercase tracking-wider">
              <ShieldCheck size={14} /> Assessment notes
            </h3>
            <div className="space-y-3">
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-24 rounded-xl bg-[var(--bg-tertiary)]" />
                  <div className="h-24 rounded-xl bg-[var(--bg-tertiary)]" />
                </div>
              ) : assessmentNotes.length === 0 ? (
                <div className="rounded-xl border border-[var(--border-color)] border-dashed p-4 text-center text-[var(--text-muted)] text-sm">
                  No assessment notes yet.
                </div>
              ) : (
                assessmentNotes.map((insight) => (
                  <div
                    className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3"
                    key={insight.controlId}
                  >
                    <div>
                      <p className="text-[var(--text-primary)] text-sm leading-relaxed">
                        <span className="mr-1 font-semibold text-[var(--text-primary)]">
                          {insight.controlId}:
                        </span>
                        {insight.explanation}
                      </p>
                      {insight.status === "COMPLIANT" && (
                        <div className="mt-2 flex items-center gap-1.5 text-emerald-500 text-xs">
                          <CheckCircle2 size={12} />
                          <span>Marked compliant</span>
                        </div>
                      )}
                      {insight.status === "NEEDS_REVIEW" && (
                        <div className="mt-2 flex items-center gap-1.5 text-amber-500 text-xs">
                          <ShieldAlert size={12} />
                          <span>Review needed</span>
                        </div>
                      )}
                      {insight.status === "NON_COMPLIANT" && (
                        <div className="mt-2 flex items-center gap-1.5 text-red-500 text-xs">
                          <ShieldAlert size={12} />
                          <span>Marked non-compliant</span>
                        </div>
                      )}
                      {insight.status === "NOT_APPLICABLE" && (
                        <div className="mt-2 text-[var(--text-muted)] text-xs">
                          Not applicable
                        </div>
                      )}
                      {insight.status === "MIXED" && (
                        <div className="mt-2 text-[var(--text-muted)] text-xs">
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
