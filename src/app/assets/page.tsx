"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, SeverityBadge, ProgressBar } from "@/components/ui/Cards";
import { AssetTypeChart } from "@/components/charts/DashboardCharts";
import {
    Server,
    Cloud,
    Database,
    Globe,
    Box,
    Monitor,
    Router,
    Plus,
    Search,
    Filter,
    Download,
    MoreVertical,
    ChevronDown,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    MapPin,
    Map as MapIcon,
    LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Asset } from "@/types";
import { LoadingBar } from "@/components/ui/LoadingBar";
import { SecurityLoader } from "@/components/ui/SecurityLoader";

const assetTypeIcons: Record<string, any> = {
    SERVER: Server,
    CLOUD_INSTANCE: Cloud,
    DATABASE: Database,
    APPLICATION: Globe,
    CONTAINER: Box,
    WORKSTATION: Monitor,
    NETWORK_DEVICE: Router,
};

const statusColors: Record<string, { bg: string; text: string; icon: any }> = {
    ACTIVE: { bg: "bg-green-500/10", text: "text-green-400", icon: CheckCircle },
    INACTIVE: { bg: "bg-gray-500/10", text: "text-gray-400", icon: XCircle },
    MAINTENANCE: { bg: "bg-yellow-500/10", text: "text-yellow-400", icon: Clock },
    DECOMMISSIONED: { bg: "bg-red-500/10", text: "text-red-400", icon: XCircle },
};

import { AssetActions } from "@/components/assets/AssetActions";
import { AddAssetModal } from "@/components/assets/AddAssetModal";
import { EditAssetModal } from "@/components/assets/EditAssetModal";
import { AssetMap } from "@/components/charts/AssetMap";

