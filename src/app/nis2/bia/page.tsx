"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { EmptyState, Pill, ProgressBar, SectionCard } from "@/components/nis2/Nis2Primitives";
import { Activity, AlertTriangle, LifeBuoy, Plus, TimerReset, Workflow } from "lucide-react";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Slider } from "@repo/design-system/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/design-system/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/design-system/components/ui/dialog";

type Criticality = "VITAL" | "CRITICAL" | "IMPORTANT" | "SUPPORTING";

interface Gap {
    code: string;
    severity: "CRITICAL" | "HIGH" | "MEDIUM";
    message: string;
}

interface BusinessProcess {
    id: string;
    name: string;
    description: string | null;
    owner: string | null;
    criticality: Criticality;
    rtoHours: number | null;
    rpoHours: number | null;
    mtpdHours: number | null;
    financialImpact: number;
    operationalImpact: number;
    reputationalImpact: number;
    regulatoryImpact: number;
    safetyImpact: number;
    impactScore: number | null;
    bcpDocumented: boolean;
    drpDocumented: boolean;
    lastTestedAt: string | null;
    gaps: Gap[];
    assetDependencies: { asset: { id: string; name: string } }[];
    vendorDependencies: { vendor: { id: string; name: string } }[];
}

interface BiaSummary {
    totalProcesses: number;
    vital: number;
    critical: number;
    withoutBcp: number;
    withoutDrp: number;
    untested: number;
    averageImpactScore: number;
    gapsBySeverity: { CRITICAL: number; HIGH: number; MEDIUM: number };
    processesAtRisk: number;
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
    if (value.trim() === "") return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
}

