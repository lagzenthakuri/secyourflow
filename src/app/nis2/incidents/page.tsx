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
import { Textarea as BoilerplateTextarea } from "@repo/design-system/components/ui/textarea";
import {
  AlarmClock,
  AlertOctagon,
  BellRing,
  CheckCircle2,
  Download,
  Siren,
  Timer,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  EmptyState,
  formatDuration,
  Pill,
  SectionCard,
} from "@/components/nis2/Nis2Primitives";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { formatDateTime } from "@/lib/utils";

type DeadlineState = "SUBMITTED" | "BREACHED" | "DUE_SOON" | "PENDING";
type Phase =
  | "EARLY_WARNING"
  | "INCIDENT_NOTIFICATION"
  | "FINAL_REPORT"
  | "COMPLETE";

interface PhaseStatus {
  dueAt: string;
  label: string;
  phase: Phase;
  remainingMs: number;
  state: DeadlineState;
  submittedAt: string | null;
  submittedLate: boolean;
}

interface Incident {
  affectedAssets: { asset: { id: string; name: string; type: string } }[];
  crossBorder: boolean;
  description: string;
  detectedAt: string;
  id: string;
  phase: Phase;
  phases: PhaseStatus[];
  reference: string;
  reportedBy?: { name: string | null; email: string } | null;
  severity: string;
  significantImpact: boolean;
  status: string;
  title: string;
}

const STATE_TONE = {
  SUBMITTED: "success",
  BREACHED: "danger",
  DUE_SOON: "warning",
  PENDING: "neutral",
} as const;

const SEVERITY_TONE: Record<string, "danger" | "warning" | "info" | "neutral"> =
  {
    CRITICAL: "danger",
    HIGH: "danger",
    MEDIUM: "warning",
    LOW: "info",
    INFORMATIONAL: "neutral",
  };

const SUBMITTABLE_PHASES: Exclude<Phase, "COMPLETE">[] = [
  "EARLY_WARNING",
  "INCIDENT_NOTIFICATION",
  "FINAL_REPORT",
];

function stateLabel(phase: PhaseStatus): string {
  switch (phase.state) {
    case "SUBMITTED":
      return phase.submittedLate ? "Submitted late" : "Submitted";
    case "BREACHED":
      return `Overdue by ${formatDuration(phase.remainingMs)}`;
    case "DUE_SOON":
      return `Due in ${formatDuration(phase.remainingMs)}`;
    default:
      return `${formatDuration(phase.remainingMs)} remaining`;
  }
}

const emptyForm = {
  title: "",
  description: "",
  severity: "HIGH",
  detectedAt: "",
  crossBorder: false,
  significantImpact: true,
  taxonomy: "",
};