export default function AssetsPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [summary, setSummary] = useState<any>(null);

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    const fetchAssets = async () => {
        try {
            setIsLoading(true);
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                search: searchQuery,
            });
            if (selectedType) params.append("type", selectedType);

            const response = await fetch(`/api/assets?${params.toString()}`);
            const result = await response.json();
            setAssets(result.data);
            setPagination(prev => ({ ...prev, ...result.pagination }));
            setSummary(result.summary);
        } catch (error) {
            console.error("Failed to fetch assets:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            setDeletingId(id);
            const response = await fetch(`/api/assets/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to delete asset");
            }

            fetchAssets();
        } catch (error: any) {
            console.error("Delete error:", error);
            alert(`Delete failed: ${error.message}`);
        } finally {
            setDeletingId(null);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAssets();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, selectedType, pagination.page]);

    const stats = {
        total: pagination.total,
        active: assets.filter((a) => a.status === "ACTIVE").length,
        critical: assets.filter((a) => a.criticality === "CRITICAL").length,
        withVulns: assets.filter((a) => (a.vulnerabilityCount || 0) > 0).length,
    };

    return (
        <DashboardLayout>
            {/* Loading Bar */}
            <LoadingBar
                position="top"
                variant="cyber"
                isLoading={isLoading}
                showGlow={true}
            />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Asset Inventory</h1>
                        <p className="text-[var(--text-secondary)] mt-1">
                            Manage and monitor all assets across your organization
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="btn btn-secondary" onClick={() => {
                            const csv = [
                                ["Name", "Type", "Status", "Criticality", "IP Address", "Hostname", "Location", "Cloud Region"].join(","),
                                ...assets.map(a => [a.name, a.type, a.status, a.criticality, a.ipAddress, a.hostname, a.location || "", a.cloudRegion || ""].join(","))
                            ].join("\n");
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'assets.csv';
                            a.click();
                        }}>
                            <Download size={16} />
                            Export
                        </button>
                        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
                            <Plus size={16} />
                            Add Asset
                        </button>
                    </div>
                </div>

                {/* View Toggles */}
                <div className="flex bg-[var(--bg-tertiary)] p-1 rounded-xl w-fit border border-[var(--border-color)]">
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                            viewMode === 'list'
                                ? "bg-blue-500 text-white shadow-lg"
                                : "text-[var(--text-muted)] hover:text-white"
                        )}
                    >
                        <LayoutGrid size={16} />
                        List View
                    </button>
                    <button
                        onClick={() => setViewMode('map')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                            viewMode === 'map'
                                ? "bg-blue-500 text-white shadow-lg"
                                : "text-[var(--text-muted)] hover:text-white"
                        )}
                    >
                        <MapIcon size={16} />
                        Map View
                    </button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Server size={18} className="text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stats.total}</p>
                                <p className="text-xs text-[var(--text-muted)]">Total Assets</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/10">
                                <CheckCircle size={18} className="text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stats.active}</p>
                                <p className="text-xs text-[var(--text-muted)]">Active</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-500/10">
                                <AlertTriangle size={18} className="text-red-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stats.critical}</p>
                                <p className="text-xs text-[var(--text-muted)]">Critical Assets</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-orange-500/10">
                                <AlertTriangle size={18} className="text-orange-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{stats.withVulns}</p>
                                <p className="text-xs text-[var(--text-muted)]">With Vulnerabilities</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                {viewMode === 'map' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <AssetMap assets={assets} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Asset List */}
                        <div className="lg:col-span-8">
                            <Card noPadding>
                                {/* Filters */}
                                <div className="p-4 border-b border-[var(--border-color)] flex flex-col md:flex-row gap-4">
                                    <div className="relative flex-1">
                                        <Search
                                            size={16}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Search assets by name or IP..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="input pl-9 py-2 text-sm"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="btn btn-secondary text-sm py-2">
                                            <Filter size={14} />
                                            Filters
                                            <ChevronDown size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Asset Type Tabs */}
                                <div className="px-4 py-3 border-b border-[var(--border-color)] flex gap-2 overflow-x-auto">
                                    <button
                                        onClick={() => setSelectedType(null)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-300 ease-in-out",
                                            !selectedType
                                                ? "bg-blue-500/20 text-blue-400"
                                                : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
                                        )}
                                    >
                                        All Types
                                    </button>
                                    {["SERVER", "CLOUD_INSTANCE", "CONTAINER", "DATABASE", "APPLICATION", "NETWORK_DEVICE"].map(
                                        (type) => {
                                            const Icon = assetTypeIcons[type] || Server;
                                            return (
                                                <button
                                                    key={type}
                                                    onClick={() => setSelectedType(type)}
                                                    className={cn(
                                                        "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-300 ease-in-out flex items-center gap-1.5",
                                                        selectedType === type
                                                            ? "bg-blue-500/20 text-blue-400"
                                                            : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
                                                    )}
                                                >
                                                    <Icon size={12} />
                                                    {type.replace(/_/g, " ")}
                                                </button>
                                            );
                                        }
                                    )}
                                </div>

                                {/* Asset List */}
                                <div className="divide-y divide-[var(--border-color)]">
                                    {isLoading ? (
                                        <div className="p-20 flex flex-col items-center justify-center gap-4">
                                            <SecurityLoader
                                                size="lg"
                                                icon="shield"
                                                variant="cyber"
                                                text="Fetching assets..."
                                            />
                                        </div>
                                    ) : assets.length === 0 ? (
                                        <div className="p-20 text-center">
                                            <Server className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4 opacity-20" />
                                            <p className="text-[var(--text-secondary)]">No assets found matching your criteria.</p>
                                        </div>
                                    ) : (
                                        assets.map((asset) => {
                                            const Icon = assetTypeIcons[asset.type] || Server;
                                            const status = statusColors[asset.status] || statusColors.ACTIVE;
                                            const StatusIcon = status.icon;

                                            return (
                                                <div
                                                    key={asset.id}
                                                    className="p-4 hover:bg-[var(--bg-tertiary)] transition-all duration-300 ease-in-out cursor-pointer"
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className="p-2.5 rounded-lg bg-[var(--bg-tertiary)]">
                                                            <Icon size={20} className="text-blue-400" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h3 className="font-medium text-white truncate">
                                                                    {asset.name}
                                                                </h3>
                                                                <SeverityBadge severity={asset.criticality} size="sm" />
                                                                <span
                                                                    className={cn(
                                                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium",
                                                                        status.bg,
                                                                        status.text
                                                                    )}
                                                                >
                                                                    <StatusIcon size={10} />
                                                                    {asset.status}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                                                                {asset.ipAddress && <span>IP: {asset.ipAddress}</span>}
                                                                {asset.hostname && <span>Host: {asset.hostname}</span>}
                                                                <div className="flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                                    {asset.environment}
                                                                </div>
                                                                {asset.location && (
                                                                    <div className="flex items-center gap-1">
                                                                        <MapPin size={10} className="text-red-400" />
                                                                        {asset.location}
                                                                    </div>
                                                                )}
                                                                {asset.cloudRegion && (
                                                                    <div className="flex items-center gap-1">
                                                                        <Cloud size={10} className="text-blue-400" />
                                                                        {asset.cloudRegion}
                                                                    </div>
                                                                )}
                                                                {asset.department && <span>{asset.department}</span>}
                                                            </div>
                                                            {asset.tags && asset.tags.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-2">
                                                                    {asset.tags.map((tag) => (
                                                                        <span
                                                                            key={tag}
                                                                            className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[10px] text-[var(--text-muted)]"
                                                                        >
                                                                            {tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="text-right hidden md:block">
                                                            {asset.vulnerabilityCount && asset.vulnerabilityCount > 0 ? (
                                                                <div className="flex items-center gap-1 text-orange-400">
                                                                    <AlertTriangle size={14} />
                                                                    <span className="text-sm font-medium">
                                                                        {asset.vulnerabilityCount}
                                                                    </span>
                                                                    <span className="text-xs text-[var(--text-muted)]">vulns</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-green-400">No vulnerabilities</span>
                                                            )}
                                                        </div>
                                                        <AssetActions
                                                            asset={asset}
                                                            onEdit={() => {
                                                                setEditingAsset(asset);
                                                                setIsEditModalOpen(true);
                                                            }}
                                                            onDelete={() => handleDelete(asset.id)}
                                                            isDeleting={deletingId === asset.id}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Pagination */}
                                <div className="p-4 border-t border-[var(--border-color)] flex items-center justify-between">
                                    <span className="text-sm text-[var(--text-muted)]">
                                        Showing {assets.length} of {pagination.total} assets
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            className="btn btn-secondary text-sm py-1.5 px-3"
                                            disabled={pagination.page <= 1 || isLoading}
                                            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                        >
                                            Previous
                                        </button>
                                        <button
                                            className="btn btn-secondary text-sm py-1.5 px-3"
                                            disabled={pagination.page >= pagination.totalPages || isLoading}
                                            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-4 space-y-4">
                            <Card title="Asset Distribution" subtitle="By type">
                                {summary?.typeDistribution ? (
                                    <AssetTypeChart data={summary.typeDistribution} />
                                ) : (
                                    <div className="h-[200px] flex items-center justify-center">
                                        <SecurityLoader size="md" icon="shield" variant="cyber" />
                                    </div>
                                )}
                            </Card>

                            <Card title="Environment Breakdown">
                                <div className="space-y-3">
                                    {summary?.environmentBreakdown?.map((env: any) => (
                                        <div key={env.name}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm text-[var(--text-secondary)]">
                                                    {env.name}
                                                </span>
                                                <span className="text-sm font-medium text-white">{env.count}</span>
                                            </div>
                                            <ProgressBar value={env.percentage} showLabel={false} color="#3b82f6" />
                                        </div>
                                    )) || (
                                            <div className="py-10 text-center text-xs text-[var(--text-muted)]">
                                                Loading breakdown...
                                            </div>
                                        )}
                                </div>
                            </Card>

                            <Card title="Recently Added">
                                <div className="space-y-3">
                                    {assets.slice(0, 3).map((asset) => {
                                        const Icon = assetTypeIcons[asset.type] || Server;
                                        return (
                                            <div
                                                key={asset.id}
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer"
                                            >
                                                <div className="p-1.5 rounded-lg bg-[var(--bg-tertiary)]">
                                                    <Icon size={14} className="text-blue-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-white truncate">{asset.name}</p>
                                                    <p className="text-xs text-[var(--text-muted)]">
                                                        New asset detected
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <AddAssetModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchAssets}
            />
            {editingAsset && (
                <EditAssetModal
                    isOpen={isEditModalOpen}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setEditingAsset(null);
                    }}
                    onSuccess={fetchAssets}
                    asset={editingAsset}
                />
            )}
        </DashboardLayout>
    );
}
