"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Link2, Save, ScrollText, ShieldCheck } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { Pill, SectionCard } from "@/components/nis2/Nis2Primitives";
import {
    CompliancePill,
    PolicyStatusPill,
    RelationshipTable,
    RiskLevelPill,
    SummaryTile,
    RelationshipPicker,
    type PolicyStatus,
} from "@/components/grc/GrcPrimitives";

interface PolicyDetail {
    id: string;
    title: string;
    description: string | null;
    version: string;
    status: PolicyStatus;
    type: string | null;
    url: string | null;
    owner: string | null;
    lastReview: string | null;
    nextReview: string | null;
    createdAt: string;
    updatedAt: string;
    allowedTransitions: PolicyStatus[];
    reviewState: "UNSCHEDULED" | "CURRENT" | "DUE_SOON" | "OVERDUE";
    risks: {
        id: string;
        riskScore: number;
        isResolved: boolean;
        riskLevel: string;
        asset: { id: string; name: string };
        vulnerability: { id: string; title: string; cveId: string | null };
    }[];
    assets: { id: string; name: string; type: string }[];
    vendors: { id: string; name: string; criticality: string }[];
    data: { id: string; name: string; category: string; classification: string }[];
    controls: {
        id: string;
        controlId: string;
        title: string;
        status: string;
        framework: string;
    }[];
}

interface LinkDraft {
    riskIds: string[];
    assetIds: string[];
    vendorIds: string[];
    dataAssetIds: string[];
    controlIds: string[];
}

interface Candidates {
    risks: { id: string; label: string }[];
    assets: { id: string; label: string }[];
    vendors: { id: string; label: string }[];
    data: { id: string; label: string }[];
    controls: { id: string; label: string }[];
}

const POLICY_TYPES = ["POLICY", "STANDARD", "PROCEDURE", "GUIDELINE"];

const TRANSITION_LABELS: Record<string, string> = {
    DRAFT: "Keep as draft",
    UNDER_REVIEW: "Send for review",
    ACTIVE: "Approve",
    ARCHIVED: "Retire",
};

const titleCase = (value: string) =>
    value
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

const emptyCandidates: Candidates = { risks: [], assets: [], vendors: [], data: [], controls: [] };

