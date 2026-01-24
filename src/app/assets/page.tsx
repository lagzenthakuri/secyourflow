"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, SeverityBadge, ProgressBar } from "@/components/ui/Cards";
import { mockAssets, mockAssetTypeDistribution } from "@/lib/mock-data";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const assetTypeIcons: Record<string, typeof Server> = {
    SERVER: Server,
    CLOUD_INSTANCE: Cloud,
    DATABASE: Database,
    APPLICATION: Globe,
    CONTAINER: Box,
    WORKSTATION: Monitor,
    NETWORK_DEVICE: Router,
};

const statusColors: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
    ACTIVE: { bg: "bg-green-500/10", text: "text-green-400", icon: CheckCircle },
    INACTIVE: { bg: "bg-gray-500/10", text: "text-gray-400", icon: XCircle },
    MAINTENANCE: { bg: "bg-yellow-500/10", text: "text-yellow-400", icon: Clock },
    DECOMMISSIONED: { bg: "bg-red-500/10", text: "text-red-400", icon: XCircle },
};

export default function AssetsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedType, setSelectedType] = useState<string | null>(null);

    const filteredAssets = mockAssets.filter((asset) => {
        const matchesSearch =
            asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            asset.ipAddress?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = !selectedType || asset.type === selectedType;
        return matchesSearch && matchesType;
    });

    const stats = {
        total: mockAssets.length,
        active: mockAssets.filter((a) => a.status === "ACTIVE").length,
        critical: mockAssets.filter((a) => a.criticality === "CRITICAL").length,
        withVulns: mockAssets.filter((a) => (a.vulnerabilityCount || 0) > 0).length,
    };

    return (
        <DashboardLayout>
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
                        <button className="btn btn-secondary">
                            <Download size={16} />
                            Export
                        </button>
                        <button className="btn btn-primary">
                            <Plus size={16} />
                            Add Asset
                        </button>
                    </div>
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
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
                                        "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
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
                                                    "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
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
                                {filteredAssets.map((asset) => {
                                    const Icon = assetTypeIcons[asset.type] || Server;
                                    const status = statusColors[asset.status] || statusColors.ACTIVE;
                                    const StatusIcon = status.icon;

                                    return (
                                        <div
                                            key={asset.id}
                                            className="p-4 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
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
                                                        <span>{asset.environment}</span>
                                                        {asset.department && <span>{asset.department}</span>}
                                                    </div>
                                                    {asset.tags.length > 0 && (
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
                                                <button className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                                                    <MoreVertical size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            <div className="p-4 border-t border-[var(--border-color)] flex items-center justify-between">
                                <span className="text-sm text-[var(--text-muted)]">
                                    Showing {filteredAssets.length} of {mockAssets.length} assets
                                </span>
                                <div className="flex gap-2">
                                    <button className="btn btn-secondary text-sm py-1.5 px-3" disabled>
                                        Previous
                                    </button>
                                    <button className="btn btn-secondary text-sm py-1.5 px-3">
                                        Next
                                    </button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-4">
                        <Card title="Asset Distribution" subtitle="By type">
                            <AssetTypeChart data={mockAssetTypeDistribution} />
                        </Card>

                        <Card title="Environment Breakdown">
                            <div className="space-y-3">
                                {[
                                    { name: "Production", count: 847, percentage: 68 },
                                    { name: "Staging", count: 198, percentage: 16 },
                                    { name: "Development", count: 156, percentage: 12 },
                                    { name: "Testing", count: 46, percentage: 4 },
                                ].map((env) => (
                                    <div key={env.name}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm text-[var(--text-secondary)]">
                                                {env.name}
                                            </span>
                                            <span className="text-sm font-medium text-white">{env.count}</span>
                                        </div>
                                        <ProgressBar value={env.percentage} showLabel={false} color="#3b82f6" />
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card title="Recently Added">
                            <div className="space-y-3">
                                {mockAssets.slice(0, 3).map((asset) => {
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
                                                    Added 2 days ago
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
