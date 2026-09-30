"use client";
import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert";
import { Checkbox as BoilerplateCheckbox } from "@repo/design-system/components/ui/checkbox";
import { Input as BoilerplateInput } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  Activity,
  AlertTriangle,
  LifeBuoy,
  Plus,
  TimerReset,
  Workflow,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  EmptyState,
  Pill,
  ProgressBar,
  SectionCard,
} from "@/components/nis2/Nis2Primitives";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShieldLoader } from "@/components/ui/ShieldLoader";

type Criticality = "VITAL" | "CRITICAL" | "IMPORTANT" | "SUPPORTING";

interface Gap {
  code: string;
  message: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
}

interface BusinessProcess {
  assetDependencies: { asset: { id: string; name: string } }[];
  bcpDocumented: boolean;
  criticality: Criticality;
  description: string | null;
  drpDocumented: boolean;
  financialImpact: number;
  gaps: Gap[];
  id: string;
  impactScore: number | null;
  lastTestedAt: string | null;
  mtpdHours: number | null;
  name: string;
  operationalImpact: number;
  owner: string | null;
  regulatoryImpact: number;
  reputationalImpact: number;
  rpoHours: number | null;
  rtoHours: number | null;
  safetyImpact: number;
  vendorDependencies: { vendor: { id: string; name: string } }[];
}

interface BiaSummary {
  averageImpactScore: number;
  critical: number;
  gapsBySeverity: { CRITICAL: number; HIGH: number; MEDIUM: number };
  processesAtRisk: number;
  totalProcesses: number;
  untested: number;
  vital: number;
  withoutBcp: number;
  withoutDrp: number;
}

const CRITICALITY_TONE = {
  VITAL: "danger",
  CRITICAL: "warning",
  IMPORTANT: "info",
  SUPPORTING: "neutral",
} as const;

const GAP_TONE = {
  CRITICAL: "danger",
  HIGH: "warning",
  MEDIUM: "neutral",
} as const;

const IMPACT_FIELDS = [
  ["financialImpact", "Financial"],
  ["operationalImpact", "Operational"],
  ["reputationalImpact", "Reputational"],
  ["regulatoryImpact", "Regulatory"],
  ["safetyImpact", "Safety"],
] as const;

const emptyForm = {
  name: "",
  description: "",
  owner: "",
  criticality: "IMPORTANT" as Criticality,
  rtoHours: "",
  rpoHours: "",
  mtpdHours: "",
  financialImpact: 1,
  operationalImpact: 1,
  reputationalImpact: 1,
  regulatoryImpact: 1,
  safetyImpact: 1,
  bcpDocumented: false,
  drpDocumented: false,
  lastTestedAt: "",
};

