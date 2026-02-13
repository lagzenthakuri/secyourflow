"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Cards";
import {
    Scan,
    Plus,
    Play,
    Pause,
    Settings,
    RefreshCw,
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    ChevronRight,
    FileJson,
    Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { Modal } from "@/components/ui/Modal";

const statusConfig = {
    active: { label: "Active", color: "#22c55e", icon: CheckCircle },
    syncing: { label: "Syncing", color: "#3b82f6", icon: RefreshCw },
    error: { label: "Error", color: "#ef4444", icon: XCircle },
    inactive: { label: "Inactive", color: "#6b7280", icon: Pause },
};

const scanStatusConfig = {
    completed: { label: "Completed", color: "#22c55e", icon: CheckCircle },
    running: { label: "Running", color: "#3b82f6", icon: RefreshCw },
    failed: { label: "Failed", color: "#ef4444", icon: XCircle },
    pending: { label: "Pending", color: "#eab308", icon: Clock },
};

interface Scanner {
    id: string;
    name: string;
    type: string;
    status: keyof typeof statusConfig;
    lastSync?: string | null;
    syncInterval?: string | null;
    assetsScanned?: number;
    vulnsFound?: number;
    error?: string | null;
}

interface RecentScan {
    id: string;
    name: string;
    scanner: string;
    status: keyof typeof scanStatusConfig;
    startTime: string;
    duration: string;
    hosts: number;
    vulns: number;
}

interface AssetOption {
    id: string;
    name: string;
    ipAddress?: string | null;
    hostname?: string | null;
}

export default function ScannersPage() {
    const [activeTab, setActiveTab] = useState<"scanners" | "scans" | "import">("scanners");
    const [scanners, setScanners] = useState<Scanner[]>([]);
    const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [assets, setAssets] = useState<AssetOption[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [scanConfig, setScanConfig] = useState({
        assetId: "",
        scannerId: "",
        apiKey: "",
        model: "google/gemini-2.0-flash-001"
    });

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [scannersRes, scansRes] = await Promise.all([
                fetch("/api/scanners"),
                fetch("/api/scans?limit=10")
            ]);

            const scannersData = await scannersRes.json() as Scanner[];
            const scansData = await scansRes.json() as RecentScan[];

            if (Array.isArray(scannersData)) setScanners(scannersData);
            if (Array.isArray(scansData)) setRecentScans(scansData);
        } catch (error) {
            console.error("Failed to fetch scanner data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            const res = await fetch("/api/assets?limit=100");
            const data = await res.json() as { data?: AssetOption[] };
            if (data.data) setAssets(data.data);
        } catch (error) {
            console.error("Failed to fetch assets:", error);
        }
    };

    const handleRunScan = async () => {
        if (!scanConfig.assetId) return;

        try {
            setIsScanning(true);
            const res = await fetch("/api/scans/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(scanConfig),
            });

            const data = await res.json();
            if (res.ok) {
                alert(`Scan completed! Found ${data.vulnerabilitiesFound} vulnerabilities.`);
                setIsAddModalOpen(false);
                fetchData(); // Refresh scans
            } else {
                alert(`Scan failed: ${data.error}`);
            }
        } catch (error) {
            console.error("Scan error:", error);
            alert("An error occurred during scanning.");
        } finally {
            setIsScanning(false);
        }
    };

    const handleDeleteScanner = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this scanner? This action cannot be undone.")) return;

        try {
            setIsLoading(true);
            const res = await fetch(`/api/scanners/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                fetchData();
            } else {
                const data = await res.json();
                alert(`Failed to delete scanner: ${data.error}`);
            }
        } catch (error) {
            console.error("Delete scanner error:", error);
            alert("An error occurred while deleting the scanner.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && scanners.length === 0 && recentScans.length === 0) {
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
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Scanners & Integrations</h1>
                        <p className="text-[var(--text-secondary)] mt-1">
                            Connect vulnerability scanners and import findings
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            className="btn btn-secondary"
                            onClick={fetchData}
                            disabled={isLoading}
                        >
                            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                            Refresh
                        </button>
                        <button className="btn btn-secondary">
                            <FileJson size={16} />
                            Import Scan
                        </button>
                        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
                            <Plus size={16} />
                            Add Scanner
                        </button>
                    </div>
                </div>

                {/* AI Scan Modal */}
                <Modal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    title="Run Security Scan"
                    maxWidth="md"
                    footer={
                        <div className="flex justify-end gap-3">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setIsAddModalOpen(false)}
                                disabled={isScanning}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleRunScan}
                                disabled={isScanning || !scanConfig.assetId}
                            >
                                {isScanning ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        Scanning...
                                    </>
                                ) : (
                                    <>
                                        <Play size={16} />
                                        Run Asset Scan
                                    </>
                                )}
                            </button>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                Select Asset to Scan
                            </label>
                            <select
                                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={scanConfig.assetId}
                                onChange={(e) => setScanConfig({ ...scanConfig, assetId: e.target.value })}
                            >
                                <option value="">Select an asset...</option>
                                {assets.map((asset) => (
                                    <option key={asset.id} value={asset.id}>
                                        {asset.name} ({asset.ipAddress || asset.hostname || "No IP"})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                Scanner / Agent
                            </label>
                            <select
                                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={scanConfig.scannerId}
                                onChange={(e) => setScanConfig({ ...scanConfig, scannerId: e.target.value })}
                            >
                                <option value="">Select a scanner...</option>
                                {scanners.map((scanner) => (
                                    <option key={scanner.id} value={scanner.id}>
                                        {scanner.name} ({scanner.type})
                                    </option>
                                ))}
                            </select>
                        </div>


                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                AI Insight Engine (OpenRouter)
                            </label>
                            <input
                                type="password"
                                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                placeholder="sk-or-v1-..."
                                value={scanConfig.apiKey}
                                onChange={(e) => setScanConfig({ ...scanConfig, apiKey: e.target.value })}
                            />
                            <p className="text-[10px] text-[var(--text-muted)] mt-1">
                                If empty, the server-side default key will be used.
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <div className="flex gap-3">
                                <AlertTriangle className="text-blue-400 shrink-0" size={18} />
                                <div className="text-xs text-blue-100/80 leading-relaxed">
                                    The Tenable API will be used to perform the scan and retrieve findings. AI will only be used to provide deep insights, remediation steps, and business context for the results.
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-[var(--border-color)] pb-4">
                    <button
                        onClick={() => setActiveTab("scanners")}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                            activeTab === "scanners"
                                ? "bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/10"
                                : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
                        )}
                    >
                        Connected Scanners
                    </button>
                    <button
                        onClick={() => setActiveTab("scans")}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                            activeTab === "scans"
                                ? "bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/10"
                                : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
                        )}
                    >
                        Recent Scans
                    </button>
                    <button
                        onClick={() => setActiveTab("import")}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                            activeTab === "import"
                                ? "bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/10"
                                : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
                        )}
                    >
                        Manual Import
                    </button>
                </div>

                {activeTab === "scanners" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Scanner List */}
                        <div className="lg:col-span-8">
                            <div className="space-y-4">
                                {scanners.length > 0 ? (
                                    scanners.map((scanner) => {
                                        const status = statusConfig[scanner.status as keyof typeof statusConfig];
                                        const StatusIcon = status.icon;

                                        return (
                                            <div
                                                key={scanner.id}
                                                className="card p-5 hover:border-[var(--border-hover)] transition-all duration-200 hover:scale-[1.01] animate-in fade-in slide-in-from-left-2"
                                                style={{ animationDelay: `${scanners.indexOf(scanner) * 50}ms`, animationFillMode: 'backwards' }}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className="p-3 rounded-xl bg-[var(--bg-tertiary)]">
                                                        <Scan size={24} className="text-blue-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h3 className="font-semibold text-[var(--text-primary)]">{scanner.name}</h3>
                                                            <span
                                                                className={cn(
                                                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium",
                                                                    scanner.status === "syncing" && "animate-pulse"
                                                                )}
                                                                style={{
                                                                    background: `${status.color}15`,
                                                                    color: status.color,
                                                                }}
                                                            >
                                                                <StatusIcon size={10} className={scanner.status === "syncing" ? "animate-spin" : ""} />
                                                                {status.label}
                                                            </span>
                                                            <span className="px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[10px] text-[var(--text-muted)]">
                                                                {scanner.type}
                                                            </span>
                                                        </div>

                                                        {scanner.error && (
                                                            <div className="flex items-center gap-2 mb-2 text-sm text-red-400">
                                                                <AlertTriangle size={14} />
                                                                {scanner.error}
                                                            </div>
                                                        )}

                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                                                            <div>
                                                                <p className="text-xs text-[var(--text-muted)]">Last Sync</p>
                                                                <p className="text-sm text-[var(--text-primary)]">{scanner.lastSync}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-[var(--text-muted)]">Sync Interval</p>
                                                                <p className="text-sm text-[var(--text-primary)]">{scanner.syncInterval}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-[var(--text-muted)]">Assets Scanned</p>
                                                                <p className="text-sm text-[var(--text-primary)]">{scanner.assetsScanned}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-[var(--text-muted)]">Vulns Found</p>
                                                                <p className="text-sm text-orange-400">{scanner.vulnsFound}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-200 hover:scale-110 active:scale-95">
                                                            <RefreshCw size={16} />
                                                        </button>
                                                        <button className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-200 hover:scale-110 active:scale-95">
                                                            <Settings size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteScanner(scanner.id)}
                                                            className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-all duration-200 hover:scale-110 active:scale-95"
                                                            title="Delete Scanner"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="card p-20 text-center">
                                        <Scan size={48} className="text-[var(--text-muted)] mx-auto mb-4 opacity-20" />
                                        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Scanners Connected</h3>
                                        <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
                                            Connect vulnerability scanners to automatically import findings and keep your security posture up to date.
                                        </p>
                                        <button className="btn btn-primary">
                                            <Plus size={16} />
                                            Add Your First Scanner
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-4 space-y-4">
                            <Card title="Scanner Stats">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)]">
                                        <span className="text-sm text-[var(--text-secondary)]">Total Scanners</span>
                                        <span className="text-lg font-bold text-[var(--text-primary)]">{scanners.length}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)]">
                                        <span className="text-sm text-[var(--text-secondary)]">Active</span>
                                        <span className="text-lg font-bold text-green-400">
                                            {scanners.filter((s) => s.status === "active").length}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)]">
                                        <span className="text-sm text-[var(--text-secondary)]">With Errors</span>
                                        <span className="text-lg font-bold text-red-400">
                                            {scanners.filter((s) => s.status === "error").length}
                                        </span>
                                    </div>
                                </div>
                            </Card>

                            <Card title="Supported Scanners" subtitle="Click to add">
                                <div className="grid grid-cols-2 gap-2">
                                    {["Tenable", "Nessus", "OpenVAS", "Trivy", "Qualys", "Rapid7", "CrowdStrike", "Nmap"].map(
                                        (scanner) => (
                                            <button
                                                key={scanner}
                                                className="p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-300 ease-in-out"
                                            >
                                                {scanner}
                                            </button>
                                        )
                                    )}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {activeTab === "scans" && (
                    <Card title="Recent Scan Results" noPadding>
                        {recentScans.length > 0 ? (
                            <div className="divide-y divide-[var(--border-color)]">
                                {recentScans.map((scan) => {
                                    const status = scanStatusConfig[scan.status as keyof typeof scanStatusConfig];
                                    const StatusIcon = status.icon;

                                    return (
                                        <div
                                            key={scan.id}
                                            className="p-4 hover:bg-[var(--bg-tertiary)] transition-all duration-200 cursor-pointer hover:scale-[1.01] animate-in fade-in slide-in-from-left-2"
                                            style={{ animationDelay: `${recentScans.indexOf(scan) * 30}ms`, animationFillMode: 'backwards' }}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className="p-2.5 rounded-lg"
                                                    style={{ background: `${status.color}15` }}
                                                >
                                                    <StatusIcon
                                                        size={18}
                                                        style={{ color: status.color }}
                                                        className={scan.status === "running" ? "animate-spin" : ""}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-medium text-[var(--text-primary)]">{scan.name}</h3>
                                                        <span
                                                            className="px-2 py-0.5 rounded text-[10px] font-medium"
                                                            style={{
                                                                background: `${status.color}15`,
                                                                color: status.color,
                                                            }}
                                                        >
                                                            {status.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                                                        <span>{scan.scanner}</span>
                                                        <span>Started: {scan.startTime}</span>
                                                        <span>Duration: {scan.duration}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right hidden md:block">
                                                    <div className="text-sm font-medium text-[var(--text-primary)]">{scan.hosts}</div>
                                                    <div className="text-xs text-[var(--text-muted)]">Hosts</div>
                                                </div>
                                                <div className="text-right hidden md:block">
                                                    <div className="text-sm font-medium text-orange-400">{scan.vulns}</div>
                                                    <div className="text-xs text-[var(--text-muted)]">Findings</div>
                                                </div>
                                                <ChevronRight size={18} className="text-[var(--text-muted)]" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-20 text-center">
                                <Clock size={48} className="text-[var(--text-muted)] mx-auto mb-4 opacity-20" />
                                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Scan Results Yet</h3>
                                <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
                                    Connect a scanner and run your first scan to see results here.
                                </p>
                            </div>
                        )}
                    </Card>
                )}

                {activeTab === "import" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card title="Upload Scan Results" subtitle="Import findings from exported scan files">
                            <div className="border-2 border-dashed border-[var(--border-color)] rounded-xl p-8 text-center hover:border-blue-500/50 transition-all duration-300 ease-in-out cursor-pointer">
                                <FileJson size={48} className="text-[var(--text-muted)] mx-auto mb-4" />
                                <h3 className="font-medium text-[var(--text-primary)] mb-2">
                                    Drop scan file here or click to browse
                                </h3>
                                <p className="text-sm text-[var(--text-muted)] mb-4">
                                    Supports JSON, XML, CSV formats from major scanners
                                </p>
                                <button className="btn btn-primary">
                                    <Plus size={16} />
                                    Select File
                                </button>
                            </div>
                        </Card>

                        <Card title="Supported Formats">
                            <div className="space-y-3">
                                {[
                                    { name: "Nessus (.nessus)", desc: "Native Nessus export format" },
                                    { name: "OpenVAS XML", desc: "OpenVAS/GVM report export" },
                                    { name: "Trivy JSON", desc: "Container vulnerability report" },
                                    { name: "Nmap XML", desc: "Nmap scan results" },
                                    { name: "CSV Generic", desc: "Comma-separated vulnerability data" },
                                    { name: "JSON Custom", desc: "Custom JSON schema" },
                                ].map((format) => (
                                    <div
                                        key={format.name}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-tertiary)]"
                                    >
                                        <FileJson size={16} className="text-blue-400" />
                                        <div>
                                            <p className="text-sm text-[var(--text-primary)]">{format.name}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{format.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
