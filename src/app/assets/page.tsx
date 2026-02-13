"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddAssetModal } from "@/components/assets/AddAssetModal";
import { EditAssetModal } from "@/components/assets/EditAssetModal";
import { AssetActions } from "@/components/assets/AssetActions";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
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
  Loader2,
  MapPin,
  Monitor,
  Network,
  Plus,
  Router,
  Search,
  Server,
  Sparkles,
  Square,
  CheckSquare,
  UploadCloud,
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
      <div className="flex h-[500px] items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
        <ShieldLoader size="lg" variant="cyber" />
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

interface AssetGroupRecord {
  id: string;
  name: string;
  color?: string | null;
}

interface AssetRelationshipRecord {
  id: string;
  relationshipType: string;
  parentAsset: {
    id: string;
    name: string;
  };
  childAsset: {
    id: string;
    name: string;
  };
}

interface AssetImpactResponse {
  summary: {
    relationships: number;
    connectedAssets: number;
    criticalDependencies: number;
    connectedOpenVulns: number;
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
  INACTIVE: "border-slate-400/35 bg-slate-500/10 text-[var(--text-secondary)]",
  MAINTENANCE: "border-yellow-400/35 bg-yellow-500/10 text-yellow-200",
  DECOMMISSIONED: "border-red-400/35 bg-red-500/10 text-red-200",
};

const criticalityTones: Record<AssetCriticality, string> = {
  CRITICAL: "border-red-400/35 bg-red-500/10 text-red-200",
  HIGH: "border-orange-400/35 bg-orange-500/10 text-orange-200",
  MEDIUM: "border-yellow-400/35 bg-yellow-500/10 text-yellow-200",
  LOW: "border-emerald-400/35 bg-emerald-500/10 text-emerald-200",
  INFORMATIONAL: "border-slate-400/35 bg-slate-500/10 text-[var(--text-secondary)]",
};

const numberFormatter = new Intl.NumberFormat("en-US");

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("ALL");

  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 20,
    totalPages: 1,
    total: 0,
  });

  const [summary, setSummary] = useState<AssetsResponse["summary"] | null>(null);
  const [groups, setGroups] = useState<AssetGroupRecord[]>([]);
  const [relationships, setRelationships] = useState<AssetRelationshipRecord[]>([]);
  const [impact, setImpact] = useState<AssetImpactResponse | null>(null);
  const [impactAssetId, setImpactAssetId] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [bulkOperation, setBulkOperation] = useState<"set_status" | "set_owner" | "set_tags">(
    "set_status",
  );
  const [bulkValue, setBulkValue] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isDiscoveryModalOpen, setIsDiscoveryModalOpen] = useState(false);
  const [discoveryMode, setDiscoveryMode] = useState<"nmap" | "json">("nmap");
  const [discoverySource, setDiscoverySource] = useState("manual-import");
  const [discoveryPayload, setDiscoveryPayload] = useState("");
  const [isLifecycleModalOpen, setIsLifecycleModalOpen] = useState(false);
  const [lifecycleAsset, setLifecycleAsset] = useState<Asset | null>(null);
  const [lifecycleAction, setLifecycleAction] = useState<
    "transfer" | "decommission" | "ownership_change" | "reactivate"
  >("transfer");
  const [lifecycleToEnvironment, setLifecycleToEnvironment] = useState("PRODUCTION");
  const [lifecycleToOwner, setLifecycleToOwner] = useState("");
  const [lifecycleNotes, setLifecycleNotes] = useState("");
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
        if (selectedTag.trim()) params.set("tag", selectedTag.trim());
        if (selectedGroupId !== "ALL") params.set("groupId", selectedGroupId);

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
      selectedTag,
      selectedGroupId,
    ],
  );

  const refreshAssets = useCallback(async () => {
    await fetchAssets({ silent: true });
  }, [fetchAssets]);

  const fetchGroups = useCallback(async () => {
    try {
      const response = await fetch("/api/assets/groups", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { data?: AssetGroupRecord[] };
      setGroups(payload.data || []);
    } catch {
      // Non-blocking UI helper
    }
  }, []);

  const fetchRelationships = useCallback(async () => {
    try {
      const response = await fetch("/api/assets/relationships", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { data?: AssetRelationshipRecord[] };
      setRelationships(payload.data || []);
    } catch {
      // Non-blocking UI helper
    }
  }, []);

  const fetchImpact = useCallback(async (assetId: string) => {
    try {
      const response = await fetch(`/api/assets/${assetId}/impact`, { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as AssetImpactResponse;
      setImpact(payload);
      setImpactAssetId(assetId);
    } catch {
      // Non-blocking UI helper
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchAssets();
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchAssets]);

  useEffect(() => {
    void fetchGroups();
    void fetchRelationships();
  }, [fetchGroups, fetchRelationships]);

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
    setSelectedTag("");
    setSelectedGroupId("ALL");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const exportData = useCallback(
    async (format: "csv" | "xlsx") => {
      try {
        setActionError(null);
        const response = await fetch(`/api/exports/assets?format=${format}`);
        if (!response.ok) {
          throw new Error("Failed to export assets");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `assets.${format}`;
        link.click();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to export assets");
      }
    },
    [],
  );

  const toggleAssetSelection = useCallback((assetId: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId],
    );
  }, []);

  const runBulkOperation = useCallback(async () => {
    if (!selectedAssetIds.length) return;

    try {
      setActionError(null);
      const response = await fetch("/api/assets/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetIds: selectedAssetIds,
          operation: bulkOperation,
          status: bulkOperation === "set_status" ? bulkValue : undefined,
          owner: bulkOperation === "set_owner" ? bulkValue : undefined,
          tags:
            bulkOperation === "set_tags"
              ? bulkValue
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
              : undefined,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to apply bulk operation");
      }

      setSelectedAssetIds([]);
      setBulkValue("");
      await fetchAssets({ silent: true });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to apply bulk operation");
    }
  }, [bulkOperation, bulkValue, fetchAssets, selectedAssetIds]);

  const submitDiscoveryImport = useCallback(async () => {
    try {
      setActionError(null);

      if (discoveryMode === "nmap") {
        const response = await fetch("/api/assets/discovery/nmap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ xml: discoveryPayload }),
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to import Nmap XML");
        }
      } else {
        const parsed = JSON.parse(discoveryPayload) as unknown;
        const assetsPayload = Array.isArray(parsed)
          ? parsed
          : typeof parsed === "object" && parsed && "assets" in parsed
            ? (parsed as { assets: unknown }).assets
            : parsed;

        const response = await fetch("/api/assets/discovery/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: discoverySource || "manual-import",
            assets: assetsPayload,
            rawInput: { importedAt: new Date().toISOString() },
          }),
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to import discovery payload");
        }
      }

      setIsDiscoveryModalOpen(false);
      setDiscoveryPayload("");
      await fetchAssets({ silent: true });
      await fetchRelationships();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to import discovery payload");
    }
  }, [discoveryMode, discoveryPayload, discoverySource, fetchAssets, fetchRelationships]);

  const submitLifecycleAction = useCallback(async () => {
    if (!lifecycleAsset) return;

    try {
      setActionError(null);
      const response = await fetch(`/api/assets/${lifecycleAsset.id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: lifecycleAction,
          toEnvironment: lifecycleAction === "transfer" ? lifecycleToEnvironment : undefined,
          toOwner: lifecycleAction === "ownership_change" ? lifecycleToOwner : undefined,
          notes: lifecycleNotes || undefined,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to apply lifecycle action");
      }

      setIsLifecycleModalOpen(false);
      setLifecycleAsset(null);
      setLifecycleNotes("");
      await fetchAssets({ silent: true });
      await fetchImpact(lifecycleAsset.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to apply lifecycle action");
    }
  }, [
    fetchAssets,
    fetchImpact,
    lifecycleAction,
    lifecycleAsset,
    lifecycleNotes,
    lifecycleToEnvironment,
    lifecycleToOwner,
  ]);

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

  if (isLoading && assets.length === 0) {
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
          title="Asset Inventory"
          description="Keep asset context, ownership, and exposure status centralized for faster SOC triage and cleaner operational decisions."
          badge={
            <>
              <Sparkles size={13} />
              Asset Operations Workspace
            </>
          }
          actions={
            <>
              <button
                type="button"
                onClick={() => void exportData("csv")}
                disabled={!assets.length}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--bg-elevated)] hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={14} />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => void exportData("xlsx")}
                disabled={!assets.length}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--bg-elevated)] hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={14} />
                Export XLSX
              </button>
              <button
                type="button"
                onClick={() => setIsDiscoveryModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--bg-elevated)] hover:scale-105 active:scale-95"
              >
                <UploadCloud size={14} />
                Discovery Import
              </button>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="btn btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Plus size={14} />
                Add Asset
              </button>
            </>
          }
          stats={[
            {
              label: "Total Assets",
              value: numberFormatter.format(pagination.total),
              trend: { value: `${pagination.totalPages} pages indexed`, neutral: true },
              icon: Server,
            },
            {
              label: "Active (page)",
              value: numberFormatter.format(activeOnPage),
              trend: { value: "Live operational assets", neutral: true },
              icon: CheckCircle2,
            },
            {
              label: "Critical (page)",
              value: numberFormatter.format(criticalOnPage),
              trend: { value: "High business sensitivity", neutral: true },
              icon: AlertTriangle,
            },
            {
              label: "Vuln Exposure",
              value: numberFormatter.format(vulnOnPage),
              trend: { value: "Assets needing remediation", neutral: true },
              icon: XCircle,
            },
          ]}
        />

        {actionError ? (
          <section className="rounded-2xl border border-red-400/25 bg-red-500/5 p-3 text-sm text-red-200">
            {actionError}
          </section>
        ) : null}

        {selectedAssetIds.length > 0 ? (
          <section className="rounded-2xl border border-sky-300/30 bg-sky-500/10 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm text-sky-100">
                {selectedAssetIds.length} asset{selectedAssetIds.length > 1 ? "s" : ""} selected
              </p>
              <div className="grid gap-2 sm:grid-cols-[150px_1fr_auto]">
                <select
                  value={bulkOperation}
                  onChange={(event) =>
                    setBulkOperation(event.target.value as "set_status" | "set_owner" | "set_tags")
                  }
                  className="input h-10 text-sm"
                >
                  <option value="set_status">Set Status</option>
                  <option value="set_owner">Set Owner</option>
                  <option value="set_tags">Set Tags</option>
                </select>
                <input
                  className="input h-10 text-sm"
                  value={bulkValue}
                  onChange={(event) => setBulkValue(event.target.value)}
                  placeholder={
                    bulkOperation === "set_status"
                      ? "ACTIVE | INACTIVE | MAINTENANCE | DECOMMISSIONED"
                      : bulkOperation === "set_owner"
                        ? "new owner"
                        : "comma,separated,tags"
                  }
                />
                <button
                  type="button"
                  onClick={() => void runBulkOperation()}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-sky-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-sky-200"
                >
                  Apply
                </button>
              </div>
            </div>
          </section>
        ) : null}


        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.9fr_0.9fr_auto]">
            <label className="relative block">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors duration-200"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                placeholder="Search by name, IP, or hostname"
                className="input h-10 w-full !pl-9 text-sm transition-all duration-200 focus:ring-2 focus:ring-sky-300/30 text-[var(--text-primary)] placeholder-[var(--text-muted)] border-[var(--border-color)] bg-[var(--bg-secondary)]"
              />
            </label>

            <label className="relative block">
              <Box
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors duration-200"
              />
              <select
                value={selectedType}
                onChange={(event) => {
                  setSelectedType(event.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="input h-10 w-full appearance-none !pl-9 text-sm transition-all duration-200 focus:ring-2 focus:ring-sky-300/30 text-[var(--text-primary)] border-[var(--border-color)] bg-[var(--bg-secondary)]"
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
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-colors duration-200"
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

            <input
              type="text"
              value={selectedTag}
              onChange={(event) => {
                setSelectedTag(event.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              placeholder="Filter tag"
              className="input h-10 w-full text-sm transition-all duration-200 focus:ring-2 focus:ring-sky-300/30"
            />

            <select
              value={selectedGroupId}
              onChange={(event) => {
                setSelectedGroupId(event.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="input h-10 w-full appearance-none text-sm transition-all duration-200 focus:ring-2 focus:ring-sky-300/30"
            >
              <option value="ALL">All Groups</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-[var(--text-secondary)] transition-all duration-200 hover:bg-white/10 hover:scale-105 active:scale-95"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => void refreshAssets()}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-[var(--text-secondary)] transition-all duration-200 hover:bg-white/10 hover:scale-105 active:scale-95"
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
                  : "text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)]",
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
                  : "text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)]",
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
              <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Type Distribution</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Current filtered inventory mix.</p>
                <div className="mt-4">
                  {typeDistribution.length > 0 ? (
                    <AssetTypeChart data={typeDistribution} />
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-[var(--text-muted)]">
                      No type distribution data available.
                    </div>
                  )}
                </div>
              </article>

              <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Environment Coverage</h2>
                <div className="mt-4 space-y-3">
                  {environmentBreakdown.length > 0 ? (
                    environmentBreakdown.map((env, index) => (
                      <div key={env.name} className="animate-in fade-in slide-in-from-right-2 duration-300" style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">{formatLabel(env.name)}</span>
                          <span className="text-[var(--text-muted)]">
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
                    <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-[var(--text-muted)]">
                      No environment breakdown available.
                    </p>
                  )}
                </div>
              </article>
            </div>
          </section>
        ) : (
          <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <article className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
              <header className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Asset List</h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    Showing {assets.length} of {numberFormatter.format(pagination.total)} assets
                  </p>
                </div>
                <div className="text-xs text-slate-500">Page {pagination.page}</div>
              </header>

              {assets.length === 0 ? (
                <div className="p-16 text-center">
                  <Server className="mx-auto h-12 w-12 text-slate-600" />
                  <p className="mt-4 text-sm text-[var(--text-muted)]">No assets match current filters.</p>
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
                          <button
                            type="button"
                            onClick={() => toggleAssetSelection(asset.id)}
                            className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-[var(--text-muted)] transition hover:bg-white/10 hover:text-[var(--text-secondary)]"
                          >
                            {selectedAssetIds.includes(asset.id) ? (
                              <CheckSquare size={14} className="text-sky-200" />
                            ) : (
                              <Square size={14} />
                            )}
                          </button>

                          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5 transition-all duration-200 group-hover:border-sky-300/30 group-hover:bg-sky-300/10 group-hover:scale-110">
                            <Icon size={18} className="text-sky-300 transition-transform duration-200 group-hover:rotate-12" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-sm font-medium text-[var(--text-primary)]">{asset.name}</h3>
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

                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
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
                              <button
                                type="button"
                                onClick={() => void fetchImpact(asset.id)}
                                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-[var(--text-secondary)] transition hover:bg-white/[0.08]"
                              >
                                <Network size={11} />
                                Impact
                              </button>
                            </div>

                            {asset.tags?.length ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {asset.tags.slice(0, 4).map((tag) => (
                                  <span
                                    key={`${asset.id}-${tag}`}
                                    className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-[var(--text-muted)]"
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
                          <button
                            type="button"
                            onClick={() => {
                              setLifecycleAsset(asset);
                              setLifecycleAction("transfer");
                              setLifecycleToEnvironment(asset.environment);
                              setLifecycleToOwner(asset.owner || "");
                              setLifecycleNotes("");
                              setIsLifecycleModalOpen(true);
                            }}
                            className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-[var(--text-secondary)] transition hover:bg-white/[0.08]"
                          >
                            Lifecycle
                          </button>
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
                    className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-all duration-200 hover:bg-white/10 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-all duration-200 hover:bg-white/10 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                </div>
              </footer>
            </article>

            <div className="space-y-4">
              <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Type Distribution</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Current filtered inventory mix.</p>
                <div className="mt-4">
                  {typeDistribution.length > 0 ? (
                    <AssetTypeChart data={typeDistribution} />
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-[var(--text-muted)]">
                      No type distribution data available.
                    </div>
                  )}
                </div>
              </article>

              <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Environment Breakdown</h2>
                <div className="mt-4 space-y-3">
                  {environmentBreakdown.length > 0 ? (
                    environmentBreakdown.map((env, index) => (
                      <div key={env.name} className="animate-in fade-in slide-in-from-right-2 duration-300" style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-[var(--text-secondary)]">{formatLabel(env.name)}</span>
                          <span className="text-[var(--text-muted)]">
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
                    <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-[var(--text-muted)]">
                      No environment breakdown available.
                    </p>
                  )}
                </div>
              </article>

              <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: '500ms', animationFillMode: 'backwards' }}>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Recently Added</h2>
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
                            <p className="truncate text-sm text-[var(--text-secondary)]">{asset.name}</p>
                            <p className="text-xs text-slate-500">
                              {formatLabel(asset.type)} · {formatLabel(asset.environment)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!assets.length ? (
                    <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-[var(--text-muted)]">
                      No assets available.
                    </p>
                  ) : null}
                </div>
              </article>

              <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: '600ms', animationFillMode: 'backwards' }}>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Relationships</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Dependency mapping and impact summary.
                </p>
                <div className="mt-3 space-y-2">
                  {relationships.slice(0, 6).map((relationship) => (
                    <div
                      key={relationship.id}
                      className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs text-[var(--text-secondary)]"
                    >
                      <p className="font-medium">
                        {relationship.parentAsset.name} {formatLabel(relationship.relationshipType)}{" "}
                        {relationship.childAsset.name}
                      </p>
                    </div>
                  ))}
                  {relationships.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-white/15 p-3 text-xs text-slate-500">
                      No relationships created yet.
                    </p>
                  ) : null}
                </div>

                {impact ? (
                  <div className="mt-4 rounded-xl border border-sky-300/25 bg-sky-300/10 p-3">
                    <p className="text-xs text-sky-100">
                      Impact Summary {impactAssetId ? `(Asset ${impactAssetId.slice(0, 8)}...)` : ""}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)]">
                      <span>Relationships: {impact.summary.relationships}</span>
                      <span>Connected: {impact.summary.connectedAssets}</span>
                      <span>Critical deps: {impact.summary.criticalDependencies}</span>
                      <span>Open vulns: {impact.summary.connectedOpenVulns}</span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">
                    Click `Impact` on an asset row to view blast-radius metrics.
                  </p>
                )}
              </article>
            </div>
          </section>
        )}
      </div>

      <Modal
        isOpen={isDiscoveryModalOpen}
        onClose={() => setIsDiscoveryModalOpen(false)}
        title="Discovery Import"
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn btn-secondary" onClick={() => setIsDiscoveryModalOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => void submitDiscoveryImport()}
              disabled={!discoveryPayload.trim()}
            >
              Import
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-[var(--text-primary)]">Mode</label>
              <select
                className="input"
                value={discoveryMode}
                onChange={(event) => setDiscoveryMode(event.target.value as "nmap" | "json")}
              >
                <option value="nmap">Nmap XML</option>
                <option value="json">Normalized JSON</option>
              </select>
            </div>
            {discoveryMode === "json" ? (
              <div>
                <label className="mb-1 block text-sm text-[var(--text-primary)]">Source</label>
                <input
                  className="input"
                  value={discoverySource}
                  onChange={(event) => setDiscoverySource(event.target.value)}
                />
              </div>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-sm text-[var(--text-primary)]">
              {discoveryMode === "nmap" ? "Nmap XML" : "JSON payload"}
            </label>
            <textarea
              className="input min-h-[260px] font-mono text-xs"
              placeholder={
                discoveryMode === "nmap"
                  ? "<nmaprun>...</nmaprun>"
                  : '{"assets":[{"name":"host-1","type":"SERVER"}]}'
              }
              value={discoveryPayload}
              onChange={(event) => setDiscoveryPayload(event.target.value)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isLifecycleModalOpen}
        onClose={() => setIsLifecycleModalOpen(false)}
        title="Asset Lifecycle Action"
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn btn-secondary" onClick={() => setIsLifecycleModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={() => void submitLifecycleAction()}>
              Apply
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-muted)]">
            Asset: {lifecycleAsset?.name || "N/A"} ({lifecycleAsset?.id || "N/A"})
          </p>
          <div>
            <label className="mb-1 block text-sm text-[var(--text-primary)]">Action</label>
            <select
              className="input"
              value={lifecycleAction}
              onChange={(event) =>
                setLifecycleAction(
                  event.target.value as
                  | "transfer"
                  | "decommission"
                  | "ownership_change"
                  | "reactivate",
                )
              }
            >
              <option value="transfer">Transfer Environment</option>
              <option value="ownership_change">Change Ownership</option>
              <option value="decommission">Decommission</option>
              <option value="reactivate">Reactivate</option>
            </select>
          </div>
          {lifecycleAction === "transfer" ? (
            <div>
              <label className="mb-1 block text-sm text-[var(--text-primary)]">Target Environment</label>
              <select
                className="input"
                value={lifecycleToEnvironment}
                onChange={(event) => setLifecycleToEnvironment(event.target.value)}
              >
                <option value="PRODUCTION">PRODUCTION</option>
                <option value="STAGING">STAGING</option>
                <option value="DEVELOPMENT">DEVELOPMENT</option>
                <option value="TESTING">TESTING</option>
                <option value="DR">DR</option>
              </select>
            </div>
          ) : null}
          {lifecycleAction === "ownership_change" ? (
            <div>
              <label className="mb-1 block text-sm text-[var(--text-primary)]">New Owner</label>
              <input
                className="input"
                value={lifecycleToOwner}
                onChange={(event) => setLifecycleToOwner(event.target.value)}
              />
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-sm text-[var(--text-primary)]">Notes</label>
            <textarea
              className="input min-h-[100px]"
              value={lifecycleNotes}
              onChange={(event) => setLifecycleNotes(event.target.value)}
            />
          </div>
        </div>
      </Modal>

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
