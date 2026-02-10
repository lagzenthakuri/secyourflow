"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Modal } from "@/components/ui/Modal";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { cn } from "@/lib/utils";
import { Calendar, CheckCircle2, Paperclip, Plus, RefreshCw } from "lucide-react";

type RemediationStatus = "DRAFT" | "ACTIVE" | "BLOCKED" | "COMPLETED" | "ARCHIVED";

interface RemediationPlanRecord {
  id: string;
  name: string;
  description?: string | null;
  status: RemediationStatus;
  dueDate?: string | null;
  createdAt: string;
  owner?: { id: string; name?: string | null; email?: string | null } | null;
  vulnerabilities: Array<{
    vulnerability: {
      id: string;
      title: string;
      severity: string;
      workflowState: string;
      slaDueAt?: string | null;
    };
  }>;
  _count?: {
    evidence?: number;
    notes?: number;
    vulnerabilities?: number;
  };
}

const statusOptions: RemediationStatus[] = [
  "DRAFT",
  "ACTIVE",
  "BLOCKED",
  "COMPLETED",
  "ARCHIVED",
];

const statusTone: Record<RemediationStatus, string> = {
  DRAFT: "border-slate-400/35 bg-slate-500/10 text-slate-200",
  ACTIVE: "border-sky-400/35 bg-sky-500/10 text-sky-200",
  BLOCKED: "border-red-400/35 bg-red-500/10 text-red-200",
  COMPLETED: "border-emerald-400/35 bg-emerald-500/10 text-emerald-200",
  ARCHIVED: "border-purple-400/35 bg-purple-500/10 text-purple-200",
};

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function calculateProgress(plan: RemediationPlanRecord) {
  const total = plan.vulnerabilities.length;
  if (total === 0) {
    return 0;
  }
  const closed = plan.vulnerabilities.filter((item) =>
    ["RESOLVED", "CLOSED"].includes(item.vulnerability.workflowState),
  ).length;
  return Math.round((closed / total) * 100);
}

