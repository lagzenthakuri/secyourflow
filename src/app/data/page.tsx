"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Database, FileCheck, Plus, Server, Building2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Pill, SectionCard } from "@/components/nis2/Nis2Primitives";
import { RelationshipTable } from "@/components/grc/GrcPrimitives";

interface DataAssetRow {
    id: string;
    name: string;
    category: string;
    classification: string;
    description: string | null;
    retentionNotes: string | null;
    tags: string[];
    counts: { vendors: number; assets: number; policies: number };
}

interface DataAssetDetail extends DataAssetRow {
    vendors: { id: string; name: string; criticality: string; accessType: string }[];
    assets: { id: string; name: string; type: string; criticality: string; dataRole: string }[];
    policies: { id: string; title: string; status: string; type: string | null }[];
}

const DATA_CATEGORIES = [
    "CUSTOMER_PII",
    "EMPLOYEE_DATA",
    "FINANCIAL_DATA",
    "AUTHENTICATION_CREDENTIALS",
    "BUSINESS_SENSITIVE",
    "HEALTH_DATA",
    "TELEMETRY",
    "OTHER",
];

const DATA_CLASSIFICATIONS = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"];

const titleCase = (value: string) =>
    value
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

const emptyForm = {
    name: "",
    category: "BUSINESS_SENSITIVE",
    classification: "INTERNAL",
    description: "",
    retentionNotes: "",
};

