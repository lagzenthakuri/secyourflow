"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Pill, ProgressBar, SectionCard } from "@/components/nis2/Nis2Primitives";
import { AlertTriangle, Building2, Network, Plus, ShieldCheck, Sigma } from "lucide-react";

interface ScoreComponent {
    key: string;
    label: string;
    maxPoints: number;
    awarded: number;
    rationale: string;
}

interface Assessment {
    score: number;
    band: "LOW" | "MODERATE" | "ELEVATED" | "HIGH";
    components: ScoreComponent[];
    flags: string[];
}

interface Vendor {
    id: string;
    name: string;
    serviceProvided: string;
    criticality: "LEVEL_1" | "LEVEL_2" | "LEVEL_3" | "LEVEL_4";
    dataAccessLevel: string;
    country: string | null;
    euBased: boolean;
    certifications: string[];
    acnRelevant: boolean;
    contractEnd: string | null;
    assessment: Assessment;
    processLinks: { process: { id: string; name: string } }[];
}

const CERTIFICATIONS = ["ISO27001", "ISO22301", "SOC2", "CSA-STAR", "ISO9001", "PCIDSS", "TISAX"];

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
            setError(null);
            const response = await fetch("/api/nis2/vendors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    country: form.country || null,
                    contractEnd: form.contractEnd ? new Date(form.contractEnd).toISOString() : null,
                    lastAuditAt: form.lastAuditAt ? new Date(form.lastAuditAt).toISOString() : null,
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
            setError(err instanceof Error ? err.message : "Failed to add the supplier");
        } finally {
            setIsSaving(false);
        }
    }, [form, load]);

    const stats = useMemo(() => {
        const critical = vendors.filter(
            (vendor) => vendor.criticality === "LEVEL_1" || vendor.criticality === "LEVEL_2",
        ).length;
        const flagged = vendors.filter((vendor) => vendor.assessment.flags.length > 0).length;
        const averageScore = vendors.length
            ? Math.round(vendors.reduce((sum, vendor) => sum + vendor.assessment.score, 0) / vendors.length)
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
                    title="Supply Chain Risk"
                    description="Art. 18 supplier inventory with a published 100-point scoring formula. Every score is reproducible by hand from the component breakdown."
                    badge={
                        <>
                            <Network size={13} />
                            NIS2 Art. 18 · Art. 21(2)(d)
                        </>
                    }
                    actions={
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="btn btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                        >
                            <Plus size={14} />
                            Add supplier
                        </button>
                    }
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
                />

                {error && (
                    <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}

                <SectionCard
                    title="Supplier inventory"
                    description="Select a supplier to see how its score was assembled."
                >
                    {vendors.length === 0 ? (
                        <EmptyState message="No suppliers recorded yet. Art. 21(2)(d) expects a maintained inventory of direct suppliers and service providers." />
                    ) : (
                        <div className="space-y-3">
                            {vendors.map((vendor) => {
                                const isExpanded = expandedId === vendor.id;

                                return (
                                    <article
                                        key={vendor.id}
                                        className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setExpandedId(isExpanded ? null : vendor.id)}
                                            aria-expanded={isExpanded}
                                            className="w-full text-left"
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
                                                        {vendor.acnRelevant && <Pill tone="info">ACN Art. 18</Pill>}
                                                        {!vendor.euBased && <Pill tone="warning">Third country</Pill>}
                                                    </div>
                                                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                                        {vendor.serviceProvided}
                                                        {vendor.country && ` · ${vendor.country}`}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-3 md:w-64">
                                                    <div className="flex-1">
                                                        <ProgressBar
                                                            value={vendor.assessment.score}
                                                            tone={BAND_TONE[vendor.assessment.band]}
                                                        />
                                                    </div>
                                                    <span className="w-20 shrink-0 text-right text-sm font-bold text-[var(--text-primary)]">
                                                        {vendor.assessment.score}/100
                                                    </span>
                                                </div>
                                            </div>
                                        </button>

                                        {vendor.assessment.flags.length > 0 && (
                                            <ul className="mt-3 space-y-1">
                                                {vendor.assessment.flags.map((flag) => (
                                                    <li
                                                        key={flag}
                                                        className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400"
                                                    >
                                                        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                                        {flag}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        {isExpanded && (
                                            <div className="mt-4 space-y-2 border-t border-[var(--border-color)] pt-4">
                                                {vendor.assessment.components.map((component) => (
                                                    <div key={component.key} className="flex flex-col gap-1">
                                                        <div className="flex items-baseline justify-between gap-3 text-xs">
                                                            <span className="font-medium text-[var(--text-primary)]">
                                                                {component.label}
                                                            </span>
                                                            <span className="font-mono text-[var(--text-secondary)]">
                                                                {component.awarded}/{component.maxPoints}
                                                            </span>
                                                        </div>
                                                        <ProgressBar
                                                            value={(component.awarded / component.maxPoints) * 100}
                                                            tone={
                                                                component.awarded === 0
                                                                    ? "danger"
                                                                    : component.awarded < component.maxPoints / 2
                                                                      ? "warning"
                                                                      : "success"
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
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Add a supplier"
                maxWidth="lg"
                footer={
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="rounded-xl border border-[var(--border-color)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={
                                isSaving ||
                                form.name.trim().length < 2 ||
                                form.serviceProvided.trim().length < 2
                            }
                            onClick={() => void createVendor()}
                            className="btn btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
                        >
                            {isSaving ? "Saving…" : "Add and score"}
                        </button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Name</span>
                            <input
                                value={form.name}
                                onChange={(event) => setForm({ ...form, name: event.target.value })}
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                            />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                                Service provided
                            </span>
                            <input
                                value={form.serviceProvided}
                                onChange={(event) => setForm({ ...form, serviceProvided: event.target.value })}
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                                placeholder="Managed hosting, payroll, SOC…"
                            />
                        </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                                Criticality
                            </span>
                            <select
                                value={form.criticality}
                                onChange={(event) => setForm({ ...form, criticality: event.target.value })}
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                            >
                                {Object.entries(CRITICALITY_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                                Data access level
                            </span>
                            <select
                                value={form.dataAccessLevel}
                                onChange={(event) => setForm({ ...form, dataAccessLevel: event.target.value })}
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                            >
                                {["NONE", "PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"].map((level) => (
                                    <option key={level} value={level}>
                                        {level}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                                Country
                            </span>
                            <input
                                value={form.country}
                                onChange={(event) => setForm({ ...form, country: event.target.value })}
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                            />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                                Contract ends
                            </span>
                            <input
                                type="date"
                                value={form.contractEnd}
                                onChange={(event) => setForm({ ...form, contractEnd: event.target.value })}
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                            />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                                Last assessed
                            </span>
                            <input
                                type="date"
                                value={form.lastAuditAt}
                                onChange={(event) => setForm({ ...form, lastAuditAt: event.target.value })}
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                            />
                        </label>
                    </div>

                    <fieldset>
                        <legend className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">
                            Certifications
                        </legend>
                        <div className="flex flex-wrap gap-2">
                            {CERTIFICATIONS.map((certification) => (
                                <button
                                    key={certification}
                                    type="button"
                                    onClick={() => toggleCertification(certification)}
                                    aria-pressed={form.certifications.includes(certification)}
                                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                        form.certifications.includes(certification)
                                            ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                                            : "border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                                    }`}
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
                                key={key}
                                className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]"
                            >
                                <input
                                    type="checkbox"
                                    checked={form[key]}
                                    onChange={(event) => setForm({ ...form, [key]: event.target.checked })}
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
