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
  AlertTriangle,
  Building2,
  Eye,
  Network,
  Plus,
  ShieldCheck,
  Sigma,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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

interface ScoreComponent {
  awarded: number;
  key: string;
  label: string;
  maxPoints: number;
  rationale: string;
}

interface Assessment {
  band: "LOW" | "MODERATE" | "ELEVATED" | "HIGH";
  components: ScoreComponent[];
  flags: string[];
  score: number;
}

interface Vendor {
  acnRelevant: boolean;
  assessment: Assessment;
  certifications: string[];
  contractEnd: string | null;
  country: string | null;
  criticality: "LEVEL_1" | "LEVEL_2" | "LEVEL_3" | "LEVEL_4";
  dataAccessLevel: string;
  euBased: boolean;
  id: string;
  name: string;
  processLinks: { process: { id: string; name: string } }[];
  serviceProvided: string;
}

const CERTIFICATIONS = [
  "ISO27001",
  "ISO22301",
  "SOC2",
  "CSA-STAR",
  "ISO9001",
  "PCIDSS",
  "TISAX",
];

const CRITICALITY_LABELS = {
  LEVEL_1: "Level 1 — Vital",
  LEVEL_2: "Level 2 — Critical",
  LEVEL_3: "Level 3 — Important",
  LEVEL_4: "Level 4 — Routine",
} as const;

const BAND_TONE = {
  LOW: "success",
  MODERATE: "info",
  ELEVATED: "warning",
  HIGH: "danger",
} as const;

const emptyForm = {
  name: "",
  serviceProvided: "",
  criticality: "LEVEL_3",
  dataAccessLevel: "NONE",
  country: "",
  euBased: false,
  certifications: [] as string[],
  contractEnd: "",
  slaDefined: false,
  auditRights: false,
  securityClauses: false,
  lastAuditAt: "",
  acnRelevant: false,
};

