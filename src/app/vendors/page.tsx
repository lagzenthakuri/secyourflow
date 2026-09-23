"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Eye, Network, ShieldCheck, Sigma, TriangleAlert } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { EmptyState, Pill, ProgressBar } from "@/components/nis2/Nis2Primitives";
import {
    AppetitePill,
    CompliancePill,
    RelationshipTable,
    RiskLevelPill,
} from "@/components/grc/GrcPrimitives";

interface VendorListRow {
    id: string;
    name: string;
    serviceProvided: string;
    criticality: "LEVEL_1" | "LEVEL_2" | "LEVEL_3" | "LEVEL_4";
    dataAccessLevel: string;
    country: string | null;
    euBased: boolean;
    acnRelevant: boolean;
    contactEmail: string | null;
    securityScore: number | null;
    assessment: { score: number; band: "LOW" | "MODERATE" | "ELEVATED" | "HIGH"; flags: string[] };
    counts: { assets: number; data: number; policies: number; risks: number; openRisks: number };
    riskLevel: string;
    maxRiskScore: number;
    appetiteStatus: string;
    complianceStatus: string;
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

export default function VendorsPage() {
    const [vendors, setVendors] = useState<VendorListRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setError(null);
            const response = await fetch("/api/vendors", { cache: "no-store" });
            if (!response.ok) throw new Error("Failed to load vendors");
            const payload = await response.json();
            setVendors(payload.data ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load vendors");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const stats = useMemo(() => {
        const linkedAssets = vendors.reduce((sum, vendor) => sum + vendor.counts.assets, 0);
        const openRisks = vendors.reduce((sum, vendor) => sum + vendor.counts.openRisks, 0);
        const exceeded = vendors.filter((vendor) => vendor.appetiteStatus === "EXCEEDED").length;
        const averageScore = vendors.length
            ? Math.round(vendors.reduce((sum, vendor) => sum + vendor.assessment.score, 0) / vendors.length)
            : 0;
        return { linkedAssets, openRisks, exceeded, averageScore };
    }, [vendors]);

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
                    title="Vendors"
                    description="Every supplier with the assets it touches, the data it handles, the risks it carries, and the policies and controls that govern it."
                    badge={
                        <>
                            <Network size={13} />
                            Vendor · Asset · Data · Risk · Policy · Control
                        </>
                    }
                    actions={
                        <Link
                            href="/nis2/vendors"
                            className="btn btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                        >
                            <Building2 size={14} />
                            Manage inventory
                        </Link>
                    }
                    stats={[
                        {
                            label: "Vendors",
                            value: vendors.length,
                            trend: { value: "In scope", neutral: true },
                            icon: Building2,
                        },
                        {
                            label: "Linked assets",
                            value: stats.linkedAssets,
                            trend: { value: "Vendor ↔ asset", neutral: true },
                            icon: ShieldCheck,
                        },
                        {
                            label: "Open risks",
                            value: stats.openRisks,
                            trend: { value: "Direct and via assets", neutral: true },
                            icon: TriangleAlert,
                        },
                        {
                            label: "Appetite exceeded",
                            value: stats.exceeded,
                            trend: { value: "Past board tolerance", neutral: true },
                            icon: Sigma,
                        },
                        {
                            label: "Avg. security score",
                            value: `${stats.averageScore}/100`,
                            trend: { value: "Published formula", neutral: true },
                            icon: Network,
                        },
                    ]}
                />

                {error && (
                    <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}

                <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">Vendor overview</h2>
                    <p className="mt-1 mb-4 text-sm text-[var(--text-secondary)]">
                        Select a vendor to open its full interconnection overview.
                    </p>

                    {vendors.length === 0 ? (
                        <EmptyState message="No vendors recorded yet. Add suppliers in the Supply Chain inventory, then connect them to assets and data here." />
                    ) : (
                        <RelationshipTable<VendorListRow>
                            rows={vendors}
                            keyOf={(vendor) => vendor.id}
                            columns={[
                                {
                                    key: "name",
                                    label: "Vendor",
                                    render: (vendor) => (
                                        <div className="min-w-[220px]">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-semibold text-[var(--text-primary)]">
                                                    {vendor.name}
                                                </span>
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
                                            </div>
                                            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                                                {vendor.serviceProvided}
                                                {vendor.country && ` · ${vendor.country}`}
                                            </p>
                                        </div>
                                    ),
                                },
                                {
                                    key: "links",
                                    label: "Connected",
                                    render: (vendor) => (
                                        <div className="flex flex-wrap gap-1.5">
                                            <Pill tone="info">{vendor.counts.assets} assets</Pill>
                                            <Pill tone="info">{vendor.counts.data} data</Pill>
                                            <Pill tone="info">{vendor.counts.policies} policies</Pill>
                                        </div>
                                    ),
                                },
                                {
                                    key: "score",
                                    label: "Security score",
                                    render: (vendor) => (
                                        <div className="flex min-w-[130px] items-center gap-2">
                                            <ProgressBar
                                                value={vendor.assessment.score}
                                                tone={BAND_TONE[vendor.assessment.band]}
                                                className="flex-1"
                                            />
                                            <span className="text-xs font-bold text-[var(--text-primary)]">
                                                {vendor.assessment.score}
                                            </span>
                                        </div>
                                    ),
                                },
                                {
                                    key: "risk",
                                    label: "Risk",
                                    render: (vendor) => (
                                        <div className="flex flex-col items-start gap-1">
                                            <RiskLevelPill level={vendor.riskLevel} />
                                            <span className="text-[11px] text-[var(--text-muted)]">
                                                {vendor.counts.openRisks} open · score {vendor.maxRiskScore}
                                            </span>
                                        </div>
                                    ),
                                },
                                {
                                    key: "appetite",
                                    label: "Appetite",
                                    render: (vendor) => <AppetitePill status={vendor.appetiteStatus} />,
                                },
                                {
                                    key: "compliance",
                                    label: "Compliance",
                                    render: (vendor) => <CompliancePill status={vendor.complianceStatus} />,
                                },
                                {
                                    key: "open",
                                    label: "",
                                    align: "right",
                                    render: (vendor) => (
                                        <Link
                                            href={`/vendors/${vendor.id}`}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-blue-500/40 hover:text-blue-500"
                                        >
                                            <Eye size={13} />
                                            Overview
                                        </Link>
                                    ),
                                },
                            ]}
                        />
                    )}
                </section>
            </div>
        </DashboardLayout>
    );
}
