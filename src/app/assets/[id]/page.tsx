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
import { Pill, SectionCard } from "@/components/nis2/Nis2Primitives";
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

interface AssetRisk {
    id: string;
    riskScore: number;
    isResolved: boolean;
    aiAnalysis: { threat?: string } | null;
    riskLevel: string;
    appetiteStatus: string;
    appetiteTolerance: number | null;
    vulnerability: { title: string; cveId: string | null };
}

interface AssetOverview {
    asset: {
        id: string;
        name: string;
        type: string;
        hostname: string | null;
        ipAddress: string | null;
        environment: string;
        criticality: string;
        status: string;
        owner: string | null;
        department: string | null;
        location: string | null;
        createdAt: string;
    };
    vendors: {
        id: string;
        name: string;
        criticality: string;
        serviceProvided: string;
        securityScore: number | null;
        relationshipType: string;
    }[];
    data: {
        id: string;
        name: string;
        category: string;
        classification: string;
        dataRole: string;
    }[];
    risks: AssetRisk[];
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
    appetite: {
        status: string;
        within: number;
        approaching: number;
        exceeded: number;
        notEvaluated: number;
    };
    compliance: { status: string; assessed: number };
    summary: {
        vendorCount: number;
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

const titleCase = (value: string) =>
    value
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

const VENDOR_RELATIONSHIP_OPTIONS = [
    { value: "PROVIDES", label: "Provides" },
    { value: "MANAGES", label: "Manages" },
    { value: "HOSTS", label: "Hosts" },
    { value: "OPERATES", label: "Operates" },
    { value: "SUPPORTS", label: "Supports" },
];

const DATA_ROLE_OPTIONS = [
    { value: "STORES", label: "Stores" },
    { value: "PROCESSES", label: "Processes" },
    { value: "TRANSITS", label: "Transits" },
];

export default function AssetOverviewPage() {
    const params = useParams<{ id: string }>();
    const [overview, setOverview] = useState<AssetOverview | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [linkNotice, setLinkNotice] = useState<string | null>(null);
    const [isSavingLinks, setIsSavingLinks] = useState(false);
    const [vendorOptions, setVendorOptions] = useState<PickerOption[]>([]);
    const [dataOptions, setDataOptions] = useState<PickerOption[]>([]);
    const [vendorSelection, setVendorSelection] = useState<Record<string, string>>({});
    const [dataSelection, setDataSelection] = useState<Record<string, string>>({});

    const load = useCallback(async () => {
        if (!params?.id) return;
        try {
            setError(null);
            const response = await fetch(`/api/assets/${params.id}/overview`, { cache: "no-store" });
            if (response.status === 404) throw new Error("Asset not found");
            if (!response.ok) throw new Error("Failed to load the asset overview");
            const payload = await response.json();
            setOverview(payload.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load the asset overview");
        } finally {
            setIsLoading(false);
        }
    }, [params?.id]);

    useEffect(() => {
        void load();
    }, [load]);

    // Candidates for the connection editors, merged with what is linked already.
    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const [vendorsRes, dataRes] = await Promise.all([
                fetch("/api/vendors", { cache: "no-store" }),
                fetch("/api/data-assets", { cache: "no-store" }),
            ]);
            if (cancelled) return;
            const vendors: { id: string; name: string }[] = vendorsRes.ok
                ? ((await vendorsRes.json()).data ?? [])
                : [];
            const data: { id: string; name: string }[] = dataRes.ok
                ? ((await dataRes.json()).data ?? [])
                : [];
            if (cancelled) return;
            setVendorOptions(vendors.map((vendor) => ({ id: vendor.id, label: vendor.name })));
            setDataOptions(data.map((entry) => ({ id: entry.id, label: entry.name })));
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!overview) return;
        setVendorSelection(
            Object.fromEntries(overview.vendors.map((vendor) => [vendor.id, vendor.relationshipType])),
        );
        setDataSelection(Object.fromEntries(overview.data.map((entry) => [entry.id, entry.dataRole])));
        setVendorOptions((current) => {
            const known = new Set(current.map((option) => option.id));
            const linked = overview.vendors
                .filter((vendor) => !known.has(vendor.id))
                .map((vendor) => ({ id: vendor.id, label: vendor.name }));
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
            const response = await fetch(`/api/assets/${overview.asset.id}/relationships`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vendors: Object.entries(vendorSelection).map(
                        ([vendorId, relationshipType]) => ({ vendorId, relationshipType }),
                    ),
                    data: Object.entries(dataSelection).map(([dataAssetId, dataRole]) => ({
                        dataAssetId,
                        dataRole,
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
    }, [dataSelection, load, overview, vendorSelection]);

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
                        href="/assets"
                        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-blue-500"
                    >
                        <ArrowLeft size={14} />
                        Back to assets
                    </Link>
                    <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                        {error ?? "Asset not found"}
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const { asset, summary, appetite } = overview;

    return (
        <DashboardLayout>
            <div className="space-y-5">
                <Link
                    href="/assets"
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-blue-500"
                >
                    <ArrowLeft size={14} />
                    Back to assets
                </Link>

                <PageHeader
                    title={asset.name}
                    description={
                        [asset.hostname, asset.ipAddress, asset.owner, asset.department]
                            .filter(Boolean)
                            .join(" · ") || `${titleCase(asset.type)} in ${titleCase(asset.environment)}`
                    }
                    badge={
                        <>
                            <Server size={13} />
                            {titleCase(asset.type)} · {titleCase(asset.criticality)} criticality
                        </>
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
                            label: "Vendors",
                            value: summary.vendorCount,
                            trend: { value: "Touching this asset", neutral: true },
                            icon: Building2,
                        },
                        {
                            label: "Data types",
                            value: summary.dataCount,
                            trend: { value: "Stored, processed, transiting", neutral: true },
                            icon: Database,
                        },
                    ]}
                />

                <div className="flex flex-wrap gap-3">
                    <SummaryTile label="Vendors" value={summary.vendorCount} hint="Suppliers touching this asset" />
                    <SummaryTile label="Data" value={summary.dataCount} hint="Stored, processed or transiting" />
                    <SummaryTile label="Open risks" value={summary.openRiskCount} hint={`${summary.riskCount} total`} />
                    <SummaryTile label="Policies" value={summary.policyCount} hint="Applying to this asset" />
                    <SummaryTile label="Controls" value={summary.controlCount} hint="Assessed on this asset">
                        <CompliancePill status={summary.complianceStatus} />
                    </SummaryTile>
                    <SummaryTile label="Appetite" value={<AppetitePill status={summary.appetiteStatus} />}>
                        <RiskLevelPill level={summary.riskLevel} />
                    </SummaryTile>
                </div>

                {/* Vendors — the reverse of the vendor overview */}
                <SectionCard
                    title="Vendors"
                    description="Suppliers that provide, manage, host, operate or support this asset."
                    actions={
                        <Link
                            href="/vendors"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-blue-500/40 hover:text-blue-500"
                        >
                            <Building2 size={13} />
                            All vendors
                        </Link>
                    }
                >
                    <RelationshipTable
                        rows={overview.vendors}
                        keyOf={(vendor) => vendor.id}
                        emptyMessage="No vendors linked to this asset yet."
                        columns={[
                            {
                                key: "name",
                                label: "Vendor",
                                render: (vendor) => (
                                    <div>
                                        <Link
                                            href={`/vendors/${vendor.id}`}
                                            className="font-semibold text-[var(--text-primary)] hover:text-blue-500"
                                        >
                                            {vendor.name}
                                        </Link>
                                        <p className="text-[11px] text-[var(--text-muted)]">{vendor.serviceProvided}</p>
                                    </div>
                                ),
                            },
                            {
                                key: "criticality",
                                label: "Criticality",
                                render: (vendor) => titleCase(vendor.criticality.replace("_", " ")),
                            },
                            {
                                key: "relationship",
                                label: "Relationship",
                                render: (vendor) => <Pill tone="info">{titleCase(vendor.relationshipType)}</Pill>,
                            },
                            {
                                key: "score",
                                label: "Security score",
                                align: "right",
                                render: (vendor) =>
                                    vendor.securityScore != null ? `${vendor.securityScore}/100` : "—",
                            },
                        ]}
                    />
                </SectionCard>

                {/* Data handled by this asset */}
                <SectionCard title="Data handled" description="What this asset stores, processes or transits.">
                    <RelationshipTable
                        rows={overview.data}
                        keyOf={(entry) => entry.id}
                        emptyMessage="No data types linked to this asset yet."
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
                                key: "role",
                                label: "Asset role",
                                render: (entry) => <Pill tone="neutral">{titleCase(entry.dataRole)}</Pill>,
                            },
                        ]}
                    />
                </SectionCard>

                {/* Editable connections — the reverse relationship */}
                <SectionCard
                    title="Edit connections"
                    description="Link the vendors that touch this asset, and the data it stores, processes or transits."
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
                            title="Vendors"
                            options={vendorOptions}
                            selected={Object.keys(vendorSelection)}
                            onToggle={(id) => toggleSelection(setVendorSelection, "MANAGES", id)}
                            meta={vendorSelection}
                            metaOptions={VENDOR_RELATIONSHIP_OPTIONS}
                            metaLabel="Relationship"
                            onMetaChange={(id, value) =>
                                setVendorSelection((current) => ({ ...current, [id]: value }))
                            }
                        />
                        <RelationshipPicker
                            title="Data"
                            options={dataOptions}
                            selected={Object.keys(dataSelection)}
                            onToggle={(id) => toggleSelection(setDataSelection, "STORES", id)}
                            meta={dataSelection}
                            metaOptions={DATA_ROLE_OPTIONS}
                            metaLabel="Role"
                            onMetaChange={(id, value) =>
                                setDataSelection((current) => ({ ...current, [id]: value }))
                            }
                        />
                    </div>
                </SectionCard>

                {/* Risks */}
                <SectionCard
                    title="Risks"
                    description="Every risk raised against this asset, evaluated against its appetite statement."
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
                        emptyMessage="No risks recorded for this asset."
                        columns={[
                            {
                                key: "threat",
                                label: "Risk",
                                render: (risk) => (
                                    <div className="min-w-[220px]">
                                        <span className="font-medium text-[var(--text-primary)]">
                                            {risk.aiAnalysis?.threat || risk.vulnerability.title}
                                        </span>
                                        <p className="text-[11px] text-[var(--text-muted)]">
                                            {risk.vulnerability.cveId ?? risk.vulnerability.title}
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

                {/* Policies and controls */}
                <SectionCard title="Policies & controls" description="Documents and control objectives that govern this asset.">
                    <div className="space-y-5">
                        <div>
                            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                Policies
                            </h3>
                            <RelationshipTable
                                rows={overview.policies}
                                keyOf={(policy) => policy.id}
                                emptyMessage="No policies linked to this asset yet."
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
                                emptyMessage="No controls assessed on this asset yet."
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
            </div>
        </DashboardLayout>
    );
}
