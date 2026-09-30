"use client";

import {
  AlertCircle,
  Bot,
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
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData();
  };

  return (
    <section className="fade-in slide-in-from-bottom-4 animate-in overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] duration-500">
      <div className="flex items-center justify-between border-[var(--border-color)] border-b p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-500">
            <Bot size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-[var(--text-primary)] text-lg">
              Compliance Engine
            </h2>
            <p className="text-[var(--text-secondary)] text-sm">
              AI-driven controls monitoring & evidence automation
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
                      className="group cursor-pointer rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-3 transition-colors hover:bg-[var(--bg-elevated)]"
                      key={`${task.id}-${task.controlId}`}
                    >
                      <p className="font-medium text-[var(--text-primary)] text-sm transition-colors group-hover:text-indigo-400">
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
                  <button className="w-full rounded-xl border border-indigo-500/30 border-dashed py-2 font-medium text-indigo-400 text-xs transition-colors hover:bg-indigo-500/5 hover:text-indigo-300">
                    + Generate New Task
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Column 3: AI Insights */}
          <div className="space-y-4 bg-gradient-to-b from-indigo-500/5 to-transparent p-5">
            <h3 className="flex items-center gap-2 font-medium text-indigo-400 text-sm uppercase tracking-wider">
              <Bot size={14} /> AI Auditor Insights
            </h3>
            <div className="space-y-3">
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-24 rounded-xl bg-[var(--bg-tertiary)]" />
                  <div className="h-24 rounded-xl bg-[var(--bg-tertiary)]" />
                </div>
              ) : aiInsights.length === 0 ? (
                <div className="rounded-xl border border-indigo-500/20 border-dashed p-4 text-center text-indigo-400/70 text-sm">
                  No AI insights available yet.
                </div>
              ) : (
                <>
                  {aiInsights.map((insight, idx) => (
                    <div
                      className="group relative rounded-xl border border-indigo-200/20 bg-[var(--bg-card)]/80 p-3 backdrop-blur-sm"
                      key={idx}
                    >
                      <div className="absolute top-4 -left-1 h-6 w-1 rounded-r-full bg-indigo-500" />
                      <div className="ml-2">
                        <p className="text-[var(--text-primary)] text-sm leading-relaxed">
                          <span className="mr-1 font-semibold text-indigo-400">
                            {insight.controlId}:
                          </span>
                          {insight.explanation}
                        </p>
                        {insight.sentiment === "positive" && (
                          <div className="mt-2 flex items-center gap-1.5 text-emerald-500 text-xs">
                            <CheckCircle2 size={12} />
                            <span>Compliance verified</span>
                          </div>
                        )}
                        {insight.sentiment === "neutral" && (
                          <div className="mt-2 flex items-center gap-1.5 text-amber-500 text-xs">
                            <ShieldAlert size={12} />
                            <span>Attention needed</span>
                          </div>
                        )}
                        {insight.sentiment === "negative" && (
                          <div className="mt-2 flex items-center gap-1.5 text-red-500 text-xs">
                            <ShieldAlert size={12} />
                            <span>Critical issue</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)]/50 p-3 text-center">
                    <p className="text-[var(--text-muted)] text-xs">
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