export default function PolicyDetailPage() {
    const params = useParams<{ id: string }>();
    const [policy, setPolicy] = useState<PolicyDetail | null>(null);
    const [candidates, setCandidates] = useState<Candidates>(emptyCandidates);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [draft, setDraft] = useState<LinkDraft | null>(null);

    const [form, setForm] = useState({
        title: "",
        description: "",
        type: "POLICY",
        version: "1.0",
        owner: "",
        url: "",
        nextReview: "",
    });

    const load = useCallback(async () => {
        if (!params?.id) return;
        try {
            setError(null);
            const response = await fetch(`/api/policies/${params.id}`, { cache: "no-store" });
            if (response.status === 404) throw new Error("Policy not found");
            if (!response.ok) throw new Error("Failed to load the policy");
            const payload = await response.json();
            const detail: PolicyDetail = payload.data;
            setPolicy(detail);
            setForm({
                title: detail.title,
                description: detail.description ?? "",
                type: detail.type ?? "POLICY",
                version: detail.version,
                owner: detail.owner ?? "",
                url: detail.url ?? "",
                nextReview: detail.nextReview ? detail.nextReview.slice(0, 10) : "",
            });
            setDraft({
                riskIds: detail.risks.map((risk) => risk.id),
                assetIds: detail.assets.map((asset) => asset.id),
                vendorIds: detail.vendors.map((vendor) => vendor.id),
                dataAssetIds: detail.data.map((entry) => entry.id),
                controlIds: detail.controls.map((control) => control.id),
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load the policy");
        } finally {
            setIsLoading(false);
        }
    }, [params?.id]);

    const loadCandidates = useCallback(async () => {
        try {
            const [vendorsRes, assetsRes, dataRes, risksRes, complianceRes] = await Promise.all([
                fetch("/api/vendors", { cache: "no-store" }),
                fetch("/api/assets?limit=200", { cache: "no-store" }),
                fetch("/api/data-assets", { cache: "no-store" }),
                fetch("/api/risk-register?limit=200", { cache: "no-store" }),
                fetch("/api/compliance", { cache: "no-store" }),
            ]);

            const vendors = vendorsRes.ok ? ((await vendorsRes.json()).data ?? []) : [];
            const assets = assetsRes.ok ? ((await assetsRes.json()).data ?? []) : [];
            const data = dataRes.ok ? ((await dataRes.json()).data ?? []) : [];
            const risks = risksRes.ok ? ((await risksRes.json()).data ?? []) : [];
            const frameworks = complianceRes.ok ? ((await complianceRes.json()).data ?? []) : [];

            setCandidates({
                vendors: vendors.map((vendor: { id: string; name: string }) => ({
                    id: vendor.id,
                    label: vendor.name,
                })),
                assets: assets.map((asset: { id: string; name: string; type: string }) => ({
                    id: asset.id,
                    label: `${asset.name} (${titleCase(asset.type)})`,
                })),
                data: data.map((entry: { id: string; name: string }) => ({
                    id: entry.id,
                    label: entry.name,
                })),
                risks: risks.map(
                    (risk: { id: string; threat: string; assetName: string; riskScore: number }) => ({
                        id: risk.id,
                        label: `${risk.threat} — ${risk.assetName} (${risk.riskScore})`,
                    }),
                ),
                controls: frameworks.flatMap(
                    (framework: { frameworkName: string; controls: { id: string; controlId: string; title: string }[] }) =>
                        (framework.controls ?? []).map((control) => ({
                            id: control.id,
                            label: `${framework.frameworkName} · ${control.controlId} — ${control.title}`,
                        })),
                ),
            });
        } catch {
            // Pickers degrade to showing only what is already linked.
        }
    }, []);

    useEffect(() => {
        void load();
        void loadCandidates();
    }, [load, loadCandidates]);

    const saveDetails = useCallback(async () => {
        if (!policy) return;
        setIsSaving(true);
        try {
            setError(null);
            setNotice(null);
            const response = await fetch(`/api/policies/${policy.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: form.title,
                    description: form.description || null,
                    type: form.type,
                    version: form.version,
                    owner: form.owner || null,
                    url: form.url || null,
                    nextReview: form.nextReview ? new Date(form.nextReview).toISOString() : null,
                }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) throw new Error(payload?.error ?? "Failed to save the policy");
            setNotice("Policy updated.");
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save the policy");
        } finally {
            setIsSaving(false);
        }
    }, [form, load, policy]);

    const saveLinks = useCallback(async () => {
        if (!policy || !draft) return;
        setIsSaving(true);
        try {
            setError(null);
            setNotice(null);
            const response = await fetch(`/api/policies/${policy.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(draft),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) throw new Error(payload?.error ?? "Failed to save the links");
            setNotice("Connections saved.");
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save the links");
        } finally {
            setIsSaving(false);
        }
    }, [draft, load, policy]);

    const transition = useCallback(
        async (status: PolicyStatus) => {
            if (!policy) return;
            try {
                setError(null);
                setNotice(null);
                const response = await fetch(`/api/policies/${policy.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status }),
                });
                const payload = await response.json().catch(() => null);
                if (!response.ok) throw new Error(payload?.error ?? "Status change failed");
                setNotice(`Moved to ${titleCase(status.replace("_", " "))}.`);
                await load();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Status change failed");
            }
        },
        [load, policy],
    );

    const toggle = useCallback((key: keyof LinkDraft, id: string) => {
        setDraft((current) =>
            current
                ? {
                      ...current,
                      [key]: current[key].includes(id)
                          ? current[key].filter((entry) => entry !== id)
                          : [...current[key], id],
                  }
                : current,
        );
    }, []);

    const summaries = useMemo(() => {
        if (!policy) return null;
        const worstRisk = policy.risks.reduce(
            (max, risk) => Math.max(max, risk.riskScore),
            0,
        );
        const openRisks = policy.risks.filter((risk) => !risk.isResolved).length;
        const compliantControls = policy.controls.filter(
            (control) => control.status === "COMPLIANT",
        ).length;
        return { worstRisk, openRisks, compliantControls };
    }, [policy]);

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex min-h-[60vh] items-center justify-center">
                    <ShieldLoader size="lg" variant="cyber" />
                </div>
            </DashboardLayout>
        );
    }

    if (error && !policy) {
        return (
            <DashboardLayout>
                <div className="space-y-4">
                    <Link
                        href="/policies"
                        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-blue-500"
                    >
                        <ArrowLeft size={14} />
                        Back to policies
                    </Link>
                    <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                        {error}
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!policy || !draft || !summaries) return null;

    return (
        <DashboardLayout>
            <div className="space-y-5">
                <Link
                    href="/policies"
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-blue-500"
                >
                    <ArrowLeft size={14} />
                    Back to policies
                </Link>

                <PageHeader
                    title={policy.title}
                    description={policy.description || `${policy.type ?? "POLICY"} · v${policy.version}`}
                    badge={
                        <>
                            <ScrollText size={13} />
                            {policy.type ?? "POLICY"} · v{policy.version}
                        </>
                    }
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <PolicyStatusPill status={policy.status} />
                            {policy.allowedTransitions.map((target) => (
                                <button
                                    key={target}
                                    type="button"
                                    onClick={() => void transition(target)}
                                    className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-blue-500/40 hover:text-blue-500"
                                >
                                    {TRANSITION_LABELS[target] ?? titleCase(target.replace("_", " "))}
                                </button>
                            ))}
                        </div>
                    }
                    stats={[
                        {
                            label: "Applies to",
                            value:
                                policy.risks.length +
                                policy.assets.length +
                                policy.vendors.length +
                                policy.data.length +
                                policy.controls.length,
                            trend: { value: "Linked records", neutral: true },
                            icon: Link2,
                        },
                        {
                            label: "Open risks",
                            value: summaries.openRisks,
                            trend: { value: `worst score ${summaries.worstRisk}`, neutral: true },
                            icon: ShieldCheck,
                        },
                        {
                            label: "Controls",
                            value: policy.controls.length,
                            trend: {
                                value: `${summaries.compliantControls} compliant`,
                                neutral: true,
                            },
                            icon: ShieldCheck,
                        },
                        {
                            label: "Review",
                            value: titleCase(policy.reviewState.replace("_", " ")),
                            trend: {
                                value: policy.nextReview
                                    ? `by ${new Date(policy.nextReview).toLocaleDateString()}`
                                    : "unscheduled",
                                neutral: true,
                            },
                            icon: ScrollText,
                        },
                    ]}
                />

                {(error || notice) && (
                    <div
                        className={`rounded-xl border px-4 py-3 text-sm ${
                            error
                                ? "border-red-400/30 bg-red-400/10 text-red-600 dark:text-red-400"
                                : "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                    >
                        {error ?? notice}
                    </div>
                )}

                <div className="flex flex-wrap gap-3">
                    <SummaryTile label="Risks" value={policy.risks.length} hint={`${summaries.openRisks} open`} />
                    <SummaryTile label="Assets" value={policy.assets.length} hint="Governed assets" />
                    <SummaryTile label="Vendors" value={policy.vendors.length} hint="Governed suppliers" />
                    <SummaryTile label="Data" value={policy.data.length} hint="Governed data types" />
                    <SummaryTile label="Controls" value={policy.controls.length} hint="Mapped control objectives">
                        <CompliancePill
                            status={
                                summaries.compliantControls === policy.controls.length && policy.controls.length > 0
                                    ? "COMPLIANT"
                                    : summaries.compliantControls > 0
                                      ? "PARTIALLY_COMPLIANT"
                                      : "NOT_ASSESSED"
                            }
                        />
                    </SummaryTile>
                </div>

                {/* Details */}
                <SectionCard
                    title="Document"
                    description="Ownership, version and review dates for this document."
                    actions={
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => void saveDetails()}
                            className="btn btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
                        >
                            <Save size={14} />
                            {isSaving ? "Saving…" : "Save"}
                        </button>
                    }
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Title</span>
                            <input
                                value={form.title}
                                onChange={(event) => setForm({ ...form, title: event.target.value })}
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                            />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Owner</span>
                            <input
                                value={form.owner}
                                onChange={(event) => setForm({ ...form, owner: event.target.value })}
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                            />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Type</span>
                            <select
                                value={form.type}
                                onChange={(event) => setForm({ ...form, type: event.target.value })}
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                            >
                                {POLICY_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Version</span>
                            <input
                                value={form.version}
                                onChange={(event) => setForm({ ...form, version: event.target.value })}
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                            />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                                Document URL
                            </span>
                            <input
                                value={form.url}
                                onChange={(event) => setForm({ ...form, url: event.target.value })}
                                placeholder="https://…"
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                            />
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                                Next review
                            </span>
                            <input
                                type="date"
                                value={form.nextReview}
                                onChange={(event) => setForm({ ...form, nextReview: event.target.value })}
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                            />
                        </label>
                    </div>

                    <label className="mt-4 block">
                        <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Description</span>
                        <textarea
                            value={form.description}
                            onChange={(event) => setForm({ ...form, description: event.target.value })}
                            rows={5}
                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                        />
                    </label>

                    <p className="mt-3 text-[11px] text-[var(--text-muted)]">
                        Last review:{" "}
                        {policy.lastReview ? new Date(policy.lastReview).toLocaleDateString() : "never"} · Updated{" "}
                        {new Date(policy.updatedAt).toLocaleDateString()}
                    </p>
                </SectionCard>

                {/* Connected records */}
                <SectionCard
                    title="Connections"
                    description="What this policy governs: risks → assets → vendors → data → controls."
                    actions={
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => void saveLinks()}
                            className="btn btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
                        >
                            <Save size={14} />
                            Save connections
                        </button>
                    }
                >
                    <div className="grid gap-5 lg:grid-cols-2">
                        <RelationshipPicker
                            title="Risks"
                            options={candidates.risks}
                            selected={draft.riskIds}
                            onToggle={(id) => toggle("riskIds", id)}
                        />
                        <RelationshipPicker
                            title="Assets"
                            options={candidates.assets}
                            selected={draft.assetIds}
                            onToggle={(id) => toggle("assetIds", id)}
                        />
                        <RelationshipPicker
                            title="Vendors"
                            options={candidates.vendors}
                            selected={draft.vendorIds}
                            onToggle={(id) => toggle("vendorIds", id)}
                        />
                        <RelationshipPicker
                            title="Data"
                            options={candidates.data}
                            selected={draft.dataAssetIds}
                            onToggle={(id) => toggle("dataAssetIds", id)}
                        />
                        <RelationshipPicker
                            title="Controls"
                            options={candidates.controls}
                            selected={draft.controlIds}
                            onToggle={(id) => toggle("controlIds", id)}
                            className="lg:col-span-2"
                        />
                    </div>
                </SectionCard>

                {/* Linked risks */}
                <SectionCard title="Linked risks" description="Risks this policy is cited against.">
                    <RelationshipTable
                        rows={policy.risks}
                        keyOf={(risk) => risk.id}
                        emptyMessage="No risks linked yet — pick them in Connections above."
                        columns={[
                            {
                                key: "threat",
                                label: "Risk",
                                render: (risk) => (
                                    <div className="min-w-[220px]">
                                        <span className="font-medium text-[var(--text-primary)]">
                                            {risk.vulnerability.title}
                                        </span>
                                        <p className="text-[11px] text-[var(--text-muted)]">
                                            {risk.vulnerability.cveId ?? "No CVE"} · {risk.asset.name}
                                        </p>
                                    </div>
                                ),
                            },
                            {
                                key: "score",
                                label: "Score",
                                align: "right",
                                render: (risk) => (
                                    <span className="font-mono font-bold text-[var(--text-primary)]">
                                        {risk.riskScore}
                                    </span>
                                ),
                            },
                            {
                                key: "level",
                                label: "Level",
                                render: (risk) => <RiskLevelPill level={risk.riskLevel} />,
                            },
                            {
                                key: "state",
                                label: "State",
                                render: (risk) =>
                                    risk.isResolved ? (
                                        <Pill tone="success">Resolved</Pill>
                                    ) : (
                                        <Pill tone="danger">Open</Pill>
                                    ),
                            },
                        ]}
                    />
                </SectionCard>

                {/* Linked controls */}
                <SectionCard title="Mapped controls" description="Control objectives this policy implements.">
                    <RelationshipTable
                        rows={policy.controls}
                        keyOf={(control) => control.id}
                        emptyMessage="No controls mapped yet — pick them in Connections above."
                        columns={[
                            {
                                key: "control",
                                label: "Control",
                                render: (control) => (
                                    <div>
                                        <span className="font-mono text-xs font-bold text-intent-accent">
                                            {control.controlId}
                                        </span>
                                        <span className="ml-2 font-medium text-[var(--text-primary)]">
                                            {control.title}
                                        </span>
                                        <p className="text-[11px] text-[var(--text-muted)]">{control.framework}</p>
                                    </div>
                                ),
                            },
                            {
                                key: "status",
                                label: "Status",
                                render: (control) => <CompliancePill status={control.status} />,
                            },
                        ]}
                    />
                </SectionCard>
            </div>
        </DashboardLayout>
    );
}