export default function Nis2IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/nis2/incidents", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to load incidents");
      }
      const payload = await response.json();
      setIncidents(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load incidents");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createIncident = useCallback(async () => {
    setIsSaving(true);
    try {
      setFormError(null);
      const response = await fetch("/api/nis2/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          severity: form.severity,
          detectedAt: new Date(form.detectedAt).toISOString(),
          crossBorder: form.crossBorder,
          significantImpact: form.significantImpact,
          taxonomy: form.taxonomy || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to register the incident");
      }

      setIsModalOpen(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to register the incident"
      );
    } finally {
      setIsSaving(false);
    }
  }, [form, load]);

  /** Generates the CSIRT artefact, records the submission, and downloads it. */
  const submitPhase = useCallback(
    async (incident: Incident, phase: Exclude<Phase, "COMPLETE">) => {
      setBusyId(`${incident.id}:${phase}`);
      try {
        setError(null);
        const response = await fetch(
          `/api/nis2/incidents/${incident.id}/submit`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phase, markSubmitted: true }),
          }
        );

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Failed to generate the artefact");
        }

        const payload = await response.json();
        const blob = new Blob([JSON.stringify(payload.data.payload, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${incident.reference}_${phase.toLowerCase()}.json`;
        anchor.click();
        URL.revokeObjectURL(url);

        await load();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to generate the artefact"
        );
      } finally {
        setBusyId(null);
      }
    },
    [load]
  );

  const stats = useMemo(() => {
    const open = incidents.filter(
      (incident) => incident.status !== "CLOSED"
    ).length;
    const breached = incidents.reduce(
      (count, incident) =>
        count +
        incident.phases.filter((phase) => phase.state === "BREACHED").length,
      0
    );
    const dueSoon = incidents.reduce(
      (count, incident) =>
        count +
        incident.phases.filter((phase) => phase.state === "DUE_SOON").length,
      0
    );
    const complete = incidents.filter(
      (incident) => incident.phase === "COMPLETE"
    ).length;

    return { open, breached, dueSoon, complete };
  }, [incidents]);

  const canSubmit =
    form.title.trim().length >= 3 &&
    form.description.trim().length > 0 &&
    form.detectedAt !== "";

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
              <AlertOctagon size={14} />
              Declare incident
            </button>
          }
          badge={
            <>
              <Siren size={13} />
              Directive (EU) 2022/2555 — Art. 23
            </>
          }
          description="Art. 23 lifecycle with the legal deadlines anchored on the moment you became aware. Filing with the national CSIRT remains a manual step — the platform produces the artefact and tracks the clock."
          stats={[
            {
              label: "Open",
              value: stats.open,
              trend: { value: "Not yet closed", neutral: true },
              icon: Siren,
            },
            {
              label: "Breached deadlines",
              value: stats.breached,
              trend: { value: "Past the legal limit", neutral: true },
              icon: AlarmClock,
            },
            {
              label: "Due within 2h",
              value: stats.dueSoon,
              trend: { value: "Imminent obligations", neutral: true },
              icon: BellRing,
            },
            {
              label: "Fully reported",
              value: stats.complete,
              trend: { value: "All three phases filed", neutral: true },
              icon: CheckCircle2,
            },
          ]}
          title="NIS2 Incident Reporting"
        />

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-red-600 text-sm dark:text-red-400">
            {error}
          </div>
        )}

        <SectionCard
          description="Each incident tracks the 24-hour early warning, 72-hour notification, and one-month final report."
          title="Incident register"
        >
          {incidents.length === 0 ? (
            <EmptyState message="No incidents registered. Declare one to start the Art. 23 clock." />
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <article
                  className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
                  key={incident.id}
                >
                  <header className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold font-mono text-[var(--text-primary)] text-xs">
                          {incident.reference}
                        </span>
                        <Pill
                          tone={SEVERITY_TONE[incident.severity] ?? "neutral"}
                        >
                          {incident.severity}
                        </Pill>
                        <Pill
                          tone={
                            incident.status === "CLOSED" ? "success" : "info"
                          }
                        >
                          {incident.status}
                        </Pill>
                        {incident.crossBorder && (
                          <Pill tone="warning">Cross-border</Pill>
                        )}
                      </div>
                      <h3 className="mt-1.5 font-semibold text-[var(--text-primary)]">
                        {incident.title}
                      </h3>
                      <p className="mt-0.5 text-[var(--text-muted)] text-xs">
                        Aware since {formatDateTime(incident.detectedAt)}
                      </p>
                    </div>
                  </header>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {incident.phases.map((phase) => {
                      const busyKey = `${incident.id}:${phase.phase}`;
                      const submittable = SUBMITTABLE_PHASES.includes(
                        phase.phase as Exclude<Phase, "COMPLETE">
                      );

                      return (
                        <div
                          className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-3"
                          key={phase.phase}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-[var(--text-primary)] text-xs">
                              {phase.label}
                            </span>
                            <Timer
                              className="mt-0.5 shrink-0 text-[var(--text-muted)]"
                              size={13}
                            />
                          </div>
                          <div className="mt-2">
                            <Pill tone={STATE_TONE[phase.state]}>
                              {stateLabel(phase)}
                            </Pill>
                          </div>
                          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                            Due {formatDateTime(phase.dueAt)}
                          </p>
                          {submittable && (
                            <button
                              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-medium text-[11px] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-60"
                              disabled={busyId === busyKey}
                              onClick={() =>
                                void submitPhase(
                                  incident,
                                  phase.phase as Exclude<Phase, "COMPLETE">
                                )
                              }
                              type="button"
                            >
                              <Download size={12} />
                              {phase.submittedAt
                                ? "Regenerate"
                                : "Generate & file"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
              disabled={!canSubmit || isSaving}
              onClick={() => void createIncident()}
              type="button"
            >
              {isSaving ? "Registering…" : "Start the 24h clock"}
            </button>
          </div>
        }
        isOpen={isModalOpen}
        maxWidth="lg"
        onClose={() => setIsModalOpen(false)}
        title="Declare a significant incident"
      >
        {formError ? (
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}
        <div className="space-y-4">
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-amber-700 text-xs dark:text-amber-400">
            All three Art. 23 deadlines are anchored on the time you became
            aware of the incident, not the time you register it here.
          </p>

          <label className="block">
            <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
              Title
            </span>
            <BoilerplateInput
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] text-sm"
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              placeholder="Ransomware on the billing cluster"
              value={form.title}
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
              Description
            </span>
            <BoilerplateTextarea
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] text-sm"
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              placeholder="What happened, what is affected, what is known so far."
              rows={4}
              value={form.description}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Became aware at
              </span>
              <DatePickerField
                includeTime
                label="Choose when you became aware"
                onChange={(detectedAt) => setForm({ ...form, detectedAt })}
                value={form.detectedAt}
              />
            </label>

            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Severity
              </span>
              <Select
                onValueChange={(event) => setForm({ ...form, severity: event })}
                value={form.severity}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"].map(
                      (severity) => (
                        <SelectItem key={severity} value={severity}>
                          {severity}
                        </SelectItem>
                      )
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
              Taxonomy (optional)
            </span>
            <BoilerplateInput
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] text-sm"
              onChange={(event) =>
                setForm({ ...form, taxonomy: event.target.value })
              }
              placeholder="Ransomware / Data breach / DDoS"
              value={form.taxonomy}
            />
          </label>

          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-[var(--text-secondary)] text-sm">
              <BoilerplateCheckbox
                checked={form.significantImpact}
                onCheckedChange={(checked) =>
                  setForm({ ...form, significantImpact: Boolean(checked) })
                }
              />
              Significant impact (Art. 23(3))
            </label>
            <label className="inline-flex items-center gap-2 text-[var(--text-secondary)] text-sm">
              <BoilerplateCheckbox
                checked={form.crossBorder}
                onCheckedChange={(checked) =>
                  setForm({ ...form, crossBorder: Boolean(checked) })
                }
              />
              Cross-border impact
            </label>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
