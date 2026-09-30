"use client";
import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert";
import { Input as BoilerplateInput } from "@repo/design-system/components/ui/input";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea as BoilerplateTextarea } from "@repo/design-system/components/ui/textarea";
import {
  ClipboardList,
  Eye,
  Plus,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type PolicyStatus,
  PolicyStatusPill,
  RelationshipTable,
} from "@/components/grc/GrcPrimitives";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  EmptyState,
  Pill,
  SectionCard,
} from "@/components/nis2/Nis2Primitives";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShieldLoader } from "@/components/ui/ShieldLoader";

interface PolicyListRow {
  allowedTransitions: PolicyStatus[];
  counts: {
    risks: number;
    assets: number;
    vendors: number;
    data: number;
    controls: number;
  };
  description: string | null;
  id: string;
  lastReview: string | null;
  nextReview: string | null;
  owner: string | null;
  reviewState: "UNSCHEDULED" | "CURRENT" | "DUE_SOON" | "OVERDUE";
  status: PolicyStatus;
  title: string;
  type: string | null;
  version: string;
}

const POLICY_TYPES = ["POLICY", "STANDARD", "PROCEDURE", "GUIDELINE"];

/** Human action labels for the lifecycle moves the API allows. */
const TRANSITION_LABELS: Record<string, string> = {
  DRAFT: "Save as draft",
  UNDER_REVIEW: "Submit for review",
  ACTIVE: "Approve",
  ARCHIVED: "Retire",
};

const REVIEW_TONE: Record<
  PolicyListRow["reviewState"],
  "neutral" | "success" | "warning" | "danger"
> = {
  UNSCHEDULED: "neutral",
  CURRENT: "success",
  DUE_SOON: "warning",
  OVERDUE: "danger",
};

