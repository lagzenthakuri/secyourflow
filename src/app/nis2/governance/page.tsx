"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
  Scale,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  EmptyState,
  Pill,
  ProgressBar,
  SectionCard,
  toneForCoverage,
} from "@/components/nis2/Nis2Primitives";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShieldLoader } from "@/components/ui/ShieldLoader";

type ChecklistStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "IMPLEMENTED"
  | "NOT_APPLICABLE";
type VerificationMode = "AUTOMATED" | "PARTIAL" | "MANUAL";

interface ChecklistItem {
  article: string;
  code: string;
  description: string;
  dueDate: string | null;
  escalated: boolean;
  escalationReason: string | null;
  id: string;
  measure: string;
  measureLabel: string;
  notes: string | null;
  owner: { id: string; name: string | null; email: string } | null;
  ownerId: string | null;
  status: ChecklistStatus;
  title: string;
  verificationMode: VerificationMode;
}

interface MeasureCoverage {
  coverage: number;
  escalated: number;
  implemented: number;
  label: string;
  letter: string;
  measure: string;
  notApplicable: number;
  total: number;
}

interface GovernanceSummary {
  byMeasure: MeasureCoverage[];
  coverage: number;
  escalated: number;
  implemented: number;
  inProgress: number;
  notStarted: number;
  overdue: number;
  totalItems: number;
  unassigned: number;
}

const STATUS_LABELS: Record<ChecklistStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  IMPLEMENTED: "Implemented",
  NOT_APPLICABLE: "Not applicable",
};

const STATUS_TONE = {
  NOT_STARTED: "danger",
  IN_PROGRESS: "warning",
  IMPLEMENTED: "success",
  NOT_APPLICABLE: "neutral",
} as const;

const VERIFICATION_TONE = {
  AUTOMATED: "success",
  PARTIAL: "info",
  MANUAL: "neutral",
} as const;

const STATUS_OPTIONS: ChecklistStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "IMPLEMENTED",
  "NOT_APPLICABLE",
];

