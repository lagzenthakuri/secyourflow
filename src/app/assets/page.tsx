"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddAssetModal } from "@/components/assets/AddAssetModal";
import { EditAssetModal } from "@/components/assets/EditAssetModal";
import { AssetActions } from "@/components/assets/AssetActions";
import { SecurityLoader } from "@/components/ui/SecurityLoader";
import { cn } from "@/lib/utils";
import { Asset } from "@/types";
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Database,
  Download,
  Filter,
  Globe,
  LayoutGrid,
  ListFilter,
  Loader2,
  MapPin,
  Monitor,
  Plus,
  Router,
  Search,
  Server,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const AssetTypeChart = dynamic(
  () =>
    import("@/components/charts/DashboardCharts").then((mod) => mod.AssetTypeChart),
  {
    ssr: false,
    loading: () => <div className="h-[240px] animate-pulse rounded-xl bg-white/5" />,
  },
);

const AssetMap = dynamic(
  () => import("@/components/charts/AssetMap").then((mod) => mod.AssetMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[500px] items-center justify-center rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)]">
        <SecurityLoader size="lg" icon="shield" variant="cyber" text="Loading map" />
      </div>
    ),
  },
);

interface PaginationState {
  page: number;
  limit: number;
  totalPages: number;
  total: number;
}

interface TypeDistributionItem {
  type: string;
  count: number;
  percentage: number;
}

interface EnvironmentBreakdownItem {
  name: string;
  count: number;
  percentage: number;
}

interface AssetsResponse {
  data: Asset[];
  pagination: PaginationState;
  summary: {
    typeDistribution: TypeDistributionItem[];
    environmentBreakdown: EnvironmentBreakdownItem[];
  };
}

type AssetStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "DECOMMISSIONED";

type AssetCriticality = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";

const assetTypes = [
  "SERVER",
  "WORKSTATION",
  "NETWORK_DEVICE",
  "CLOUD_INSTANCE",
  "CONTAINER",
  "DATABASE",
  "APPLICATION",
  "API",
  "DOMAIN",
  "CERTIFICATE",
  "IOT_DEVICE",
  "MOBILE_DEVICE",
  "OTHER",
] as const;

const statusOptions: AssetStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "MAINTENANCE",
  "DECOMMISSIONED",
];

const criticalityOptions: AssetCriticality[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFORMATIONAL",
];

const assetTypeIcons: Record<string, LucideIcon> = {
  SERVER: Server,
  CLOUD_INSTANCE: Cloud,
  DATABASE: Database,
  APPLICATION: Globe,
  CONTAINER: Box,
  WORKSTATION: Monitor,
  NETWORK_DEVICE: Router,
  API: Globe,
  DOMAIN: Globe,
  CERTIFICATE: Sparkles,
  IOT_DEVICE: Router,
  MOBILE_DEVICE: Monitor,
  OTHER: Server,
};

const statusTones: Record<AssetStatus, string> = {
  ACTIVE: "border-emerald-400/35 bg-emerald-500/10 text-emerald-200",
  INACTIVE: "border-slate-400/35 bg-slate-500/10 text-slate-200",
  MAINTENANCE: "border-yellow-400/35 bg-yellow-500/10 text-yellow-200",
  DECOMMISSIONED: "border-red-400/35 bg-red-500/10 text-red-200",
};

const criticalityTones: Record<AssetCriticality, string> = {
  CRITICAL: "border-red-400/35 bg-red-500/10 text-red-200",
  HIGH: "border-orange-400/35 bg-orange-500/10 text-orange-200",
  MEDIUM: "border-yellow-400/35 bg-yellow-500/10 text-yellow-200",
  LOW: "border-emerald-400/35 bg-emerald-500/10 text-emerald-200",
  INFORMATIONAL: "border-slate-400/35 bg-slate-500/10 text-slate-200",
};

