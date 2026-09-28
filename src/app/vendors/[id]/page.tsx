"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    ArrowLeft,
    Building2,
    Database,
    FileCheck,
    Save,
    Server,
    ShieldAlert,
    ShieldCheck,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { EmptyState, Pill, ProgressBar, SectionCard } from "@/components/nis2/Nis2Primitives";
import {
    AppetitePill,
    CompliancePill,
    PolicyStatusPill,
    RelationshipPicker,
    RelationshipTable,
    RiskLevelPill,
    SummaryTile,
    type PickerOption,
} from "@/components/grc/GrcPrimitives";

interface ScoreComponent {
    key: string;
    label: string;
    maxPoints: number;
    awarded: number;
    rationale: string;
}

interface VendorRisk {
    id: string;
    riskScore: number;
    isResolved: boolean;
    assetName: string | null;
    via: "VENDOR" | "ASSET";
    threat: string;
    riskLevel: string;
    appetiteStatus: string;
    appetiteTolerance: number | null;
    vulnerability: { title: string; cveId: string | null };
}

interface VendorOverview {
    vendor: {
        id: string;
        name: string;
        description: string | null;
        serviceProvided: string;
        criticality: string;
        dataAccessLevel: string;
        country: string | null;
        euBased: boolean;
        certifications: string[];
        contractEnd: string | null;
        lastAuditAt: string | null;
        auditRights: boolean;
        slaDefined: boolean;
        securityClauses: boolean;
        acnRelevant: boolean;
        contactEmail: string | null;
        notes: string | null;
    };
    assets: {
        id: string;
        name: string;
        type: string;
        criticality: string;
        environment: string;
        status: string;
        owner: string | null;
        relationshipType: string;
        dataCount: number;
    }[];
    data: {
        id: string;
        name: string;
        category: string;
        classification: string;
        accessType: string;
    }[];
    risks: VendorRisk[];
    policies: {
        id: string;
        title: string;
        status: string;
        type: string | null;
        version: string;
        owner: string | null;
        nextReview: string | null;
    }[];
    controls: {
        id: string;
        controlId: string;
        title: string;
        framework: string;
        status: string;
        via: string;
        assessedAt: string | null;
    }[];
    assessment: { score: number; band: string; components: ScoreComponent[]; flags: string[] };
    appetite: {
        status: string;
        evaluated: number;
        within: number;
        approaching: number;
        exceeded: number;
        notEvaluated: number;
        matchedCategories: string[];
    };
    compliance: { status: string; assessed: number };
    summary: {
        assetCount: number;
        dataCount: number;
        riskCount: number;
        openRiskCount: number;
        maxRiskScore: number;
        riskLevel: string;
        policyCount: number;
        controlCount: number;
        appetiteStatus: string;
        complianceStatus: string;
    };
}

const CRITICALITY_LABELS: Record<string, string> = {
    LEVEL_1: "Level 1 — Vital",
    LEVEL_2: "Level 2 — Critical",
    LEVEL_3: "Level 3 — Important",
    LEVEL_4: "Level 4 — Routine",
};

const BAND_TONE = {
    LOW: "success",
    MODERATE: "info",
    ELEVATED: "warning",
    HIGH: "danger",
} as const;

const titleCase = (value: string) =>
    value
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

const ASSET_RELATIONSHIP_OPTIONS = [
    { value: "PROVIDES", label: "Provides" },
    { value: "MANAGES", label: "Manages" },
    { value: "HOSTS", label: "Hosts" },
    { value: "OPERATES", label: "Operates" },
    { value: "SUPPORTS", label: "Supports" },
];

const DATA_ACCESS_OPTIONS = [
    { value: "COLLECTS", label: "Collects" },
    { value: "ACCESSES", label: "Accesses" },
    { value: "STORES", label: "Stores" },
    { value: "PROCESSES", label: "Processes" },
    { value: "SHARES", label: "Shares" },
];