export default function Nis2GovernancePage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [summary, setSummary] = useState<GovernanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [measureFilter, setMeasureFilter] = useState<string>("ALL");
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/nis2/governance", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to load the Art. 21 checklist");
      }
      const payload = await response.json();
      setItems(payload.data ?? []);
      setSummary(payload.summary ?? null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load the Art. 21 checklist"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const syncRisk = useCallback(async () => {
    setIsSyncing(true);
    try {
      setError(null);
      const response = await fetch("/api/nis2/governance/sync-risk", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Risk sync failed");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Risk sync failed");
    } finally {
      setIsSyncing(false);
    }
  }, [load]);

  const updateStatus = useCallback(
    async (id: string, status: ChecklistStatus) => {
      setSavingId(id);
      try {
        setError(null);
        const response = await fetch("/api/nis2/governance", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status }),
        });
        if (!response.ok) {
          throw new Error("Failed to update the checklist item");
        }
        const payload = await response.json();
        setItems((current) =>
          current.map((item) =>
            item.id === id ? { ...item, ...payload.data } : item
          )
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to update the checklist item"
        );
      } finally {
        setSavingId(null);
      }
    },
    []
  );

  // Status counters are recomputed from the rows so inline edits are
  // reflected immediately; escalation and due-date counts stay server-side.
  const liveSummary = useMemo(() => {
    if (!summary) {
      return null;
    }
    const implemented = items.filter(
      (item) => item.status === "IMPLEMENTED"
    ).length;
    const notApplicable = items.filter(
      (item) => item.status === "NOT_APPLICABLE"
    ).length;
    const inScope = items.length - notApplicable;

    return {
      ...summary,
      implemented,
      inProgress: items.filter((item) => item.status === "IN_PROGRESS").length,
      notStarted: items.filter((item) => item.status === "NOT_STARTED").length,
      coverage:
        inScope > 0 ? Math.round((implemented / inScope) * 1000) / 10 : 100,
    };
  }, [items, summary]);

  const measures = liveSummary?.byMeasure ?? [];

  const visibleItems = useMemo(
    () =>
      measureFilter === "ALL"
        ? items
        : items.filter((item) => item.measure === measureFilter),
    [items, measureFilter]
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <ShieldLoader size="lg" variant="cyber" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PageHeader
          actions={
            <button
              className="btn btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60"
              disabled={isSyncing}
              onClick={() => void syncRisk()}
              type="button"
            >
              <RefreshCw
                className={isSyncing ? "animate-spin" : ""}
                size={14}
              />
              Sync from findings
            </button>
          }
          badge={
            <>
              <Scale size={13} />
              Directive (EU) 2022/2555 — Art. 21
            </>
          }
          description="Art. 21(2) risk-management measures. Sub-paragraphs (g) and (i) require human judgement by design of the directive — the platform tracks them, it cannot verify them."
          stats={[
            {
              label: "Coverage",
              value: `${liveSummary?.coverage ?? 0}%`,
              trend: { value: "Of in-scope measures", neutral: true },
              icon: ClipboardCheck,
            },
            {
              label: "Implemented",
              value: `${liveSummary?.implemented ?? 0} / ${liveSummary?.totalItems ?? 0}`,
              trend: { value: "Checklist items", neutral: true },
              icon: CheckCircle2,
            },
            {
              label: "Escalated",
              value: liveSummary?.escalated ?? 0,
              trend: { value: "Contradicted by findings", neutral: true },
              icon: ShieldAlert,
            },
            {
              label: "Overdue",
              value: liveSummary?.overdue ?? 0,
              trend: { value: "Past their due date", neutral: true },
              icon: AlertTriangle,
            },
            {
              label: "Unassigned",
              value: liveSummary?.unassigned ?? 0,
              trend: { value: "Without an owner", neutral: true },
              icon: UserRound,
            },
          ]}
          title="NIS2 Governance"
        />

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-red-600 text-sm dark:text-red-400">
            {error}
          </div>
        )}

        <SectionCard
          description="Art. 21(2)(a) through (j). Percentages exclude items marked not applicable."
          title="Coverage by sub-paragraph"
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {measures.map((measure) => (
              <button
                className={`rounded-xl border p-3 text-left transition-colors ${
                  measureFilter === measure.measure
                    ? "border-sky-400/50 bg-sky-400/5"
                    : "border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]"
                }`}
                key={measure.measure}
                onClick={() =>
                  setMeasureFilter((current) =>
                    current === measure.measure ? "ALL" : measure.measure
                  )
                }
                type="button"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-bold text-[10px] text-[var(--text-muted)] uppercase tracking-widest">
                    ({measure.letter})
                  </span>
                  <span className="font-bold text-[var(--text-primary)] text-sm">
                    {measure.coverage}%
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[var(--text-secondary)] text-xs">
                  {measure.label}
                </p>
                <ProgressBar
                  className="mt-2"
                  tone={toneForCoverage(measure.coverage)}
                  value={measure.coverage}
                />
                <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                  {measure.implemented}/{measure.total - measure.notApplicable}{" "}
                  implemented
                  {measure.escalated > 0 && ` · ${measure.escalated} escalated`}
                </p>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          actions={
            measureFilter !== "ALL" && (
              <button
                className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 font-medium text-[var(--text-secondary)] text-xs hover:bg-[var(--bg-tertiary)]"
                onClick={() => setMeasureFilter("ALL")}
                type="button"
              >
                Clear filter
              </button>
            )
          }
          description={
            measureFilter === "ALL"
              ? `${visibleItems.length} measures across all ten sub-paragraphs.`
              : `Filtered to ${measures.find((m) => m.measure === measureFilter)?.label ?? measureFilter}.`
          }
          title="Checklist"
        >
          {visibleItems.length === 0 ? (
            <EmptyState message="No checklist items match this filter." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-[var(--border-color)] border-b text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
                    <th className="px-3 py-2 font-semibold">Code</th>
                    <th className="px-3 py-2 font-semibold">Measure</th>
                    <th className="px-3 py-2 font-semibold">Verification</th>
                    <th className="px-3 py-2 font-semibold">Owner</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.map((item) => (
                    <tr
                      className="border-[var(--border-color)]/50 border-b align-top last:border-0"
                      key={item.id}
                    >
                      <td className="whitespace-nowrap px-3 py-3">
                        <span className="font-bold font-mono text-[var(--text-primary)] text-xs">
                          {item.code}
                        </span>
                        <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                          {item.article}
                        </p>
                      </td>
                      <td className="max-w-md px-3 py-3">
                        <p className="font-medium text-[var(--text-primary)]">
                          {item.title}
                        </p>
                        <p className="mt-1 text-[var(--text-secondary)] text-xs leading-relaxed">
                          {item.description}
                        </p>
                        {item.escalated && item.escalationReason && (
                          <p className="mt-2 inline-flex items-start gap-1.5 rounded-lg border border-red-400/30 bg-red-400/10 px-2 py-1 text-[11px] text-red-600 dark:text-red-400">
                            <ShieldAlert
                              className="mt-0.5 shrink-0"
                              size={12}
                            />
                            {item.escalationReason}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Pill tone={VERIFICATION_TONE[item.verificationMode]}>
                          {item.verificationMode === "MANUAL"
                            ? "Manual only"
                            : item.verificationMode === "PARTIAL"
                              ? "Partly automated"
                              : "Automated"}
                        </Pill>
                      </td>
                      <td className="px-3 py-3 text-[var(--text-secondary)] text-xs">
                        {item.owner?.name || item.owner?.email || (
                          <span className="text-[var(--text-muted)]">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Select
                          disabled={savingId === item.id}
                          onValueChange={(event) =>
                            void updateStatus(item.id, event as ChecklistStatus)
                          }
                          value={item.status}
                        >
                          <SelectTrigger
                            aria-label={`Status for ${item.code}`}
                            className="w-full"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {STATUS_LABELS[status]}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <div className="mt-1.5">
                          <Pill tone={STATUS_TONE[item.status]}>
                            {STATUS_LABELS[item.status]}
                          </Pill>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </DashboardLayout>
  );
}