const numberFormatter = new Intl.NumberFormat("en-US");

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeCsv(value: unknown): string {
  const str = String(value ?? "");
  if (!str.includes(",") && !str.includes("\"") && !str.includes("\n")) {
    return str;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedCriticality, setSelectedCriticality] = useState<string>("ALL");

  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 20,
    totalPages: 1,
    total: 0,
  });

  const [summary, setSummary] = useState<AssetsResponse["summary"] | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const fetchAssets = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        setError(null);

        const params = new URLSearchParams({
          page: String(pagination.page),
          limit: String(pagination.limit),
        });

        if (searchQuery.trim()) params.set("search", searchQuery.trim());
        if (selectedType !== "ALL") params.set("type", selectedType);
        if (selectedStatus !== "ALL") params.set("status", selectedStatus);
        if (selectedCriticality !== "ALL") params.set("criticality", selectedCriticality);

        const response = await fetch(`/api/assets?${params.toString()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch assets");
        }

        const result = (await response.json()) as AssetsResponse;
        setAssets(result.data ?? []);
        setSummary(result.summary ?? null);

        setPagination((prev) => ({
          ...prev,
          ...result.pagination,
          page: result.pagination?.page ?? prev.page,
          total: result.pagination?.total ?? prev.total,
          totalPages: result.pagination?.totalPages ?? prev.totalPages,
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch assets");
      } finally {
        if (silent) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [
      pagination.page,
      pagination.limit,
      searchQuery,
      selectedType,
      selectedStatus,
      selectedCriticality,
    ],
  );

  const refreshAssets = useCallback(async () => {
    await fetchAssets({ silent: true });
  }, [fetchAssets]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchAssets();
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchAssets]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        setActionError(null);
        setDeletingId(id);

        const response = await fetch(`/api/assets/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = (await response.json()) as { error?: string };
          throw new Error(errorData.error || "Failed to delete asset");
        }

        await fetchAssets({ silent: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete asset";
        setActionError(message);
      } finally {
        setDeletingId(null);
      }
    },
    [fetchAssets],
  );

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedType("ALL");
    setSelectedStatus("ALL");
    setSelectedCriticality("ALL");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const exportCsv = () => {
    if (!assets.length) return;

    const rows = [
      [
        "Name",
        "Type",
        "Status",
        "Criticality",
        "IP Address",
        "Hostname",
        "Environment",
        "Location",
        "Cloud Region",
      ],
      ...assets.map((asset) => [
        asset.name,
        asset.type,
        asset.status,
        asset.criticality,
        asset.ipAddress || "",
        asset.hostname || "",
        asset.environment,
        asset.location || "",
        asset.cloudRegion || "",
      ]),
    ];

    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "assets.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const activeOnPage = useMemo(
    () => assets.filter((asset) => asset.status === "ACTIVE").length,
    [assets],
  );

  const criticalOnPage = useMemo(
    () => assets.filter((asset) => asset.criticality === "CRITICAL").length,
    [assets],
  );

  const vulnOnPage = useMemo(
    () => assets.filter((asset) => (asset.vulnerabilityCount || 0) > 0).length,
    [assets],
  );

  const typeDistribution = summary?.typeDistribution ?? [];
  const environmentBreakdown = summary?.environmentBreakdown ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(132deg,rgba(56,189,248,0.2),rgba(18,18,26,0.9)_44%,rgba(18,18,26,0.96))] p-6 sm:p-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky-300/20 blur-3xl animate-pulse" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/35 bg-sky-300/10 px-3 py-1 text-xs font-medium text-sky-200">
                <Sparkles size={13} />
                Asset Operations Workspace
              </div>
              <h1 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
                Asset Inventory
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-200 sm:text-base">
                Keep asset context, ownership, and exposure status centralized for faster SOC
                triage and cleaner operational decisions.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-100">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  {numberFormatter.format(pagination.total)} total assets
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  {activeOnPage} active on current page
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  {vulnOnPage} with vulnerabilities
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={exportCsv}
                disabled={!assets.length}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-white/15 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={14} />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition-all duration-200 hover:bg-sky-200 hover:scale-105 active:scale-95"
              >
                <Plus size={14} />
                Add Asset
              </button>
            </div>
          </div>
        </section>

        {actionError ? (
          <section className="rounded-2xl border border-red-400/25 bg-red-500/5 p-3 text-sm text-red-200">
            {actionError}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Assets",
              value: numberFormatter.format(pagination.total),
              hint: `${pagination.totalPages} pages indexed`,
              icon: Server,
            },
            {
              label: "Active (page)",
              value: numberFormatter.format(activeOnPage),
              hint: "Live operational assets",
              icon: CheckCircle2,
            },
            {
              label: "Critical (page)",
              value: numberFormatter.format(criticalOnPage),
              hint: "High business sensitivity",
              icon: AlertTriangle,
            },
            {
              label: "Vuln Exposure",
              value: numberFormatter.format(vulnOnPage),
              hint: "Assets needing remediation",
              icon: XCircle,
            },
          ].map((metric, index) => {
            const Icon = metric.icon;
            return (
              <article
                key={metric.label}
                className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/35 hover:shadow-lg hover:shadow-sky-300/10 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm text-slate-300">{metric.label}</p>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2 transition-transform duration-200 group-hover:scale-110">
                    <Icon size={15} className="text-slate-200" />
                  </div>
                </div>
                <p className="mt-4 text-3xl font-semibold text-white transition-all duration-300">{metric.value}</p>
                <p className="mt-1 text-sm text-slate-400">{metric.hint}</p>
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-4 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto]">
            <label className="relative block">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors duration-200"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                placeholder="Search by name, IP, or hostname"
                className="input h-10 w-full !pl-9 text-sm transition-all duration-200 focus:ring-2 focus:ring-sky-300/30"
              />
            </label>

            <label className="relative block">
              <Box
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors duration-200"
              />
              <select
                value={selectedType}
                onChange={(event) => {
                  setSelectedType(event.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="input h-10 w-full appearance-none !pl-9 text-sm transition-all duration-200 focus:ring-2 focus:ring-sky-300/30"
              >
                <option value="ALL">All Types</option>
                {assetTypes.map((type) => (
                  <option key={type} value={type}>
                    {formatLabel(type)}
                  </option>
                ))}
              </select>
            </label>

            <label className="relative block">
              <Filter
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors duration-200"
              />
              <select
                value={selectedStatus}
                onChange={(event) => {
                  setSelectedStatus(event.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="input h-10 w-full appearance-none !pl-9 text-sm transition-all duration-200 focus:ring-2 focus:ring-sky-300/30"
              >
                <option value="ALL">All Status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {formatLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            <select
              value={selectedCriticality}
              onChange={(event) => {
                setSelectedCriticality(event.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="input h-10 w-full appearance-none text-sm transition-all duration-200 focus:ring-2 focus:ring-sky-300/30"
            >
              <option value="ALL">All Criticality</option>
              {criticalityOptions.map((criticality) => (
                <option key={criticality} value={criticality}>
                  {formatLabel(criticality)}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-slate-200 transition-all duration-200 hover:bg-white/10 hover:scale-105 active:scale-95"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => void refreshAssets()}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-slate-200 transition-all duration-200 hover:bg-white/10 hover:scale-105 active:scale-95"
              >
                {isRefreshing ? <Loader2 size={15} className="animate-spin" /> : "Refresh"}
              </button>
            </div>
          </div>

          <div className="mt-3 flex w-fit rounded-xl border border-white/10 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all duration-200",
                viewMode === "list"
                  ? "bg-sky-300 text-slate-950 shadow-lg shadow-sky-300/20"
                  : "text-slate-300 hover:bg-white/10 hover:text-white",
              )}
            >
              <LayoutGrid size={14} />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all duration-200",
                viewMode === "map"
                  ? "bg-sky-300 text-slate-950 shadow-lg shadow-sky-300/20"
                  : "text-slate-300 hover:bg-white/10 hover:text-white",
              )}
            >
              <MapPin size={14} />
              Map
            </button>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-400/25 bg-red-500/5 p-4 text-sm text-red-200">
            {error}
          </section>
        ) : null}

        {viewMode === "map" ? (
          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <AssetMap assets={assets} />

            <div className="space-y-4">
              <article className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5 animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
                <h2 className="text-lg font-semibold text-white">Type Distribution</h2>
                <p className="mt-1 text-sm text-slate-400">Current filtered inventory mix.</p>
                <div className="mt-4">
                  {typeDistribution.length > 0 ? (
                    <AssetTypeChart data={typeDistribution} />
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                      No type distribution data available.
                    </div>
                  )}
                </div>
              </article>

              <article className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5 animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
                <h2 className="text-lg font-semibold text-white">Environment Coverage</h2>
                <div className="mt-4 space-y-3">
                  {environmentBreakdown.length > 0 ? (
                    environmentBreakdown.map((env, index) => (
                      <div key={env.name} className="animate-in fade-in slide-in-from-right-2 duration-300" style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-slate-300">{formatLabel(env.name)}</span>
                          <span className="text-slate-400">
                            {env.count} ({env.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-sky-300 transition-all duration-700 ease-out"
                            style={{ width: `${Math.min(Math.max(env.percentage, 0), 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                      No environment breakdown available.
                    </p>
                  )}
                </div>
              </article>
            </div>
          </section>
        ) : (
          <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <article className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)]">
              <header className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Asset List</h2>
                  <p className="text-sm text-slate-400">
                    Showing {assets.length} of {numberFormatter.format(pagination.total)} assets
                  </p>
                </div>
                <div className="text-xs text-slate-500">Page {pagination.page}</div>
              </header>

              {isLoading ? (
                <div className="flex min-h-[360px] items-center justify-center">
                  <SecurityLoader size="lg" icon="shield" variant="cyber" text="Fetching assets" />
                </div>
              ) : assets.length === 0 ? (
                <div className="p-16 text-center">
                  <Server className="mx-auto h-12 w-12 text-slate-600" />
                  <p className="mt-4 text-sm text-slate-400">No assets match current filters.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {assets.map((asset, index) => {
                    const Icon = assetTypeIcons[asset.type] || Server;
                    const statusTone = statusTones[(asset.status as AssetStatus) || "ACTIVE"];
                    const criticalityTone =
                      criticalityTones[(asset.criticality as AssetCriticality) || "INFORMATIONAL"];
                    const vulnerabilityCount = asset.vulnerabilityCount || 0;

                    return (
                      <div
                        key={asset.id}
                        className="group p-4 transition-all duration-200 hover:bg-white/[0.03] animate-in fade-in slide-in-from-left-2"
                        style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'backwards' }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5 transition-all duration-200 group-hover:border-sky-300/30 group-hover:bg-sky-300/10 group-hover:scale-110">
                            <Icon size={18} className="text-sky-300 transition-transform duration-200 group-hover:rotate-12" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-sm font-medium text-white">{asset.name}</h3>
                              <span
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[11px]",
                                  criticalityTone,
                                )}
                              >
                                {asset.criticality}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[11px]",
                                  statusTone,
                                )}
                              >
                                {asset.status}
                              </span>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                              <span>{formatLabel(asset.type)}</span>
                              <span>{formatLabel(asset.environment)}</span>
                              {asset.ipAddress ? <span>IP {asset.ipAddress}</span> : null}
                              {asset.hostname ? <span>Host {asset.hostname}</span> : null}
                              {asset.location ? (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin size={11} className="text-slate-500" />
                                  {asset.location}
                                </span>
                              ) : null}
                              {asset.cloudRegion ? <span>{asset.cloudRegion}</span> : null}
                            </div>

                            {asset.tags?.length ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {asset.tags.slice(0, 4).map((tag) => (
                                  <span
                                    key={`${asset.id}-${tag}`}
                                    className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-slate-400"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          <div className="hidden text-right md:block">
                            <p
                              className={cn(
                                "text-sm font-semibold",
                                vulnerabilityCount > 0 ? "text-orange-300" : "text-emerald-300",
                              )}
                            >
                              {vulnerabilityCount}
                            </p>
                            <p className="text-xs text-slate-500">Vulnerabilities</p>
                          </div>

                          <AssetActions
                            asset={asset}
                            onEdit={() => {
                              setEditingAsset(asset);
                              setIsEditModalOpen(true);
                            }}
                            onDelete={() => {
                              void handleDelete(asset.id);
                            }}
                            isDeleting={deletingId === asset.id}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <footer className="flex items-center justify-between border-t border-white/10 p-4">
                <p className="text-xs text-slate-500">
                  Page {pagination.page} of {pagination.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pagination.page <= 1 || isLoading}
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-200 transition-all duration-200 hover:bg-white/10 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft size={14} />
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages || isLoading}
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: Math.min(prev.totalPages, prev.page + 1),
                      }))
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-slate-200 transition-all duration-200 hover:bg-white/10 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                </div>
              </footer>
            </article>

            <div className="space-y-4">
              <article className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5 animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
                <h2 className="text-lg font-semibold text-white">Type Distribution</h2>
                <p className="mt-1 text-sm text-slate-400">Current filtered inventory mix.</p>
                <div className="mt-4">
                  {typeDistribution.length > 0 ? (
                    <AssetTypeChart data={typeDistribution} />
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                      No type distribution data available.
                    </div>
                  )}
                </div>
              </article>

              <article className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5 animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
                <h2 className="text-lg font-semibold text-white">Environment Breakdown</h2>
                <div className="mt-4 space-y-3">
                  {environmentBreakdown.length > 0 ? (
                    environmentBreakdown.map((env, index) => (
                      <div key={env.name} className="animate-in fade-in slide-in-from-right-2 duration-300" style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-slate-300">{formatLabel(env.name)}</span>
                          <span className="text-slate-400">
                            {env.count} ({env.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-sky-300 transition-all duration-700 ease-out"
                            style={{ width: `${Math.min(Math.max(env.percentage, 0), 100)}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                      No environment breakdown available.
                    </p>
                  )}
                </div>
              </article>

              <article className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5 animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}>
                <h2 className="text-lg font-semibold text-white">Recently Added</h2>
                <div className="mt-4 space-y-2">
                  {assets.slice(0, 4).map((asset, index) => {
                    const Icon = assetTypeIcons[asset.type] || Server;
                    return (
                      <div
                        key={asset.id}
                        className="rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-all duration-200 hover:bg-white/[0.06] hover:border-sky-300/30 hover:scale-[1.02] animate-in fade-in slide-in-from-right-2"
                        style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-1.5 transition-all duration-200 group-hover:border-sky-300/30">
                            <Icon size={13} className="text-sky-300" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm text-slate-200">{asset.name}</p>
                            <p className="text-xs text-slate-500">
                              {formatLabel(asset.type)} · {formatLabel(asset.environment)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!assets.length ? (
                    <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                      No assets available.
                    </p>
                  ) : null}
                </div>
              </article>
            </div>
          </section>
        )}
      </div>

      <AddAssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          void fetchAssets({ silent: true });
        }}
      />

      {editingAsset ? (
        <EditAssetModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingAsset(null);
          }}
          onSuccess={() => {
            void fetchAssets({ silent: true });
          }}
          asset={editingAsset}
        />
      ) : null}
    </DashboardLayout>
  );
}
