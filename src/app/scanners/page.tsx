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
import { useUiFeedback } from "@/hooks/useUiFeedback";

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

/** Server-side capability report for each supported scanner integration. */
interface ScannerCapability {
    type: string;
    label: string;
    execution: "LOCAL_BINARY" | "REMOTE_API";
    binary?: string;
    targetHint: string;
    installed: boolean | null;
    version?: string | null;
    error?: string | null;
}

export default function ScannersPage() {
    const { showToast, confirm: askForConfirmation } = useUiFeedback();
    const [activeTab, setActiveTab] = useState<"scanners" | "scans" | "import">("scanners");
    const [scanners, setScanners] = useState<Scanner[]>([]);
    const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [assets, setAssets] = useState<AssetOption[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [capabilities, setCapabilities] = useState<ScannerCapability[]>([]);
    const [isAddScannerOpen, setIsAddScannerOpen] = useState(false);
    const [isSavingScanner, setIsSavingScanner] = useState(false);
    const [newScanner, setNewScanner] = useState({
        name: "",
        type: "NMAP",
        endpoint: "",
        apiKey: "",
        username: "",
        password: "",
    });
    const [scanConfig, setScanConfig] = useState({
        assetId: "",
        scannerId: "",
        // Explicit target overrides the asset's hostname/IP.
        target: "",
        // Analyze findings with the configured AI provider after the scan.
        aiTriage: true,
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

    /** Which integrations this server can actually execute right now. */
    const fetchCapabilities = async () => {
        try {
            const res = await fetch("/api/scanners/available", { cache: "no-store" });
            if (!res.ok) return;
            const payload = await res.json() as { data?: ScannerCapability[] };
            if (Array.isArray(payload.data)) setCapabilities(payload.data);
        } catch (error) {
            console.error("Failed to fetch scanner capabilities:", error);
        }
    };

    useEffect(() => {
        fetchData();
        fetchAssets();
        fetchCapabilities();
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

    const selectedAsset = assets.find((asset) => asset.id === scanConfig.assetId) ?? null;
    const selectedScanner = scanners.find((scanner) => scanner.id === scanConfig.scannerId) ?? null;
    const selectedCapability =
        capabilities.find((entry) => entry.type === selectedScanner?.type) ?? null;

    // A local scanner whose binary is missing can never succeed.
    const canRunScan =
        Boolean(scanConfig.scannerId) &&
        Boolean(scanConfig.assetId || scanConfig.target.trim()) &&
        selectedCapability?.installed !== false;

    /** Capability record for the type currently chosen in the add form. */
    const newScannerCapability =
        capabilities.find((entry) => entry.type === newScanner.type) ?? null;

    const handleCreateScanner = async () => {
        if (newScanner.name.trim().length < 2) return;

        try {
            setIsSavingScanner(true);
            const res = await fetch("/api/scanners", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newScanner.name.trim(),
                    type: newScanner.type,
                    endpoint: newScanner.endpoint.trim() || null,
                    apiKey: newScanner.apiKey.trim() || null,
                    username: newScanner.username.trim() || null,
                    password: newScanner.password.trim() || null,
                    isActive: true,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                showToast({
                    title: "Could not add scanner",
                    description: data.error ?? "Failed to create scanner.",
                    intent: "error",
                });
                return;
            }

            showToast({
                title: "Scanner added",
                description: `${data.name} is ready to use.`,
                intent: "success",
            });
            setIsAddScannerOpen(false);
            setNewScanner({ name: "", type: "NMAP", endpoint: "", apiKey: "", username: "", password: "" });
            fetchData();
        } catch (error) {
            console.error("Create scanner error:", error);
            showToast({
                title: "Could not add scanner",
                description: "An error occurred while creating the scanner.",
                intent: "error",
            });
        } finally {
            setIsSavingScanner(false);
        }
    };

    const handleRunScan = async () => {
        if (!scanConfig.scannerId) return;
        if (!scanConfig.assetId && !scanConfig.target.trim()) return;

        try {
            setIsScanning(true);
            const res = await fetch("/api/scans/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    scannerId: scanConfig.scannerId,
                    ...(scanConfig.assetId && { assetId: scanConfig.assetId }),
                    ...(scanConfig.target.trim() && { target: scanConfig.target.trim() }),
                    aiTriage: scanConfig.aiTriage,
                }),
            });

            const data = await res.json();
            if (res.ok) {
                // The registry path reports `findings`; the Tenable path
                // reports `vulnerabilitiesFound`.
                const found = data.findings ?? data.vulnerabilitiesFound ?? 0;
                showToast({
                    title: "Scan completed",
                    description:
                        `Found ${found} finding${found === 1 ? "" : "s"}` +
                        (data.created !== undefined ? ` (${data.created} new, ${data.updated} updated).` : ".") +
                        (data.aiTriage === "queued"
                            ? " AI analysis is running in the background."
                            : ""),
                    intent: "success",
                });
                setIsAddModalOpen(false);
                fetchData(); // Refresh scans
            } else {
                showToast({
                    title: "Scan failed",
                    description: data.error ?? "Failed to run scan.",
                    intent: "error",
                });
            }
        } catch (error) {
            console.error("Scan error:", error);
            showToast({
                title: "Scan failed",
                description: "An error occurred during scanning.",
                intent: "error",
            });
        } finally {
            setIsScanning(false);
        }
    };

    const handleDeleteScanner = async (id: string) => {
        const shouldDelete = await askForConfirmation({
            title: "Delete scanner",
            message: "Are you sure you want to delete this scanner? This action cannot be undone.",
            confirmLabel: "Delete",
            cancelLabel: "Cancel",
            intent: "danger",
        });
        if (!shouldDelete) return;

        try {
            setIsLoading(true);
            const res = await fetch(`/api/scanners/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                fetchData();
            } else {
                const data = await res.json();
                showToast({
                    title: "Delete failed",
                    description: data.error ?? "Failed to delete scanner.",
                    intent: "error",
                });
            }
        } catch (error) {
            console.error("Delete scanner error:", error);
            showToast({
                title: "Delete failed",
                description: "An error occurred while deleting the scanner.",
                intent: "error",
            });
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
                        <button
                            className="btn btn-secondary"
                            onClick={() => setIsAddModalOpen(true)}
                            disabled={scanners.length === 0}
                            title={scanners.length === 0 ? "Add a scanner first" : undefined}
                        >
                            <Play size={16} />
                            Run Scan
                        </button>
                        <button className="btn btn-primary" onClick={() => setIsAddScannerOpen(true)}>
                            <Plus size={16} />
                            Add Scanner
                        </button>
                    </div>
                </div>

                {/* Add Scanner Modal */}
                <Modal
                    isOpen={isAddScannerOpen}
                    onClose={() => setIsAddScannerOpen(false)}
                    title="Add Scanner"
                    maxWidth="md"
                    footer={
                        <div className="flex justify-end gap-3">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setIsAddScannerOpen(false)}
                                disabled={isSavingScanner}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleCreateScanner}
                                disabled={isSavingScanner || newScanner.name.trim().length < 2}
                            >
                                {isSavingScanner ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={16} />
                                        Add Scanner
                                    </>
                                )}
                            </button>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                Scanner Type
                            </label>
                            <select
                                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={newScanner.type}
                                onChange={(e) =>
                                    setNewScanner({ ...newScanner, type: e.target.value })
                                }
                            >
                                {capabilities.map((capability) => (
                                    <option key={capability.type} value={capability.type}>
                                        {capability.label}
                                        {capability.installed === false ? " — not installed" : ""}
                                    </option>
                                ))}
                            </select>
                            {newScannerCapability && (
                                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                                    {newScannerCapability.execution === "LOCAL_BINARY"
                                        ? `Runs the ${newScannerCapability.binary} binary on this server.`
                                        : "Connects to a remote appliance using the credentials below."}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                Name
                            </label>
                            <input
                                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                placeholder={`e.g. Local ${newScannerCapability?.label ?? "Scanner"}`}
                                value={newScanner.name}
                                onChange={(e) => setNewScanner({ ...newScanner, name: e.target.value })}
                            />
                        </div>

                        {/* Remote scanners need connection details; local ones do not. */}
                        {newScannerCapability?.execution === "REMOTE_API" && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                        Endpoint
                                    </label>
                                    <input
                                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="https://scanner.internal:8834"
                                        value={newScanner.endpoint}
                                        onChange={(e) =>
                                            setNewScanner({ ...newScanner, endpoint: e.target.value })
                                        }
                                    />
                                </div>

                                {newScanner.type === "NESSUS" ? (
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                            API Key
                                        </label>
                                        <input
                                            type="password"
                                            className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            placeholder="accessKey;secretKey"
                                            value={newScanner.apiKey}
                                            onChange={(e) =>
                                                setNewScanner({ ...newScanner, apiKey: e.target.value })
                                            }
                                        />
                                        <p className="text-[10px] text-[var(--text-muted)] mt-1">
                                            Nessus expects the access and secret key joined by a semicolon.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                                Username
                                            </label>
                                            <input
                                                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                value={newScanner.username}
                                                onChange={(e) =>
                                                    setNewScanner({ ...newScanner, username: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                                Password
                                            </label>
                                            <input
                                                type="password"
                                                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                value={newScanner.password}
                                                onChange={(e) =>
                                                    setNewScanner({ ...newScanner, password: e.target.value })
                                                }
                                            />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {newScannerCapability?.installed === false && (
                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <div className="flex gap-3">
                                    <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                                    <div className="text-xs text-amber-700 dark:text-amber-200/90 leading-relaxed">
                                        <code>{newScannerCapability.binary}</code> is not installed on this
                                        server. You can still save this scanner, but scans will fail until
                                        the binary is available.
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <div className="flex gap-3">
                                <AlertTriangle className="text-intent-accent shrink-0" size={18} />
                                <div className="text-xs text-blue-700 dark:text-blue-100/80 leading-relaxed">
                                    Credentials are encrypted before being stored and are never returned by
                                    the API.
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>

                {/* Run Scan Modal */}
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
                                disabled={isScanning || !canRunScan}
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
                                Target {selectedAsset ? "(overrides the asset address)" : ""}
                            </label>
                            <input
                                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                placeholder={
                                    selectedCapability?.targetHint ??
                                    "Hostname, IP address, or CIDR range"
                                }
                                value={scanConfig.target}
                                onChange={(e) => setScanConfig({ ...scanConfig, target: e.target.value })}
                            />
                            <p className="text-[10px] text-[var(--text-muted)] mt-1">
                                {scanConfig.target.trim()
                                    ? "This value will be scanned."
                                    : selectedAsset
                                      ? `Defaults to ${selectedAsset.ipAddress || selectedAsset.hostname || selectedAsset.name}.`
                                      : "Provide a target, or pick an asset with a hostname or IP address."}
                            </p>
                        </div>

                        <label className="flex items-start gap-2.5 cursor-pointer">
                            <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={scanConfig.aiTriage}
                                onChange={(e) =>
                                    setScanConfig({ ...scanConfig, aiTriage: e.target.checked })
                                }
                            />
                            <span className="text-sm text-[var(--text-secondary)]">
                                Analyze findings with AI after the scan
                                <span className="block text-[10px] text-[var(--text-muted)] mt-0.5">
                                    Runs in the background once the scan returns, adding risk scores and
                                    remediation steps to the Risk Register. Needs an asset matching the
                                    target.
                                </span>
                            </span>
                        </label>

                        {selectedCapability?.installed === false && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                                <div className="flex gap-3">
                                    <AlertTriangle className="text-red-500 shrink-0" size={18} />
                                    <div className="text-xs text-red-700 dark:text-red-200/90 leading-relaxed">
                                        <strong>{selectedCapability.label}</strong> is not installed on this
                                        server, so this scan cannot run. Install the{" "}
                                        <code>{selectedCapability.binary}</code> binary and reload.
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <div className="flex gap-3">
                                <AlertTriangle className="text-intent-accent shrink-0" size={18} />
                                <div className="text-xs text-blue-700 dark:text-blue-100/80 leading-relaxed">
                                    Findings come from the selected scanner. AI is used only to add risk
                                    context and remediation guidance afterwards — configure which provider in{" "}
                                    <strong>Settings</strong>.
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
                                ? "bg-blue-500/20 text-intent-accent shadow-lg shadow-blue-500/10"
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
                                ? "bg-blue-500/20 text-intent-accent shadow-lg shadow-blue-500/10"
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
                                ? "bg-blue-500/20 text-intent-accent shadow-lg shadow-blue-500/10"
                                : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
                        )}
                    >
                        Manual Import
                    </button>
                </div>

                {activeTab === "scanners" && capabilities.length > 0 && (
                    <div className="mb-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
                        <div className="mb-3">
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                                Supported Integrations
                            </h2>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Local scanners must be installed on the application server. Remote scanners
                                are reached with the credentials on each configured scanner.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {capabilities.map((capability) => (
                                <div
                                    key={capability.type}
                                    className="rounded-xl border border-[var(--border-color)] p-3"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                                            {capability.label}
                                        </span>
                                        {capability.installed === true && (
                                            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle size={10} />
                                                READY
                                            </span>
                                        )}
                                        {capability.installed === false && (
                                            <span className="inline-flex items-center gap-1 rounded-lg border border-red-400/30 bg-red-400/10 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                                                <XCircle size={10} />
                                                NOT INSTALLED
                                            </span>
                                        )}
                                        {capability.installed === null && (
                                            <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-muted)]">
                                                NEEDS CREDENTIALS
                                            </span>
                                        )}
                                    </div>

                                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                                        {capability.execution === "LOCAL_BINARY"
                                            ? `Local binary: ${capability.binary}`
                                            : "Remote API"}
                                    </p>
                                    <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                                        {capability.version || capability.targetHint}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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
                                                        <Scan size={24} className="text-intent-accent" />
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
                                                            <div className="flex items-center gap-2 mb-2 text-sm text-intent-danger">
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
                                                                <p className="text-sm text-orange-600 dark:text-orange-400">{scanner.vulnsFound}</p>
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
                                                            className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-700 dark:hover:text-red-400 transition-all duration-200 hover:scale-110 active:scale-95"
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
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => setIsAddScannerOpen(true)}
                                        >
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
                                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                            {scanners.filter((s) => s.status === "active").length}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)]">
                                        <span className="text-sm text-[var(--text-secondary)]">With Errors</span>
                                        <span className="text-lg font-bold text-intent-danger">
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
                                                    <div className="text-sm font-medium text-orange-600 dark:text-orange-400">{scan.vulns}</div>
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
                                        <FileJson size={16} className="text-intent-accent" />
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