function optionalInt(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function Nis2BiaPage() {
  const [processes, setProcesses] = useState<BusinessProcess[]>([]);
  const [summary, setSummary] = useState<BiaSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/nis2/bia", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load the business impact analysis");
      }
      const payload = await response.json();
      setProcesses(payload.data ?? []);
      setSummary(payload.summary ?? null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load the business impact analysis"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createProcess = useCallback(async () => {
    setIsSaving(true);
    try {
      setFormError(null);
      const response = await fetch("/api/nis2/bia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          owner: form.owner || null,
          criticality: form.criticality,
          rtoHours: optionalInt(form.rtoHours),
          rpoHours: optionalInt(form.rpoHours),
          mtpdHours: optionalInt(form.mtpdHours),
          financialImpact: form.financialImpact,
          operationalImpact: form.operationalImpact,
          reputationalImpact: form.reputationalImpact,
          regulatoryImpact: form.regulatoryImpact,
          safetyImpact: form.safetyImpact,
          bcpDocumented: form.bcpDocumented,
          drpDocumented: form.drpDocumented,
          lastTestedAt: form.lastTestedAt
            ? new Date(form.lastTestedAt).toISOString()
            : null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to add the process");
      }

      setIsModalOpen(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to add the process"
      );
    } finally {
      setIsSaving(false);
    }
  }, [form, load]);

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
              Add process
            </button>
          }
          badge={
            <>
              <LifeBuoy size={13} />
              NIS2 Art. 21(2)(c) — Business continuity
            </>
          }
          description="Art. 21(2)(c) continuity evidence: recovery objectives per process, five-dimension impact scoring, and the gaps an auditor will ask about."
          stats={[
            {
              label: "Processes",
              value: summary?.totalProcesses ?? 0,
              trend: { value: "In the inventory", neutral: true },
              icon: Workflow,
            },
            {
              label: "Vital / Critical",
              value: `${summary?.vital ?? 0} / ${summary?.critical ?? 0}`,
              trend: { value: "Highest tiers", neutral: true },
              icon: Activity,
            },
            {
              label: "Critical gaps",
              value: summary?.gapsBySeverity.CRITICAL ?? 0,
              trend: { value: "Blocking findings", neutral: true },
              icon: AlertTriangle,
            },
            {
              label: "Never tested",
              value: summary?.untested ?? 0,
              trend: { value: "No recorded exercise", neutral: true },
              icon: TimerReset,
            },
            {
              label: "Average impact",
              value: `${summary?.averageImpactScore ?? 0}/100`,
              trend: { value: "Weighted across dimensions", neutral: true },
              icon: LifeBuoy,
            },
          ]}
          title="Business Impact Analysis"
        />

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-red-600 text-sm dark:text-red-400">
            {error}
          </div>
        )}

        <SectionCard
          description="Recovery objectives must satisfy RTO < MTPD; anything else means recovery finishes after the process is already unviable."
          title="Process inventory"
        >
          {processes.length === 0 ? (
            <EmptyState message="No business processes recorded. The BIA is the evidence base for Art. 21(2)(c)." />
          ) : (
            <div className="space-y-3">
              {processes.map((process) => (
                <article
                  className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
                  key={process.id}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-[var(--text-primary)]">
                          {process.name}
                        </h3>
                        <Pill tone={CRITICALITY_TONE[process.criticality]}>
                          {process.criticality}
                        </Pill>
                        {process.bcpDocumented && (
                          <Pill tone="success">BCP</Pill>
                        )}
                        {process.drpDocumented && (
                          <Pill tone="success">DRP</Pill>
                        )}
                      </div>
                      {process.owner && (
                        <p className="mt-1 text-[var(--text-muted)] text-xs">
                          Owner: {process.owner}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 md:w-56">
                      <div className="flex-1">
                        <ProgressBar
                          tone={
                            (process.impactScore ?? 0) >= 70
                              ? "danger"
                              : (process.impactScore ?? 0) >= 40
                                ? "warning"
                                : "success"
                          }
                          value={process.impactScore ?? 0}
                        />
                      </div>
                      <span className="w-16 shrink-0 text-right font-bold text-[var(--text-primary)] text-sm">
                        {process.impactScore ?? 0}
                      </span>
                    </div>
                  </div>

                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
                    {(
                      [
                        ["RTO", process.rtoHours],
                        ["RPO", process.rpoHours],
                        ["MTPD", process.mtpdHours],
                      ] as const
                    ).map(([label, value]) => (
                      <div className="flex items-baseline gap-1.5" key={label}>
                        <dt className="font-semibold text-[var(--text-muted)]">
                          {label}
                        </dt>
                        <dd className="text-[var(--text-primary)]">
                          {value === null ? "—" : `${value}h`}
                        </dd>
                      </div>
                    ))}
                    {(process.assetDependencies.length > 0 ||
                      process.vendorDependencies.length > 0) && (
                      <div className="flex items-baseline gap-1.5">
                        <dt className="font-semibold text-[var(--text-muted)]">
                          Depends on
                        </dt>
                        <dd className="text-[var(--text-primary)]">
                          {process.assetDependencies.length} assets,{" "}
                          {process.vendorDependencies.length} suppliers
                        </dd>
                      </div>
                    )}
                  </dl>

                  {process.gaps.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {process.gaps.map((gap) => (
                        <li key={gap.code}>
                          <Pill tone={GAP_TONE[gap.severity]}>
                            {gap.message}
                          </Pill>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
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
              disabled={isSaving || form.name.trim().length < 2}
              onClick={() => void createProcess()}
              type="button"
            >
              {isSaving ? "Saving…" : "Add process"}
            </button>
          </div>
        }
        isOpen={isModalOpen}
        maxWidth="lg"
        onClose={() => setIsModalOpen(false)}
        title="Add a business process"
      >
        {formError ? (
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Name
              </span>
              <BoilerplateInput
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] text-sm"
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Customer payment processing"
                value={form.name}
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
                value={form.owner}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Criticality
              </span>
              <Select
                onValueChange={(event) =>
                  setForm({ ...form, criticality: event as Criticality })
                }
                value={form.criticality}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {["VITAL", "CRITICAL", "IMPORTANT", "SUPPORTING"].map(
                      (value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      )
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
            {(
              [
                ["rtoHours", "RTO (h)"],
                ["rpoHours", "RPO (h)"],
                ["mtpdHours", "MTPD (h)"],
              ] as const
            ).map(([key, label]) => (
              <label className="block" key={key}>
                <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                  {label}
                </span>
                <BoilerplateInput
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] text-sm"
                  min={0}
                  onChange={(event) =>
                    setForm({ ...form, [key]: event.target.value })
                  }
                  type="number"
                  value={form[key]}
                />
              </label>
            ))}
          </div>

          <fieldset>
            <legend className="mb-2 font-semibold text-[var(--text-secondary)] text-xs">
              Impact rating (1 negligible — 5 catastrophic)
            </legend>
            <div className="space-y-2">
              {IMPACT_FIELDS.map(([key, label]) => (
                <div className="flex items-center gap-3" key={key}>
                  <span className="w-28 shrink-0 text-[var(--text-secondary)] text-xs">
                    {label}
                  </span>
                  <BoilerplateInput
                    aria-label={`${label} impact`}
                    className="flex-1"
                    max={5}
                    min={1}
                    onChange={(event) =>
                      setForm({ ...form, [key]: Number(event.target.value) })
                    }
                    type="range"
                    value={form[key]}
                  />
                  <span className="w-6 text-right font-bold text-[var(--text-primary)] text-sm">
                    {form[key]}
                  </span>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center gap-2 text-[var(--text-secondary)] text-sm">
                <BoilerplateCheckbox
                  checked={form.bcpDocumented}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, bcpDocumented: Boolean(checked) })
                  }
                />
                BCP documented
              </label>
              <label className="inline-flex items-center gap-2 text-[var(--text-secondary)] text-sm">
                <BoilerplateCheckbox
                  checked={form.drpDocumented}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, drpDocumented: Boolean(checked) })
                  }
                />
                DRP documented
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Last continuity test
              </span>
              <DatePickerField
                label="Choose continuity test date"
                onChange={(lastTestedAt) => setForm({ ...form, lastTestedAt })}
                value={form.lastTestedAt}
              />
            </label>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