const REVIEW_LABEL: Record<PolicyListRow["reviewState"], string> = {
  UNSCHEDULED: "No review scheduled",
  CURRENT: "Review current",
  DUE_SOON: "Review due soon",
  OVERDUE: "Review overdue",
};

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const emptyForm = {
  title: "",
  type: "POLICY",
  version: "1.0",
  owner: "",
  description: "",
  nextReview: "",
};

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyListRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [statusFilter, setStatusFilter] = useState<PolicyStatus | "ALL">("ALL");

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/policies", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load policies");
      }
      const payload = await response.json();
      setPolicies(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load policies");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createPolicy = useCallback(async () => {
    setIsSaving(true);
    try {
      setFormError(null);
      const response = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          version: form.version,
          owner: form.owner || null,
          description: form.description || null,
          nextReview: form.nextReview
            ? new Date(form.nextReview).toISOString()
            : null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to create the policy");
      }
      setIsModalOpen(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create the policy"
      );
    } finally {
      setIsSaving(false);
    }
  }, [form, load]);

  const transition = useCallback(
    async (policy: PolicyListRow, status: PolicyStatus) => {
      try {
        setError(null);
        const response = await fetch(`/api/policies/${policy.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error ?? "Status change failed");
        }
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Status change failed");
      }
    },
    [load]
  );

  const stats = useMemo(() => {
    const active = policies.filter(
      (policy) => policy.status === "ACTIVE"
    ).length;
    const inReview = policies.filter(
      (policy) => policy.status === "UNDER_REVIEW"
    ).length;
    const dueSoon = policies.filter(
      (policy) =>
        policy.reviewState === "OVERDUE" || policy.reviewState === "DUE_SOON"
    ).length;
    const linked = policies.reduce(
      (sum, policy) =>
        sum +
        policy.counts.risks +
        policy.counts.assets +
        policy.counts.vendors +
        policy.counts.data +
        policy.counts.controls,
      0
    );
    return { active, inReview, dueSoon, linked };
  }, [policies]);

  const visiblePolicies = useMemo(
    () =>
      statusFilter === "ALL"
        ? policies
        : policies.filter((policy) => policy.status === statusFilter),
    [policies, statusFilter]
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
              className="btn btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
              onClick={() => {
                setFormError(null);
                setIsModalOpen(true);
              }}
              type="button"
            >
              <Plus size={14} />
              New policy
            </button>
          }
          badge={
            <>
              <ScrollText size={13} />
              Draft → Review → Approved → Retired
            </>
          }
          description="Draft, review, approve and retire the documents that govern risks, assets, vendors, data and controls."
          stats={[
            {
              label: "Approved",
              value: stats.active,
              trend: { value: "In force", neutral: true },
              icon: ShieldCheck,
            },
            {
              label: "In review",
              value: stats.inReview,
              trend: { value: "Awaiting approval", neutral: true },
              icon: ScrollText,
            },
            {
              label: "Reviews due",
              value: stats.dueSoon,
              trend: { value: "Due or overdue", neutral: true },
              icon: ClipboardList,
            },
            {
              label: "Connections",
              value: stats.linked,
              trend: {
                value: "Risks, assets, vendors, data, controls",
                neutral: true,
              },
              icon: ClipboardList,
            },
          ]}
          title="Policies"
        />

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-red-600 text-sm dark:text-red-400">
            {error}
          </div>
        )}

        <SectionCard
          actions={
            <div className="flex flex-wrap gap-1.5">
              {(
                ["ALL", "DRAFT", "UNDER_REVIEW", "ACTIVE", "ARCHIVED"] as const
              ).map((filter) => (
                <button
                  className={`rounded-lg border px-2.5 py-1 font-semibold text-[11px] transition-colors ${
                    statusFilter === filter
                      ? "border-blue-500/50 bg-blue-500/10 text-blue-500"
                      : "border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                  }`}
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  type="button"
                >
                  {filter === "ALL"
                    ? "All"
                    : titleCase(filter.replace("_", " "))}
                </button>
              ))}
            </div>
          }
          description="Move a policy through its lifecycle, or open it to link risks, assets, vendors, data and controls."
          title="Policy register"
        >
          {visiblePolicies.length === 0 ? (
            <EmptyState message="No policies yet. Create your first policy, then link it to the risks, assets, vendors, data and controls it governs." />
          ) : (
            <RelationshipTable<PolicyListRow>
              columns={[
                {
                  key: "title",
                  label: "Policy",
                  render: (policy) => (
                    <div className="min-w-[240px]">
                      <Link
                        className="font-semibold text-[var(--text-primary)] hover:text-blue-500"
                        href={`/policies/${policy.id}`}
                      >
                        {policy.title}
                      </Link>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {`${policy.type ?? "POLICY"} · v${policy.version}`}
                        {policy.owner ? ` · ${policy.owner}` : ""}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (policy) => (
                    <PolicyStatusPill status={policy.status} />
                  ),
                },
                {
                  key: "links",
                  label: "Applies to",
                  render: (policy) => (
                    <div className="flex flex-wrap gap-1.5">
                      <Pill tone="info">{policy.counts.risks} risks</Pill>
                      <Pill tone="info">{policy.counts.assets} assets</Pill>
                      <Pill tone="info">{policy.counts.vendors} vendors</Pill>
                      <Pill tone="info">{policy.counts.data} data</Pill>
                      <Pill tone="info">{policy.counts.controls} controls</Pill>
                    </div>
                  ),
                },
                {
                  key: "review",
                  label: "Review",
                  render: (policy) => (
                    <div className="flex flex-col items-start gap-1">
                      <Pill tone={REVIEW_TONE[policy.reviewState]}>
                        {REVIEW_LABEL[policy.reviewState]}
                      </Pill>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {policy.nextReview
                          ? new Date(policy.nextReview).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                  ),
                },
                {
                  key: "actions",
                  label: "Actions",
                  align: "right",
                  render: (policy) => (
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 font-semibold text-[var(--text-secondary)] text-xs hover:border-blue-500/40 hover:text-blue-500"
                        href={`/policies/${policy.id}`}
                      >
                        <Eye size={13} />
                        Open
                      </Link>
                      {policy.allowedTransitions.slice(0, 2).map((target) => (
                        <button
                          className="rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 font-semibold text-[var(--text-secondary)] text-xs transition-colors hover:border-blue-500/40 hover:text-blue-500"
                          key={target}
                          onClick={() => void transition(policy, target)}
                          type="button"
                        >
                          {TRANSITION_LABELS[target] ??
                            titleCase(target.replace("_", " "))}
                        </button>
                      ))}
                    </div>
                  ),
                },
              ]}
              keyOf={(policy) => policy.id}
              rows={visiblePolicies}
            />
          )}
        </SectionCard>
      </div>

      <Modal
        footer={
          <div className="flex justify-end gap-2">
            <button
              className="rounded-xl border border-[var(--border-color)] px-4 py-2 font-medium text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-tertiary)]"
              onClick={() => setIsModalOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="btn btn-primary rounded-xl px-4 py-2 font-semibold text-sm disabled:opacity-60"
              disabled={isSaving || form.title.trim().length < 2}
              onClick={() => void createPolicy()}
              type="button"
            >
              {isSaving ? "Saving…" : "Create draft"}
            </button>
          </div>
        }
        isOpen={isModalOpen}
        maxWidth="lg"
        onClose={() => setIsModalOpen(false)}
        title="New policy"
      >
        {formError ? (
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
              Title
            </span>
            <BoilerplateInput
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] text-sm"
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              placeholder="Access Control Policy"
              value={form.title}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Type
              </span>
              <Select
                onValueChange={(event) => setForm({ ...form, type: event })}
                value={form.type}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {POLICY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Version
              </span>
              <BoilerplateInput
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] text-sm"
                onChange={(event) =>
                  setForm({ ...form, version: event.target.value })
                }
                value={form.version}
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Owner
              </span>
              <BoilerplateInput
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] text-sm"
                onChange={(event) =>
                  setForm({ ...form, owner: event.target.value })
                }
                placeholder="CISO office"
                value={form.owner}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
              Description
            </span>
            <BoilerplateTextarea
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] text-sm"
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              rows={4}
              value={form.description}
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
              Next review
            </span>
            <DatePickerField
              label="Choose next review date"
              onChange={(nextReview) => setForm({ ...form, nextReview })}
              value={form.nextReview}
            />
          </label>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