export default function Nis2BiaPage() {
    const [processes, setProcesses] = useState<BusinessProcess[]>([]);
    const [summary, setSummary] = useState<BiaSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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
            setError(err instanceof Error ? err.message : "Failed to load the business impact analysis");
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
            setError(null);
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
                    lastTestedAt: form.lastTestedAt ? new Date(form.lastTestedAt).toISOString() : null,
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
            setError(err instanceof Error ? err.message : "Failed to add the process");
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
                    title="Business Impact Analysis"
                    description="Art. 21(2)(c) continuity evidence: recovery objectives per process, five-dimension impact scoring, and the gaps an auditor will ask about."
                    badge={
                        <>
                            <LifeBuoy size={13} />
                            NIS2 Art. 21(2)(c) — Business continuity
                        </>
                    }
                    actions={
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="btn btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                        >
                            <Plus size={14} />
                            Add process
                        </button>
                    }
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
                />

                {error && (
                    <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}

                <SectionCard
                    title="Process inventory"
                    description="Recovery objectives must satisfy RTO < MTPD; anything else means recovery finishes after the process is already unviable."
                >
                    {processes.length === 0 ? (
                        <EmptyState message="No business processes recorded. The BIA is the evidence base for Art. 21(2)(c)." />
                    ) : (
                        <div className="space-y-3">
                            {processes.map((process) => (
                                <article
                                    key={process.id}
                                    className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
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
                                                {process.bcpDocumented && <Pill tone="success">BCP</Pill>}
                                                {process.drpDocumented && <Pill tone="success">DRP</Pill>}
                                            </div>
                                            {process.owner && (
                                                <p className="mt-1 text-xs text-[var(--text-muted)]">
                                                    Owner: {process.owner}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 md:w-56">
                                            <div className="flex-1">
                                                <ProgressBar
                                                    value={process.impactScore ?? 0}
                                                    tone={
                                                        (process.impactScore ?? 0) >= 70
                                                            ? "danger"
                                                            : (process.impactScore ?? 0) >= 40
                                                              ? "warning"
                                                              : "success"
                                                    }
                                                />
                                            </div>
                                            <span className="w-16 shrink-0 text-right text-sm font-bold text-[var(--text-primary)]">
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
                                            <div key={label} className="flex items-baseline gap-1.5">
                                                <dt className="font-semibold text-[var(--text-muted)]">{label}</dt>
                                                <dd className="text-[var(--text-primary)]">
                                                    {value === null ? "—" : `${value}h`}
                                                </dd>
                                            </div>
                                        ))}
                                        {(process.assetDependencies.length > 0 ||
                                            process.vendorDependencies.length > 0) && (
                                            <div className="flex items-baseline gap-1.5">
                                                <dt className="font-semibold text-[var(--text-muted)]">Depends on</dt>
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
                                                    <Pill tone={GAP_TONE[gap.severity]}>{gap.message}</Pill>
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

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-h-[min(90dvh,52rem)] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
                    <DialogHeader className="border-b px-6 py-5 pr-12">
                        <DialogTitle className="text-xl">Add a business process</DialogTitle>
                        <DialogDescription>Capture service ownership, recovery targets, and continuity evidence for your impact assessment.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 px-6 py-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2"><Label htmlFor="bia-name">Process name <span className="text-destructive">*</span></Label><Input id="bia-name" autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Customer payment processing" /></div>
                            <div className="space-y-2"><Label htmlFor="bia-owner">Owner</Label><Input id="bia-owner" value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} placeholder="Team or accountable person" /></div>
                        </div>

                        <section className="space-y-3">
                            <div><h3 className="text-sm font-semibold">Criticality and recovery objectives</h3><p className="mt-1 text-xs text-muted-foreground">Recovery targets are measured in hours.</p></div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="space-y-2"><Label htmlFor="bia-criticality">Criticality</Label><Select value={form.criticality} onValueChange={(value) => setForm({ ...form, criticality: value as Criticality })}><SelectTrigger id="bia-criticality" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{([["VITAL", "Vital"], ["CRITICAL", "Critical"], ["IMPORTANT", "Important"], ["SUPPORTING", "Supporting"]] as const).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                                {([["rtoHours", "RTO"], ["rpoHours", "RPO"], ["mtpdHours", "MTPD"]] as const).map(([key, label]) => <div key={key} className="space-y-2"><Label htmlFor={`bia-${key}`}>{label} <span className="text-muted-foreground">(hours)</span></Label><Input id={`bia-${key}`} type="number" min={0} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} placeholder="—" /></div>)}
                            </div>
                        </section>

                        <fieldset className="space-y-3 rounded-lg border border-border p-4">
                            <legend className="px-1 text-sm font-semibold">Business impact assessment</legend>
                            <p className="text-xs text-muted-foreground">Rate each dimension from 1 (negligible) to 5 (catastrophic).</p>
                            <div className="space-y-4">
                                {IMPACT_FIELDS.map(([key, label]) => <div key={key} className="grid grid-cols-[6.5rem_minmax(0,1fr)_1.75rem] items-center gap-3"><Label htmlFor={`bia-${key}`} className="text-sm font-normal">{label}</Label><Slider id={`bia-${key}`} min={1} max={5} step={1} value={[form[key]]} onValueChange={([value]) => setForm({ ...form, [key]: value ?? 1 })} aria-label={`${label} impact`} /><span className="text-right text-sm font-semibold tabular-nums">{form[key]}<span className="sr-only"> out of 5</span></span></div>)}
                            </div>
                        </fieldset>

                        <section className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-3"><h3 className="text-sm font-semibold">Continuity plans</h3><label className="flex items-center gap-2.5 text-sm"><Checkbox checked={form.bcpDocumented} onCheckedChange={(checked) => setForm({ ...form, bcpDocumented: checked === true })} />Business continuity plan documented</label><label className="flex items-center gap-2.5 text-sm"><Checkbox checked={form.drpDocumented} onCheckedChange={(checked) => setForm({ ...form, drpDocumented: checked === true })} />Disaster recovery plan documented</label></div>
                            <div className="space-y-2"><Label>Last continuity test</Label><DatePickerField label="Choose test date" value={form.lastTestedAt} onChange={(lastTestedAt) => setForm({ ...form, lastTestedAt })} /></div>
                        </section>
                    </div>
                    <DialogFooter className="sticky bottom-0 border-t bg-background px-6 py-4">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="button" disabled={isSaving || form.name.trim().length < 2} onClick={() => void createProcess()}>{isSaving ? "Saving…" : "Add process"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