export default function VendorOverviewPage() {
    const params = useParams<{ id: string }>();
    const [overview, setOverview] = useState<VendorOverview | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [linkNotice, setLinkNotice] = useState<string | null>(null);
    const [isSavingLinks, setIsSavingLinks] = useState(false);
    const [assetOptions, setAssetOptions] = useState<PickerOption[]>([]);
    const [dataOptions, setDataOptions] = useState<PickerOption[]>([]);
    // id -> relationship / access type currently selected
    const [assetSelection, setAssetSelection] = useState<Record<string, string>>({});
    const [dataSelection, setDataSelection] = useState<Record<string, string>>({});

    const load = useCallback(async () => {
        if (!params?.id) return;
        try {
            setError(null);
            const response = await fetch(`/api/vendors/${params.id}`, { cache: "no-store" });
            if (response.status === 404) throw new Error("Vendor not found");
            if (!response.ok) throw new Error("Failed to load the vendor overview");
            const payload = await response.json();
            setOverview(payload.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load the vendor overview");
        } finally {
            setIsLoading(false);
        }
    }, [params?.id]);

    useEffect(() => {
        void load();
    }, [load]);

    // Candidates for the connection editors. Linked records are merged in so
    // the pickers still work if a candidate fetch is truncated or fails.
    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const [assetsRes, dataRes] = await Promise.all([
                fetch("/api/assets?limit=200", { cache: "no-store" }),
                fetch("/api/data-assets", { cache: "no-store" }),
            ]);
            if (cancelled) return;
            const assets: { id: string; name: string }[] = assetsRes.ok
                ? ((await assetsRes.json()).data ?? [])
                : [];
            const data: { id: string; name: string }[] = dataRes.ok
                ? ((await dataRes.json()).data ?? [])
                : [];
            if (cancelled) return;
            setAssetOptions(assets.map((asset) => ({ id: asset.id, label: asset.name })));
            setDataOptions(data.map((entry) => ({ id: entry.id, label: entry.name })));
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Seed the editors from the saved relationships whenever the overview loads.
    useEffect(() => {
        if (!overview) return;
        setAssetSelection(
            Object.fromEntries(overview.assets.map((asset) => [asset.id, asset.relationshipType])),
        );
        setDataSelection(Object.fromEntries(overview.data.map((entry) => [entry.id, entry.accessType])));
        setAssetOptions((current) => {
            const known = new Set(current.map((option) => option.id));
            const linked = overview.assets
                .filter((asset) => !known.has(asset.id))
                .map((asset) => ({ id: asset.id, label: asset.name }));
            return linked.length ? [...current, ...linked] : current;
        });
        setDataOptions((current) => {
            const known = new Set(current.map((option) => option.id));
            const linked = overview.data
                .filter((entry) => !known.has(entry.id))
                .map((entry) => ({ id: entry.id, label: entry.name }));
            return linked.length ? [...current, ...linked] : current;
        });
    }, [overview]);

    const toggleSelection = (
        setter: React.Dispatch<React.SetStateAction<Record<string, string>>>,
        defaultValue: string,
        id: string,
    ) => {
        setter((current) => {
            const next = { ...current };
            if (id in next) {
                delete next[id];
            } else {
                next[id] = defaultValue;
            }
            return next;
        });
    };

    const saveConnections = useCallback(async () => {
        if (!overview) return;
        setIsSavingLinks(true);
        try {
            setError(null);
            setLinkNotice(null);
            const response = await fetch(`/api/vendors/${overview.vendor.id}/relationships`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assets: Object.entries(assetSelection).map(([assetId, relationshipType]) => ({
                        assetId,
                        relationshipType,
                    })),
                    data: Object.entries(dataSelection).map(([dataAssetId, accessType]) => ({
                        dataAssetId,
                        accessType,
                    })),
                }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) throw new Error(payload?.error ?? "Failed to save the connections");
            setLinkNotice("Connections saved.");
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save the connections");
        } finally {
            setIsSavingLinks(false);
        }
    }, [assetSelection, dataSelection, load, overview]);

    const sortedRisks = useMemo(
        () => (overview ? [...overview.risks].sort((a, b) => b.riskScore - a.riskScore) : []),
        [overview],
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

    if (error || !overview) {
        return (
            <DashboardLayout>
                <div className="space-y-4">
                    <Link
                        href="/vendors"
                        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-blue-500"
                    >
                        <ArrowLeft size={14} />
                        Back to vendors
                    </Link>
                    <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                        {error ?? "Vendor not found"}
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const { vendor, summary, assessment, appetite } = overview;

    return (
        <DashboardLayout>
            <div className="space-y-5">
                <Link
                    href="/vendors"
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-blue-500"
                >
                    <ArrowLeft size={14} />
                    Back to vendors
                </Link>

                <PageHeader
                    title={vendor.name}
                    description={vendor.description || vendor.serviceProvided}
                    badge={
                        <>
                            <Building2 size={13} />
                            {CRITICALITY_LABELS[vendor.criticality] ?? vendor.criticality}
                            {vendor.acnRelevant ? " · ACN Art. 18" : ""}
                        </>
                    }
                    actions={
                        <Link
                            href="/nis2/vendors"
                            className="rounded-xl border border-[var(--border-color)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                        >
                            Edit in inventory
                        </Link>
                    }
                    stats={[
                        {
                            label: "Risk level",
                            value: summary.riskLevel,
                            trend: { value: `score ${summary.maxRiskScore}`, neutral: true },
                            icon: ShieldAlert,
                        },
                        {
                            label: "Appetite",
                            value: summary.appetiteStatus.replace("_", " ").toLowerCase(),
                            trend: { value: `${appetite.exceeded} over tolerance`, neutral: true },
                            icon: ShieldCheck,
                        },
                        {
                            label: "Compliance",
                            value: titleCase(summary.complianceStatus.replace("_", " ")),
                            trend: { value: `${overview.compliance.assessed} controls assessed`, neutral: true },
                            icon: FileCheck,
                        },
                        {
                            label: "Security score",
                            value: `${assessment.score}/100`,
                            trend: { value: assessment.band, neutral: true },
                            icon: Building2,
                        },
                        {
                            label: "Connected",
                            value: summary.assetCount + summary.dataCount + summary.policyCount,
                            trend: { value: "Assets, data, policies", neutral: true },
                            icon: Database,
                        },
                    ]}
                />

                <div className="flex flex-wrap gap-3">
                    <SummaryTile label="Assets" value={summary.assetCount} hint="Vendors ↔ assets" />
                    <SummaryTile label="Data handled" value={summary.dataCount} hint="Collects, accesses, stores, processes" />
                    <SummaryTile label="Open risks" value={summary.openRiskCount} hint={`${summary.riskCount} total`} />
                    <SummaryTile label="Policies" value={summary.policyCount} hint="Governing documents" />
                    <SummaryTile label="Controls" value={summary.controlCount} hint="Via assets and policies">
                        <CompliancePill status={summary.complianceStatus} />
                    </SummaryTile>
                    <SummaryTile label="Appetite" value={<AppetitePill status={summary.appetiteStatus} />}>
                        <RiskLevelPill level={summary.riskLevel} />
                    </SummaryTile>
                </div>

                {/* Vendor details and the published security assessment */}
                <div className="grid gap-5 lg:grid-cols-2">
                    <SectionCard title="Vendor details" description="Commercial and contractual facts behind the score.">
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                            {[
                                ["Service provided", vendor.serviceProvided],
                                ["Criticality", CRITICALITY_LABELS[vendor.criticality] ?? vendor.criticality],
                                ["Data access level", titleCase(vendor.dataAccessLevel)],
                                ["Country", vendor.country ?? "—"],
                                ["EU / EEA based", vendor.euBased ? "Yes" : "No"],
                                ["Certifications", vendor.certifications.length ? vendor.certifications.join(", ") : "None"],
                                ["Contract ends", vendor.contractEnd ? new Date(vendor.contractEnd).toLocaleDateString() : "—"],
                                ["Last assessed", vendor.lastAuditAt ? new Date(vendor.lastAuditAt).toLocaleDateString() : "—"],
                                ["Audit rights", vendor.auditRights ? "Yes" : "No"],
                                ["Defined SLA", vendor.slaDefined ? "Yes" : "No"],
                                ["Security clauses", vendor.securityClauses ? "Yes" : "No"],
                                ["Contact", vendor.contactEmail ?? "—"],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <dt className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                        {label}
                                    </dt>
                                    <dd className="text-sm text-[var(--text-primary)]">{value}</dd>
                                </div>
                            ))}
                        </dl>
                        {vendor.notes && (
                            <p className="mt-4 border-t border-[var(--border-color)] pt-3 text-sm text-[var(--text-secondary)]">
                                {vendor.notes}
                            </p>
                        )}
                    </SectionCard>

                    <SectionCard
                        title="Security assessment"
                        description="100-point published formula — every component is reproducible by hand."
                    >
                        <div className="mb-4 flex items-center gap-4">
                            <span className="text-3xl font-bold text-[var(--text-primary)]">
                                {assessment.score}
                                <span className="text-base font-medium text-[var(--text-muted)]">/100</span>
                            </span>
                            <Pill tone={BAND_TONE[assessment.band as keyof typeof BAND_TONE] ?? "neutral"}>
                                {assessment.band}
                            </Pill>
                        </div>

                        <div className="space-y-3">
                            {assessment.components.map((component) => (
                                <div key={component.key} className="flex flex-col gap-1">
                                    <div className="flex items-baseline justify-between gap-3 text-xs">
                                        <span className="font-medium text-[var(--text-primary)]">{component.label}</span>
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
                                    <p className="text-[11px] text-[var(--text-muted)]">{component.rationale}</p>
                                </div>
                            ))}
                        </div>

                        {assessment.flags.length > 0 && (
                            <ul className="mt-4 space-y-1 border-t border-[var(--border-color)] pt-3">
                                {assessment.flags.map((flag) => (
                                    <li
                                        key={flag}
                                        className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400"
                                    >
                                        <ShieldAlert size={12} className="mt-0.5 shrink-0" />
                                        {flag}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </SectionCard>
                </div>

                {/* Connected assets */}
                <SectionCard
                    title="Connected assets"
                    description="Assets this vendor provides, manages, hosts, operates or supports."
                    actions={
                        <Link
                            href="/assets"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-blue-500/40 hover:text-blue-500"
                        >
                            <Server size={13} />
                            All assets
                        </Link>
                    }
                >
                    <RelationshipTable
                        rows={overview.assets}
                        keyOf={(asset) => asset.id}
                        emptyMessage="No assets linked yet. Connect them from the asset overview or the Supply Chain inventory."
                        columns={[
                            {
                                key: "name",
                                label: "Asset",
                                render: (asset) => (
                                    <div>
                                        <Link
                                            href={`/assets/${asset.id}`}
                                            className="font-semibold text-[var(--text-primary)] hover:text-blue-500"
                                        >
                                            {asset.name}
                                        </Link>
                                        <p className="text-[11px] text-[var(--text-muted)]">
                                            {titleCase(asset.type)} · {titleCase(asset.environment)}
                                            {asset.owner ? ` · ${asset.owner}` : ""}
                                        </p>
                                    </div>
                                ),
                            },
                            {
                                key: "relationship",
                                label: "Relationship",
                                render: (asset) => <Pill tone="info">{titleCase(asset.relationshipType)}</Pill>,
                            },
                            {
                                key: "criticality",
                                label: "Criticality",
                                render: (asset) => titleCase(asset.criticality),
                            },
                            {
                                key: "status",
                                label: "Status",
                                render: (asset) => titleCase(asset.status),
                            },
                            {
                                key: "data",
                                label: "Data types",
                                align: "right",
                                render: (asset) => asset.dataCount,
                            },
                        ]}
                    />
                </SectionCard>

                {/* Data handled */}
                <SectionCard
                    title="Data handled"
                    description="What this vendor collects, accesses, stores, processes or shares — one shared catalog entry per data type."
                >
                    <RelationshipTable
                        rows={overview.data}
                        keyOf={(entry) => entry.id}
                        emptyMessage="No data types linked yet. Add them from the Data Catalog."
                        columns={[
                            {
                                key: "name",
                                label: "Data type",
                                render: (entry) => (
                                    <div>
                                        <Link
                                            href={`/data?highlight=${entry.id}`}
                                            className="font-semibold text-[var(--text-primary)] hover:text-blue-500"
                                        >
                                            {entry.name}
                                        </Link>
                                        <p className="text-[11px] text-[var(--text-muted)]">{titleCase(entry.category)}</p>
                                    </div>
                                ),
                            },
                            {
                                key: "classification",
                                label: "Classification",
                                render: (entry) => (
                                    <Pill
                                        tone={
                                            entry.classification === "RESTRICTED"
                                                ? "danger"
                                                : entry.classification === "CONFIDENTIAL"
                                                  ? "warning"
                                                  : "neutral"
                                        }
                                    >
                                        {titleCase(entry.classification)}
                                    </Pill>
                                ),
                            },
                            {
                                key: "access",
                                label: "Vendor access",
                                render: (entry) => <Pill tone="info">{titleCase(entry.accessType)}</Pill>,
                            },
                        ]}
                    />
                </SectionCard>

                {/* Editable connections: what this vendor touches and what it does with data */}
                <SectionCard
                    title="Edit connections"
                    description="Link the assets this vendor provides or manages, and the data it collects, accesses, stores, processes or shares."
                    actions={
                        <div className="flex items-center gap-2">
                            {linkNotice && (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400">
                                    {linkNotice}
                                </span>
                            )}
                            <button
                                type="button"
                                disabled={isSavingLinks}
                                onClick={() => void saveConnections()}
                                className="btn btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
                            >
                                <Save size={14} />
                                {isSavingLinks ? "Saving…" : "Save connections"}
                            </button>
                        </div>
                    }
                >
                    <div className="grid gap-5 lg:grid-cols-2">
                        <RelationshipPicker
                            title="Assets"
                            options={assetOptions}
                            selected={Object.keys(assetSelection)}
                            onToggle={(id) => toggleSelection(setAssetSelection, "MANAGES", id)}
                            meta={assetSelection}
                            metaOptions={ASSET_RELATIONSHIP_OPTIONS}
                            metaLabel="Relationship"
                            onMetaChange={(id, value) =>
                                setAssetSelection((current) => ({ ...current, [id]: value }))
                            }
                        />
                        <RelationshipPicker
                            title="Data"
                            options={dataOptions}
                            selected={Object.keys(dataSelection)}
                            onToggle={(id) => toggleSelection(setDataSelection, "ACCESSES", id)}
                            meta={dataSelection}
                            metaOptions={DATA_ACCESS_OPTIONS}
                            metaLabel="Access"
                            onMetaChange={(id, value) =>
                                setDataSelection((current) => ({ ...current, [id]: value }))
                            }
                        />
                    </div>
                </SectionCard>

                {/* Risks */}
                <SectionCard
                    title="Related risks"
                    description="Risks raised directly against this vendor and risks on its linked assets, each evaluated against its appetite statement."
                    actions={
                        <Link
                            href="/risk-register"
                            className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-blue-500/40 hover:text-blue-500"
                        >
                            Risk register
                        </Link>
                    }
                >
                    <RelationshipTable
                        rows={sortedRisks}
                        keyOf={(risk) => risk.id}
                        emptyMessage="No risks recorded for this vendor or its assets."
                        columns={[
                            {
                                key: "threat",
                                label: "Risk",
                                render: (risk) => (
                                    <div className="min-w-[220px]">
                                        <span className="font-medium text-[var(--text-primary)]">{risk.threat}</span>
                                        <p className="text-[11px] text-[var(--text-muted)]">
                                            {risk.vulnerability.cveId ?? risk.vulnerability.title}
                                        </p>
                                    </div>
                                ),
                            },
                            {
                                key: "via",
                                label: "Source",
                                render: (risk) => (
                                    <div>
                                        <Pill tone={risk.via === "VENDOR" ? "warning" : "neutral"}>
                                            {risk.via === "VENDOR" ? "Vendor risk" : "Via asset"}
                                        </Pill>
                                        {risk.assetName && (
                                            <p className="mt-1 text-[11px] text-[var(--text-muted)]">{risk.assetName}</p>
                                        )}
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
                                key: "appetite",
                                label: "Appetite",
                                render: (risk) => (
                                    <AppetitePill status={risk.appetiteStatus} tolerance={risk.appetiteTolerance} />
                                ),
                            },
                            {
                                key: "state",
                                label: "State",
                                render: (risk) =>
                                    risk.isResolved ? <Pill tone="success">Resolved</Pill> : <Pill tone="danger">Open</Pill>,
                            },
                        ]}
                    />
                </SectionCard>

                {/* Policies */}
                <SectionCard
                    title="Policies & controls"
                    description="Documents that govern this vendor, and the controls reached through its assets and policies."
                >
                    <div className="space-y-5">
                        <div>
                            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                Policies
                            </h3>
                            <RelationshipTable
                                rows={overview.policies}
                                keyOf={(policy) => policy.id}
                                emptyMessage="No policies linked to this vendor yet."
                                columns={[
                                    {
                                        key: "title",
                                        label: "Policy",
                                        render: (policy) => (
                                            <div>
                                                <Link
                                                    href={`/policies/${policy.id}`}
                                                    className="font-semibold text-[var(--text-primary)] hover:text-blue-500"
                                                >
                                                    {policy.title}
                                                </Link>
                                                <p className="text-[11px] text-[var(--text-muted)]">
                                                    {policy.type ?? "POLICY"} · v{policy.version}
                                                    {policy.owner ? ` · ${policy.owner}` : ""}
                                                </p>
                                            </div>
                                        ),
                                    },
                                    {
                                        key: "status",
                                        label: "Status",
                                        render: (policy) => <PolicyStatusPill status={policy.status} />,
                                    },
                                    {
                                        key: "review",
                                        label: "Next review",
                                        render: (policy) =>
                                            policy.nextReview
                                                ? new Date(policy.nextReview).toLocaleDateString()
                                                : "Unscheduled",
                                    },
                                ]}
                            />
                        </div>

                        <div>
                            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                Controls
                            </h3>
                            <RelationshipTable
                                rows={overview.controls}
                                keyOf={(control) => control.id}
                                emptyMessage="No controls reachable yet — link assets or policies that carry controls."
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
                                    {
                                        key: "via",
                                        label: "Reached via",
                                        render: (control) => <Pill tone="neutral">{titleCase(control.via)}</Pill>,
                                    },
                                    {
                                        key: "assessed",
                                        label: "Assessed",
                                        render: (control) =>
                                            control.assessedAt
                                                ? new Date(control.assessedAt).toLocaleDateString()
                                                : "—",
                                    },
                                ]}
                            />
                        </div>
                    </div>
                </SectionCard>

                {overview.risks.length === 0 &&
                    overview.assets.length === 0 &&
                    overview.data.length === 0 && (
                        <EmptyState message="This vendor has no connections yet. Link assets and data to see its risks, policies and controls here." />
                    )}
            </div>
        </DashboardLayout>
    );
}