export default function DataCatalogPage() {
    // Read after mount rather than with useSearchParams, so the page still
    // prerenders without a Suspense boundary.
    const [highlight, setHighlight] = useState<string | null>(null);

    const [items, setItems] = useState<DataAssetRow[]>([]);
    const [detail, setDetail] = useState<DataAssetDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);

    const load = useCallback(async () => {
        try {
            setError(null);
            const response = await fetch("/api/data-assets", { cache: "no-store" });
            if (!response.ok) throw new Error("Failed to load the data catalog");
            const payload = await response.json();
            setItems(payload.data ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load the data catalog");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadDetail = useCallback(async (id: string) => {
        try {
            const response = await fetch(`/api/data-assets/${id}`, { cache: "no-store" });
            if (!response.ok) return;
            const payload = await response.json();
            setDetail(payload.data);
        } catch {
            setDetail(null);
        }
    }, []);

    useEffect(() => {
        void load();
        setHighlight(new URLSearchParams(window.location.search).get("highlight"));
    }, [load]);

    useEffect(() => {
        if (highlight && items.length > 0) void loadDetail(highlight);
    }, [highlight, items.length, loadDetail]);

    const createDataAsset = useCallback(async () => {
        setIsSaving(true);
        try {
            setError(null);
            const response = await fetch("/api/data-assets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    description: form.description || null,
                    retentionNotes: form.retentionNotes || null,
                }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) throw new Error(payload?.error ?? "Failed to add the data record");
            setIsModalOpen(false);
            setForm(emptyForm);
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add the data record");
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

    const totals = items.reduce(
        (acc, item) => ({
            vendors: acc.vendors + item.counts.vendors,
            assets: acc.assets + item.counts.assets,
            policies: acc.policies + item.counts.policies,
        }),
        { vendors: 0, assets: 0, policies: 0 },
    );

    return (
        <DashboardLayout>
            <div className="space-y-5">
                <PageHeader
                    title="Data Catalog"
                    description="Every data type the organization handles, shared by the vendors and assets that touch it — recorded once, linked everywhere."
                    badge={
                        <>
                            <Database size={13} />
                            Data · Vendors · Assets · Policies
                        </>
                    }
                    actions={
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="btn btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                        >
                            <Plus size={14} />
                            Add data record
                        </button>
                    }
                    stats={[
                        {
                            label: "Data records",
                            value: items.length,
                            trend: { value: "In the catalog", neutral: true },
                            icon: Database,
                        },
                        {
                            label: "Vendor links",
                            value: totals.vendors,
                            trend: { value: "Collected or accessed", neutral: true },
                            icon: Building2,
                        },
                        {
                            label: "Asset links",
                            value: totals.assets,
                            trend: { value: "Stored or processed", neutral: true },
                            icon: Server,
                        },
                        {
                            label: "Policy links",
                            value: totals.policies,
                            trend: { value: "Governed documents", neutral: true },
                            icon: FileCheck,
                        },
                    ]}
                />

                {error && (
                    <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}

                <SectionCard
                    title="Data records"
                    description="Select a record to see which vendors, assets and policies connect to it."
                >
                    {items.length === 0 ? (
                        <EmptyState message="No data records yet. Add the data types your organization handles — customer PII, financial data, credentials — and link them to vendors and assets." />
                    ) : (
                        <RelationshipTable<DataAssetRow>
                            rows={items}
                            keyOf={(item) => item.id}
                            columns={[
                                {
                                    key: "name",
                                    label: "Data type",
                                    render: (item) => (
                                        <button
                                            type="button"
                                            onClick={() => void loadDetail(item.id)}
                                            className="text-left"
                                        >
                                            <span className="font-semibold text-[var(--text-primary)] hover:text-blue-500">
                                                {item.name}
                                            </span>
                                            <p className="text-[11px] text-[var(--text-muted)]">
                                                {titleCase(item.category)}
                                            </p>
                                        </button>
                                    ),
                                },
                                {
                                    key: "classification",
                                    label: "Classification",
                                    render: (item) => (
                                        <Pill
                                            tone={
                                                item.classification === "RESTRICTED"
                                                    ? "danger"
                                                    : item.classification === "CONFIDENTIAL"
                                                      ? "warning"
                                                      : "neutral"
                                            }
                                        >
                                            {titleCase(item.classification)}
                                        </Pill>
                                    ),
                                },
                                {
                                    key: "links",
                                    label: "Connected",
                                    render: (item) => (
                                        <div className="flex flex-wrap gap-1.5">
                                            <Pill tone="info">{item.counts.vendors} vendors</Pill>
                                            <Pill tone="info">{item.counts.assets} assets</Pill>
                                            <Pill tone="info">{item.counts.policies} policies</Pill>
                                        </div>
                                    ),
                                },
                                {
                                    key: "retention",
                                    label: "Retention",
                                    render: (item) => (
                                        <span className="text-xs text-[var(--text-muted)]">
                                            {item.retentionNotes || "—"}
                                        </span>
                                    ),
                                },
                            ]}
                        />
                    )}
                </SectionCard>

                {detail && (
                    <SectionCard
                        title={detail.name}
                        description={detail.description || `${titleCase(detail.category)} · ${titleCase(detail.classification)}`}
                        actions={
                            <button
                                type="button"
                                onClick={() => setDetail(null)}
                                className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                            >
                                Close
                            </button>
                        }
                    >
                        <div className="space-y-5">
                            <div>
                                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                    Vendors handling this data
                                </h3>
                                <RelationshipTable
                                    rows={detail.vendors}
                                    keyOf={(row) => row.id}
                                    emptyMessage="No vendors handle this data yet."
                                    columns={[
                                        {
                                            key: "name",
                                            label: "Vendor",
                                            render: (row) => (
                                                <Link
                                                    href={`/vendors/${row.id}`}
                                                    className="font-semibold text-[var(--text-primary)] hover:text-blue-500"
                                                >
                                                    {row.name}
                                                </Link>
                                            ),
                                        },
                                        {
                                            key: "criticality",
                                            label: "Criticality",
                                            render: (row) => titleCase(row.criticality.replace("_", " ")),
                                        },
                                        {
                                            key: "access",
                                            label: "Access",
                                            render: (row) => <Pill tone="warning">{titleCase(row.accessType)}</Pill>,
                                        },
                                    ]}
                                />
                            </div>

                            <div>
                                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                    Assets handling this data
                                </h3>
                                <RelationshipTable
                                    rows={detail.assets}
                                    keyOf={(row) => row.id}
                                    emptyMessage="No assets handle this data yet."
                                    columns={[
                                        {
                                            key: "name",
                                            label: "Asset",
                                            render: (row) => (
                                                <Link
                                                    href={`/assets/${row.id}`}
                                                    className="font-semibold text-[var(--text-primary)] hover:text-blue-500"
                                                >
                                                    {row.name}
                                                </Link>
                                            ),
                                        },
                                        {
                                            key: "type",
                                            label: "Type",
                                            render: (row) => titleCase(row.type),
                                        },
                                        {
                                            key: "role",
                                            label: "Role",
                                            render: (row) => <Pill tone="info">{titleCase(row.dataRole)}</Pill>,
                                        },
                                    ]}
                                />
                            </div>

                            <div>
                                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                                    Governing policies
                                </h3>
                                <RelationshipTable
                                    rows={detail.policies}
                                    keyOf={(row) => row.id}
                                    emptyMessage="No policies reference this data yet."
                                    columns={[
                                        {
                                            key: "title",
                                            label: "Policy",
                                            render: (row) => (
                                                <Link
                                                    href={`/policies/${row.id}`}
                                                    className="font-semibold text-[var(--text-primary)] hover:text-blue-500"
                                                >
                                                    {row.title}
                                                </Link>
                                            ),
                                        },
                                        {
                                            key: "type",
                                            label: "Type",
                                            render: (row) => row.type ?? "POLICY",
                                        },
                                        {
                                            key: "status",
                                            label: "Status",
                                            render: (row) => <Pill tone="neutral">{row.status}</Pill>,
                                        },
                                    ]}
                                />
                            </div>
                        </div>
                    </SectionCard>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Add a data record"
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
                            disabled={isSaving || form.name.trim().length < 2}
                            onClick={() => void createDataAsset()}
                            className="btn btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
                        >
                            {isSaving ? "Saving…" : "Add record"}
                        </button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Name</span>
                        <input
                            value={form.name}
                            onChange={(event) => setForm({ ...form, name: event.target.value })}
                            placeholder="Customer PII, Payment records…"
                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                        />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                                Category
                            </span>
                            <select
                                value={form.category}
                                onChange={(event) => setForm({ ...form, category: event.target.value })}
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                            >
                                {DATA_CATEGORIES.map((category) => (
                                    <option key={category} value={category}>
                                        {titleCase(category)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                                Classification
                            </span>
                            <select
                                value={form.classification}
                                onChange={(event) => setForm({ ...form, classification: event.target.value })}
                                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                            >
                                {DATA_CLASSIFICATIONS.map((classification) => (
                                    <option key={classification} value={classification}>
                                        {classification}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                            Description
                        </span>
                        <textarea
                            value={form.description}
                            onChange={(event) => setForm({ ...form, description: event.target.value })}
                            rows={3}
                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                            Retention notes
                        </span>
                        <input
                            value={form.retentionNotes}
                            onChange={(event) => setForm({ ...form, retentionNotes: event.target.value })}
                            placeholder="Retained 24 months, then anonymized"
                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                        />
                    </label>
                </div>
            </Modal>
        </DashboardLayout>
    );
}