function toBase64Utf8(value: string) {
  if (!value) return "";
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export default function RemediationPlansPage() {
  const [plans, setPlans] = useState<RemediationPlanRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<RemediationPlanRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    dueDate: "",
    status: "DRAFT" as RemediationStatus,
    vulnerabilityIds: "",
  });

  const [evidenceForm, setEvidenceForm] = useState({
    title: "",
    fileName: "",
    mimeType: "text/plain",
    notes: "",
    content: "",
  });

  const fetchPlans = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      setError(null);
      const response = await fetch("/api/remediation-plans", { cache: "no-store" });
      const payload = (await response.json()) as { data?: RemediationPlanRecord[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load remediation plans");
      }
      setPlans(payload.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load remediation plans");
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchPlans();
  }, [fetchPlans]);

  const handleCreate = useCallback(async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch("/api/remediation-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description || undefined,
          status: createForm.status,
          dueDate: createForm.dueDate ? new Date(createForm.dueDate).toISOString() : undefined,
          vulnerabilityIds: createForm.vulnerabilityIds
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean),
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to create remediation plan");
      }

      setIsCreateOpen(false);
      setCreateForm({
        name: "",
        description: "",
        dueDate: "",
        status: "DRAFT",
        vulnerabilityIds: "",
      });
      await fetchPlans({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create remediation plan");
    } finally {
      setIsSubmitting(false);
    }
  }, [createForm, fetchPlans]);

  const updatePlanStatus = useCallback(
    async (id: string, status: RemediationStatus) => {
      try {
        setError(null);
        const response = await fetch(`/api/remediation-plans/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });

        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to update remediation plan");
        }

        await fetchPlans({ silent: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update remediation plan");
      }
    },
    [fetchPlans],
  );

  const submitEvidence = useCallback(async () => {
    if (!selectedPlan) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/remediation-plans/${selectedPlan.id}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: evidenceForm.title,
          fileName: evidenceForm.fileName || `${Date.now()}-evidence.txt`,
          mimeType: evidenceForm.mimeType,
          notes: evidenceForm.notes || undefined,
          contentBase64: evidenceForm.content ? toBase64Utf8(evidenceForm.content) : undefined,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to upload evidence");
      }

      setIsEvidenceOpen(false);
      setSelectedPlan(null);
      setEvidenceForm({
        title: "",
        fileName: "",
        mimeType: "text/plain",
        notes: "",
        content: "",
      });
      await fetchPlans({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload evidence");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedPlan, evidenceForm, fetchPlans]);

  const summary = useMemo(() => {
    const completed = plans.filter((plan) => plan.status === "COMPLETED").length;
    const active = plans.filter((plan) => plan.status === "ACTIVE").length;
    const blocked = plans.filter((plan) => plan.status === "BLOCKED").length;
    return { completed, active, blocked };
  }, [plans]);

  if (isLoading && plans.length === 0) {
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
        <section className="rounded-3xl border border-white/10 bg-[linear-gradient(132deg,rgba(56,189,248,0.2),rgba(18,18,26,0.9)_44%,rgba(18,18,26,0.96))] p-6 sm:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white sm:text-3xl">Remediation Plans</h1>
              <p className="mt-2 text-sm text-slate-200">
                Track plan ownership, linked vulnerabilities, evidence, and completion progress.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-100">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  {plans.length} plans
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  {summary.active} active
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  {summary.blocked} blocked
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void fetchPlans({ silent: true })}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
              >
                <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
              >
                <Plus size={14} />
                New Plan
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Completed", value: summary.completed, tone: "text-emerald-200" },
            { label: "Active", value: summary.active, tone: "text-sky-200" },
            { label: "Blocked", value: summary.blocked, tone: "text-red-200" },
          ].map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-4"
            >
              <p className="text-sm text-slate-400">{item.label}</p>
              <p className={cn("mt-2 text-2xl font-semibold", item.tone)}>{item.value}</p>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)]">
          <header className="border-b border-white/10 px-5 py-4">
            <h2 className="text-base font-semibold text-white">Plan Tracker</h2>
          </header>

          {plans.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-slate-500" />
              <p className="mt-3 text-sm text-slate-400">No remediation plans yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {plans.map((plan) => {
                const progress = calculateProgress(plan);
                return (
                  <div key={plan.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-white">{plan.name}</p>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[11px]",
                              statusTone[plan.status],
                            )}
                          >
                            {formatLabel(plan.status)}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-300">
                            {progress}% complete
                          </span>
                        </div>
                        {plan.description ? (
                          <p className="mt-1 text-xs text-slate-400">{plan.description}</p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span>
                            Owner {plan.owner?.name || plan.owner?.email || "Unassigned"}
                          </span>
                          <span>{plan.vulnerabilities.length} linked vulnerabilities</span>
                          <span>{plan._count?.evidence || 0} evidence items</span>
                          {plan.dueDate ? (
                            <span className="inline-flex items-center gap-1">
                              <Calendar size={12} />
                              Due {new Date(plan.dueDate).toLocaleDateString()}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={plan.status}
                          onChange={(event) =>
                            void updatePlanStatus(plan.id, event.target.value as RemediationStatus)
                          }
                          className="input h-9 w-[130px] text-xs"
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {formatLabel(status)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPlan(plan);
                            setIsEvidenceOpen(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/[0.08]"
                        >
                          <Paperclip size={12} />
                          Add Evidence
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Remediation Plan"
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => void handleCreate()}
              disabled={!createForm.name.trim() || isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Plan"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-white">Plan Name</label>
            <input
              className="input"
              value={createForm.name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white">Description</label>
            <textarea
              className="input min-h-[96px]"
              value={createForm.description}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-white">Status</label>
              <select
                className="input"
                value={createForm.status}
                onChange={(event) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    status: event.target.value as RemediationStatus,
                  }))
                }
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {formatLabel(status)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-white">Due Date</label>
              <input
                type="datetime-local"
                className="input"
                value={createForm.dueDate}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, dueDate: event.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-white">Vulnerability IDs (comma separated)</label>
            <input
              className="input"
              placeholder="vuln-id-1,vuln-id-2"
              value={createForm.vulnerabilityIds}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, vulnerabilityIds: event.target.value }))
              }
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEvidenceOpen}
        onClose={() => setIsEvidenceOpen(false)}
        title="Attach Evidence"
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn btn-secondary" onClick={() => setIsEvidenceOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => void submitEvidence()}
              disabled={!evidenceForm.title.trim() || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Add Evidence"}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Plan: {selectedPlan?.name || "N/A"} ({selectedPlan?.id || "no id"})
          </p>
          <div>
            <label className="mb-1 block text-sm text-white">Title</label>
            <input
              className="input"
              value={evidenceForm.title}
              onChange={(event) =>
                setEvidenceForm((prev) => ({ ...prev, title: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-white">File Name</label>
              <input
                className="input"
                value={evidenceForm.fileName}
                onChange={(event) =>
                  setEvidenceForm((prev) => ({ ...prev, fileName: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white">MIME Type</label>
              <input
                className="input"
                value={evidenceForm.mimeType}
                onChange={(event) =>
                  setEvidenceForm((prev) => ({ ...prev, mimeType: event.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-white">Notes</label>
            <textarea
              className="input min-h-[84px]"
              value={evidenceForm.notes}
              onChange={(event) =>
                setEvidenceForm((prev) => ({ ...prev, notes: event.target.value }))
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white">Content (text)</label>
            <textarea
              className="input min-h-[120px] font-mono text-xs"
              placeholder="Paste command output, evidence notes, or log excerpt"
              value={evidenceForm.content}
              onChange={(event) =>
                setEvidenceForm((prev) => ({ ...prev, content: event.target.value }))
              }
            />
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