export default function Nis2VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/nis2/vendors", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load suppliers");
      }
      const payload = await response.json();
      setVendors(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suppliers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createVendor = useCallback(async () => {
    setIsSaving(true);
    try {
      setFormError(null);
      const response = await fetch("/api/nis2/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          country: form.country || null,
          contractEnd: form.contractEnd
            ? new Date(form.contractEnd).toISOString()
            : null,
          lastAuditAt: form.lastAuditAt
            ? new Date(form.lastAuditAt).toISOString()
            : null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to add the supplier");
      }

      setIsModalOpen(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to add the supplier"
      );
    } finally {
      setIsSaving(false);
    }
  }, [form, load]);

  const stats = useMemo(() => {
    const critical = vendors.filter(
      (vendor) =>
        vendor.criticality === "LEVEL_1" || vendor.criticality === "LEVEL_2"
    ).length;
    const flagged = vendors.filter(
      (vendor) => vendor.assessment.flags.length > 0
    ).length;
    const averageScore = vendors.length
      ? Math.round(
          vendors.reduce((sum, vendor) => sum + vendor.assessment.score, 0) /
            vendors.length
        )
      : 0;

    return { critical, flagged, averageScore };
  }, [vendors]);

  const toggleCertification = (certification: string) =>
    setForm((current) => ({
      ...current,
      certifications: current.certifications.includes(certification)
        ? current.certifications.filter((entry) => entry !== certification)
        : [...current.certifications, certification],
    }));

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
              Add supplier
            </button>
          }
          badge={
            <>
              <Network size={13} />
              NIS2 Art. 18 · Art. 21(2)(d)
            </>
          }
          description="Art. 18 supplier inventory with a published 100-point scoring formula. Every score is reproducible by hand from the component breakdown."
          stats={[
            {
              label: "Suppliers",
              value: vendors.length,
              trend: { value: "In the inventory", neutral: true },
              icon: Building2,
            },
            {
              label: "Critical",
              value: stats.critical,
              trend: { value: "Level 1 and Level 2", neutral: true },
              icon: ShieldCheck,
            },
            {
              label: "Flagged",
              value: stats.flagged,
              trend: { value: "Carrying risk conditions", neutral: true },
              icon: AlertTriangle,
            },
            {
              label: "Average score",
              value: `${stats.averageScore}/100`,
              trend: { value: "Across the inventory", neutral: true },
              icon: Sigma,
            },
          ]}
          title="Supply Chain Risk"
        />

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-red-600 text-sm dark:text-red-400">
            {error}
          </div>
        )}

        <SectionCard
          description="Select a supplier to see how its score was assembled."
          title="Supplier inventory"
        >
          {vendors.length === 0 ? (
            <EmptyState message="No suppliers recorded yet. Art. 21(2)(d) expects a maintained inventory of direct suppliers and service providers." />
          ) : (
            <div className="space-y-3">
              {vendors.map((vendor) => {
                const isExpanded = expandedId === vendor.id;

                return (
                  <article
                    className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
                    key={vendor.id}
                  >
                    <button
                      aria-expanded={isExpanded}
                      className="w-full text-left"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : vendor.id)
                      }
                      type="button"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-[var(--text-primary)]">
                              {vendor.name}
                            </h3>
                            <Pill
                              tone={
                                vendor.criticality === "LEVEL_1"
                                  ? "danger"
                                  : vendor.criticality === "LEVEL_2"
                                    ? "warning"
                                    : "neutral"
                              }
                            >
                              {CRITICALITY_LABELS[vendor.criticality]}
                            </Pill>
                            {vendor.acnRelevant && (
                              <Pill tone="info">ACN Art. 18</Pill>
                            )}
                            {!vendor.euBased && (
                              <Pill tone="warning">Third country</Pill>
                            )}
                          </div>
                          <p className="mt-1 text-[var(--text-secondary)] text-xs">
                            {vendor.serviceProvided}
                            {vendor.country && ` · ${vendor.country}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 md:w-64">
                          <div className="flex-1">
                            <ProgressBar
                              tone={BAND_TONE[vendor.assessment.band]}
                              value={vendor.assessment.score}
                            />
                          </div>
                          <span className="w-20 shrink-0 text-right font-bold text-[var(--text-primary)] text-sm">
                            {vendor.assessment.score}/100
                          </span>
                        </div>
                      </div>
                    </button>

                    <div className="mt-3 flex justify-end">
                      <Link
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 font-semibold text-[11px] text-[var(--text-secondary)] transition-colors hover:border-blue-500/40 hover:text-blue-500"
                        href={`/vendors/${vendor.id}`}
                      >
                        <Eye size={12} />
                        Open full overview — assets, data, risks, policies
                      </Link>
                    </div>

                    {vendor.assessment.flags.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {vendor.assessment.flags.map((flag) => (
                          <li
                            className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400"
                            key={flag}
                          >
                            <AlertTriangle
                              className="mt-0.5 shrink-0"
                              size={12}
                            />
                            {flag}
                          </li>
                        ))}
                      </ul>
                    )}

                    {isExpanded && (
                      <div className="mt-4 space-y-2 border-[var(--border-color)] border-t pt-4">
                        {vendor.assessment.components.map((component) => (
                          <div
                            className="flex flex-col gap-1"
                            key={component.key}
                          >
                            <div className="flex items-baseline justify-between gap-3 text-xs">
                              <span className="font-medium text-[var(--text-primary)]">
                                {component.label}
                              </span>
                              <span className="font-mono text-[var(--text-secondary)]">
                                {component.awarded}/{component.maxPoints}
                              </span>
                            </div>
                            <ProgressBar
                              tone={
                                component.awarded === 0
                                  ? "danger"
                                  : component.awarded < component.maxPoints / 2
                                    ? "warning"
                                    : "success"
                              }
                              value={
                                (component.awarded / component.maxPoints) * 100
                              }
                            />
                            <p className="text-[11px] text-[var(--text-muted)]">
                              {component.rationale}
                            </p>
                          </div>
                        ))}

                        {vendor.processLinks.length > 0 && (
                          <p className="pt-2 text-[11px] text-[var(--text-muted)]">
                            Supports:{" "}
                            {vendor.processLinks
                              .map((link) => link.process.name)
                              .join(", ")}
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
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
              disabled={
                isSaving ||
                form.name.trim().length < 2 ||
                form.serviceProvided.trim().length < 2
              }
              onClick={() => void createVendor()}
              type="button"
            >
              {isSaving ? "Saving…" : "Add and score"}
            </button>
          </div>
        }
        isOpen={isModalOpen}
        maxWidth="lg"
        onClose={() => setIsModalOpen(false)}
        title="Add a supplier"
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
                value={form.name}
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Service provided
              </span>
              <BoilerplateInput
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] text-sm"
                onChange={(event) =>
                  setForm({ ...form, serviceProvided: event.target.value })
                }
                placeholder="Managed hosting, payroll, SOC…"
                value={form.serviceProvided}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Criticality
              </span>
              <Select
                onValueChange={(event) =>
                  setForm({ ...form, criticality: event })
                }
                value={form.criticality}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(CRITICALITY_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Data access level
              </span>
              <Select
                onValueChange={(event) =>
                  setForm({ ...form, dataAccessLevel: event })
                }
                value={form.dataAccessLevel}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {[
                      "NONE",
                      "PUBLIC",
                      "INTERNAL",
                      "CONFIDENTIAL",
                      "RESTRICTED",
                    ].map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Country
              </span>
              <BoilerplateInput
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text-primary)] text-sm"
                onChange={(event) =>
                  setForm({ ...form, country: event.target.value })
                }
                value={form.country}
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Contract ends
              </span>
              <DatePickerField
                label="Choose contract end date"
                onChange={(contractEnd) => setForm({ ...form, contractEnd })}
                value={form.contractEnd}
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-semibold text-[var(--text-secondary)] text-xs">
                Last assessed
              </span>
              <DatePickerField
                label="Choose last assessed date"
                onChange={(lastAuditAt) => setForm({ ...form, lastAuditAt })}
                value={form.lastAuditAt}
              />
            </label>
          </div>

          <fieldset>
            <legend className="mb-2 font-semibold text-[var(--text-secondary)] text-xs">
              Certifications
            </legend>
            <div className="flex flex-wrap gap-2">
              {CERTIFICATIONS.map((certification) => (
                <button
                  aria-pressed={form.certifications.includes(certification)}
                  className={`rounded-lg border px-2.5 py-1 font-semibold text-[11px] transition-colors ${
                    form.certifications.includes(certification)
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                      : "border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                  }`}
                  key={certification}
                  onClick={() => toggleCertification(certification)}
                  type="button"
                >
                  {certification}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["securityClauses", "Security clauses in contract"],
                ["auditRights", "Contractual audit rights"],
                ["slaDefined", "Defined SLA"],
                ["euBased", "EU / EEA based"],
                ["acnRelevant", "Relevant for ACN Art. 18 (Italy)"],
              ] as const
            ).map(([key, label]) => (
              <label
                className="inline-flex items-center gap-2 text-[var(--text-secondary)] text-sm"
                key={key}
              >
                <BoilerplateCheckbox
                  checked={form[key]}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, [key]: Boolean(checked) })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
