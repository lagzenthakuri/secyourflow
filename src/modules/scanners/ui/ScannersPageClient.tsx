"use client";
import { Checkbox as BoilerplateCheckbox } from "@repo/design-system/components/ui/checkbox";
import { Input as BoilerplateInput } from "@repo/design-system/components/ui/input";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Clock,
  FileJson,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Scan,
  Settings,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Cards";
import { Modal } from "@/components/ui/Modal";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { useUiFeedback } from "@/hooks/useUiFeedback";
import { cn } from "@/lib/utils";

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
  assetsScanned?: number;
  error?: string | null;
  id: string;
  lastSync?: string | null;
  name: string;
  status: keyof typeof statusConfig;
  syncInterval?: string | null;
  type: string;
  vulnsFound?: number;
}

interface RecentScan {
  duration: string;
  hosts: number;
  id: string;
  name: string;
  scanner: string;
  startTime: string;
  status: keyof typeof scanStatusConfig;
  vulns: number;
}

interface AssetOption {
  hostname?: string | null;
  id: string;
  ipAddress?: string | null;
  name: string;
}

/** Server-side capability report for each supported scanner integration. */
interface ScannerCapability {
  binary?: string;
  error?: string | null;
  execution: "LOCAL_BINARY" | "REMOTE_API";
  installed: boolean | null;
  label: string;
  targetHint: string;
  type: string;
  version?: string | null;
}

export default function ScannersPage() {
  const { showToast, confirm: askForConfirmation } = useUiFeedback();
  const [activeTab, setActiveTab] = useState<"scanners" | "scans" | "import">(
    "scanners"
  );
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
        fetch("/api/scans?limit=10"),
      ]);

      const scannersData = (await scannersRes.json()) as Scanner[];
      const scansData = (await scansRes.json()) as RecentScan[];

      if (Array.isArray(scannersData)) {
        setScanners(scannersData);
      }
      if (Array.isArray(scansData)) {
        setRecentScans(scansData);
      }
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
      if (!res.ok) {
        return;
      }
      const payload = (await res.json()) as { data?: ScannerCapability[] };
      if (Array.isArray(payload.data)) {
        setCapabilities(payload.data);
      }
    } catch (error) {
      console.error("Failed to fetch scanner capabilities:", error);
    }
  };

  const fetchAssets = async () => {
    try {
      const res = await fetch("/api/assets?limit=100");
      const data = (await res.json()) as { data?: AssetOption[] };
      if (data.data) {
        setAssets(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    }
  };

  const selectedAsset =
    assets.find((asset) => asset.id === scanConfig.assetId) ?? null;
  const selectedScanner =
    scanners.find((scanner) => scanner.id === scanConfig.scannerId) ?? null;
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
    if (newScanner.name.trim().length < 2) {
      return;
    }

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
      setNewScanner({
        name: "",
        type: "NMAP",
        endpoint: "",
        apiKey: "",
        username: "",
        password: "",
      });
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
    if (!scanConfig.scannerId) {
      return;
    }
    if (!(scanConfig.assetId || scanConfig.target.trim())) {
      return;
    }

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
            (data.created !== undefined
              ? ` (${data.created} new, ${data.updated} updated).`
              : ".") +
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
      message:
        "Are you sure you want to delete this scanner? This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      intent: "danger",
    });
    if (!shouldDelete) {
      return;
    }

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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-bold text-2xl text-[var(--text-primary)]">
              Scanners & Integrations
            </h1>
            <p className="mt-1 text-[var(--text-secondary)]">
              Connect vulnerability scanners and import findings
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="btn btn-secondary"
              disabled={isLoading}
              onClick={fetchData}
            >
              <RefreshCw
                className={isLoading ? "animate-spin" : ""}
                size={16}
              />
              Refresh
            </button>
            <button className="btn btn-secondary">
              <FileJson size={16} />
              Import Scan
            </button>
            <button
              className="btn btn-secondary"
              disabled={scanners.length === 0}
              onClick={() => setIsAddModalOpen(true)}
              title={scanners.length === 0 ? "Add a scanner first" : undefined}
            >
              <Play size={16} />
              Run Scan
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setIsAddScannerOpen(true)}
            >
              <Plus size={16} />
              Add Scanner
            </button>
          </div>
        </div>

        {/* Add Scanner Modal */}
        <Modal
          footer={
            <div className="flex justify-end gap-3">
              <button
                className="btn btn-secondary"
                disabled={isSavingScanner}
                onClick={() => setIsAddScannerOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={isSavingScanner || newScanner.name.trim().length < 2}
                onClick={handleCreateScanner}
              >
                {isSavingScanner ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
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
          isOpen={isAddScannerOpen}
          maxWidth="md"
          onClose={() => setIsAddScannerOpen(false)}
          title="Add Scanner"
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
                Scanner Type
              </label>
              <Select
                onValueChange={(e) => setNewScanner({ ...newScanner, type: e })}
                value={newScanner.type}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {capabilities.map((capability) => (
                      <SelectItem key={capability.type} value={capability.type}>
                        {capability.label}
                        {capability.installed === false
                          ? " — not installed"
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {newScannerCapability && (
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                  {newScannerCapability.execution === "LOCAL_BINARY"
                    ? `Runs the ${newScannerCapability.binary} binary on this server.`
                    : "Connects to a remote appliance using the credentials below."}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
                Name
              </label>
              <BoilerplateInput
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                onChange={(e) =>
                  setNewScanner({ ...newScanner, name: e.target.value })
                }
                placeholder={`e.g. Local ${newScannerCapability?.label ?? "Scanner"}`}
                value={newScanner.name}
              />
            </div>

            {/* Remote scanners need connection details; local ones do not. */}
            {newScannerCapability?.execution === "REMOTE_API" && (
              <>
                <div>
                  <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
                    Endpoint
                  </label>
                  <BoilerplateInput
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    onChange={(e) =>
                      setNewScanner({ ...newScanner, endpoint: e.target.value })
                    }
                    placeholder="https://scanner.internal:8834"
                    value={newScanner.endpoint}
                  />
                </div>

                {newScanner.type === "NESSUS" ? (
                  <div>
                    <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
                      API Key
                    </label>
                    <BoilerplateInput
                      className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      onChange={(e) =>
                        setNewScanner({ ...newScanner, apiKey: e.target.value })
                      }
                      placeholder="accessKey;secretKey"
                      type="password"
                      value={newScanner.apiKey}
                    />
                    <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                      Nessus expects the access and secret key joined by a
                      semicolon.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
                        Username
                      </label>
                      <BoilerplateInput
                        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        onChange={(e) =>
                          setNewScanner({
                            ...newScanner,
                            username: e.target.value,
                          })
                        }
                        value={newScanner.username}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
                        Password
                      </label>
                      <BoilerplateInput
                        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        onChange={(e) =>
                          setNewScanner({
                            ...newScanner,
                            password: e.target.value,
                          })
                        }
                        type="password"
                        value={newScanner.password}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {newScannerCapability?.installed === false && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="flex gap-3">
                  <AlertTriangle
                    className="shrink-0 text-amber-500"
                    size={18}
                  />
                  <div className="text-amber-700 text-xs leading-relaxed dark:text-amber-200/90">
                    <code>{newScannerCapability.binary}</code> is not installed
                    on this server. You can still save this scanner, but scans
                    will fail until the binary is available.
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
              <div className="flex gap-3">
                <AlertTriangle
                  className="shrink-0 text-intent-accent"
                  size={18}
                />
                <div className="text-blue-700 text-xs leading-relaxed dark:text-blue-100/80">
                  Credentials are encrypted before being stored and are never
                  returned by the API.
                </div>
              </div>
            </div>
          </div>
        </Modal>

        {/* Run Scan Modal */}
        <Modal
          footer={
            <div className="flex justify-end gap-3">
              <button
                className="btn btn-secondary"
                disabled={isScanning}
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={isScanning || !canRunScan}
                onClick={handleRunScan}
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} />
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
          isOpen={isAddModalOpen}
          maxWidth="md"
          onClose={() => setIsAddModalOpen(false)}
          title="Run Security Scan"
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
                Select Asset to Scan
              </label>
              <Select
                onValueChange={(e) =>
                  setScanConfig({
                    ...scanConfig,
                    assetId: e === "__select_none__" ? "" : e,
                  })
                }
                value={scanConfig.assetId || "__select_none__"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="__select_none__">
                      Select an asset...
                    </SelectItem>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name} (
                        {asset.ipAddress || asset.hostname || "No IP"})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
                Scanner / Agent
              </label>
              <Select
                onValueChange={(e) =>
                  setScanConfig({
                    ...scanConfig,
                    scannerId: e === "__select_none__" ? "" : e,
                  })
                }
                value={scanConfig.scannerId || "__select_none__"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="__select_none__">
                      Select a scanner...
                    </SelectItem>
                    {scanners.map((scanner) => (
                      <SelectItem key={scanner.id} value={scanner.id}>
                        {scanner.name} ({scanner.type})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
                Target {selectedAsset ? "(overrides the asset address)" : ""}
              </label>
              <BoilerplateInput
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                onChange={(e) =>
                  setScanConfig({ ...scanConfig, target: e.target.value })
                }
                placeholder={
                  selectedCapability?.targetHint ??
                  "Hostname, IP address, or CIDR range"
                }
                value={scanConfig.target}
              />
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                {scanConfig.target.trim()
                  ? "This value will be scanned."
                  : selectedAsset
                    ? `Defaults to ${selectedAsset.ipAddress || selectedAsset.hostname || selectedAsset.name}.`
                    : "Provide a target, or pick an asset with a hostname or IP address."}
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5">
              <BoilerplateCheckbox
                checked={scanConfig.aiTriage}
                className="mt-0.5"
                onCheckedChange={(checked) =>
                  setScanConfig({ ...scanConfig, aiTriage: Boolean(checked) })
                }
              />
              <span className="text-[var(--text-secondary)] text-sm">
                Analyze findings with AI after the scan
                <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">
                  Runs in the background once the scan returns, adding risk
                  scores and remediation steps to the Risk Register. Needs an
                  asset matching the target.
                </span>
              </span>
            </label>

            {selectedCapability?.installed === false && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="shrink-0 text-red-500" size={18} />
                  <div className="text-red-700 text-xs leading-relaxed dark:text-red-200/90">
                    <strong>{selectedCapability.label}</strong> is not installed
                    on this server, so this scan cannot run. Install the{" "}
                    <code>{selectedCapability.binary}</code> binary and reload.
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
              <div className="flex gap-3">
                <AlertTriangle
                  className="shrink-0 text-intent-accent"
                  size={18}
                />
                <div className="text-blue-700 text-xs leading-relaxed dark:text-blue-100/80">
                  Findings come from the selected scanner. AI is used only to
                  add risk context and remediation guidance afterwards —
                  configure which provider in <strong>Settings</strong>.
                </div>
              </div>
            </div>
          </div>
        </Modal>

        {/* Tabs */}
        <div className="flex gap-2 border-[var(--border-color)] border-b pb-4">
          <button
            className={cn(
              "rounded-lg px-4 py-2 font-medium text-sm transition-all duration-200",
              activeTab === "scanners"
                ? "bg-blue-500/20 text-intent-accent shadow-blue-500/10 shadow-lg"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
            )}
            onClick={() => setActiveTab("scanners")}
          >
            Connected Scanners
          </button>
          <button
            className={cn(
              "rounded-lg px-4 py-2 font-medium text-sm transition-all duration-200",
              activeTab === "scans"
                ? "bg-blue-500/20 text-intent-accent shadow-blue-500/10 shadow-lg"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
            )}
            onClick={() => setActiveTab("scans")}
          >
            Recent Scans
          </button>
          <button
            className={cn(
              "rounded-lg px-4 py-2 font-medium text-sm transition-all duration-200",
              activeTab === "import"
                ? "bg-blue-500/20 text-intent-accent shadow-blue-500/10 shadow-lg"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
            )}
            onClick={() => setActiveTab("import")}
          >
            Manual Import
          </button>
        </div>

        {activeTab === "scanners" && capabilities.length > 0 && (
          <div className="mb-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
            <div className="mb-3">
              <h2 className="font-semibold text-[var(--text-primary)] text-lg">
                Supported Integrations
              </h2>
              <p className="text-[var(--text-secondary)] text-sm">
                Local scanners must be installed on the application server.
                Remote scanners are reached with the credentials on each
                configured scanner.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {capabilities.map((capability) => (
                <div
                  className="rounded-xl border border-[var(--border-color)] p-3"
                  key={capability.type}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--text-primary)] text-sm">
                      {capability.label}
                    </span>
                    {capability.installed === true && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 font-bold text-[10px] text-emerald-600 dark:text-emerald-400">
                        <CheckCircle size={10} />
                        READY
                      </span>
                    )}
                    {capability.installed === false && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-red-400/30 bg-red-400/10 px-2 py-0.5 font-bold text-[10px] text-red-600 dark:text-red-400">
                        <XCircle size={10} />
                        NOT INSTALLED
                      </span>
                    )}
                    {capability.installed === null && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-0.5 font-bold text-[10px] text-[var(--text-muted)]">
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Scanner List */}
            <div className="lg:col-span-8">
              <div className="space-y-4">
                {scanners.length > 0 ? (
                  scanners.map((scanner) => {
                    const status =
                      statusConfig[scanner.status as keyof typeof statusConfig];
                    const StatusIcon = status.icon;

                    return (
                      <div
                        className="card fade-in slide-in-from-left-2 animate-in p-5 transition-all duration-200 hover:scale-[1.01] hover:border-[var(--border-hover)]"
                        key={scanner.id}
                        style={{
                          animationDelay: `${scanners.indexOf(scanner) * 50}ms`,
                          animationFillMode: "backwards",
                        }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="rounded-xl bg-[var(--bg-tertiary)] p-3">
                            <Scan className="text-intent-accent" size={24} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex items-center gap-3">
                              <h3 className="font-semibold text-[var(--text-primary)]">
                                {scanner.name}
                              </h3>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded px-2 py-0.5 font-medium text-[10px]",
                                  scanner.status === "syncing" &&
                                    "animate-pulse"
                                )}
                                style={{
                                  background: `${status.color}15`,
                                  color: status.color,
                                }}
                              >
                                <StatusIcon
                                  className={
                                    scanner.status === "syncing"
                                      ? "animate-spin"
                                      : ""
                                  }
                                  size={10}
                                />
                                {status.label}
                              </span>
                              <span className="rounded bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
                                {scanner.type}
                              </span>
                            </div>

                            {scanner.error && (
                              <div className="mb-2 flex items-center gap-2 text-intent-danger text-sm">
                                <AlertTriangle size={14} />
                                {scanner.error}
                              </div>
                            )}

                            <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
                              <div>
                                <p className="text-[var(--text-muted)] text-xs">
                                  Last Sync
                                </p>
                                <p className="text-[var(--text-primary)] text-sm">
                                  {scanner.lastSync}
                                </p>
                              </div>
                              <div>
                                <p className="text-[var(--text-muted)] text-xs">
                                  Sync Interval
                                </p>
                                <p className="text-[var(--text-primary)] text-sm">
                                  {scanner.syncInterval}
                                </p>
                              </div>
                              <div>
                                <p className="text-[var(--text-muted)] text-xs">
                                  Assets Scanned
                                </p>
                                <p className="text-[var(--text-primary)] text-sm">
                                  {scanner.assetsScanned}
                                </p>
                              </div>
                              <div>
                                <p className="text-[var(--text-muted)] text-xs">
                                  Vulns Found
                                </p>
                                <p className="text-orange-600 text-sm dark:text-orange-400">
                                  {scanner.vulnsFound}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button className="rounded-lg p-2 text-[var(--text-muted)] transition-all duration-200 hover:scale-110 hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] active:scale-95">
                              <RefreshCw size={16} />
                            </button>
                            <button className="rounded-lg p-2 text-[var(--text-muted)] transition-all duration-200 hover:scale-110 hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] active:scale-95">
                              <Settings size={16} />
                            </button>
                            <button
                              className="rounded-lg p-2 text-[var(--text-muted)] transition-all duration-200 hover:scale-110 hover:bg-red-500/10 hover:text-red-700 active:scale-95 dark:hover:text-red-400"
                              onClick={() => handleDeleteScanner(scanner.id)}
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
                    <Scan
                      className="mx-auto mb-4 text-[var(--text-muted)] opacity-20"
                      size={48}
                    />
                    <h3 className="mb-2 font-semibold text-[var(--text-primary)] text-lg">
                      No Scanners Connected
                    </h3>
                    <p className="mx-auto mb-6 max-w-md text-[var(--text-secondary)]">
                      Connect vulnerability scanners to automatically import
                      findings and keep your security posture up to date.
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
            <div className="space-y-4 lg:col-span-4">
              <Card title="Scanner Stats">
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg bg-[var(--bg-tertiary)] p-3">
                    <span className="text-[var(--text-secondary)] text-sm">
                      Total Scanners
                    </span>
                    <span className="font-bold text-[var(--text-primary)] text-lg">
                      {scanners.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[var(--bg-tertiary)] p-3">
                    <span className="text-[var(--text-secondary)] text-sm">
                      Active
                    </span>
                    <span className="font-bold text-green-600 text-lg dark:text-green-400">
                      {scanners.filter((s) => s.status === "active").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-[var(--bg-tertiary)] p-3">
                    <span className="text-[var(--text-secondary)] text-sm">
                      With Errors
                    </span>
                    <span className="font-bold text-intent-danger text-lg">
                      {scanners.filter((s) => s.status === "error").length}
                    </span>
                  </div>
                </div>
              </Card>

              <Card subtitle="Click to add" title="Supported Scanners">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "Tenable",
                    "Nessus",
                    "OpenVAS",
                    "Trivy",
                    "Qualys",
                    "Rapid7",
                    "CrowdStrike",
                    "Nmap",
                  ].map((scanner) => (
                    <button
                      className="rounded-lg bg-[var(--bg-tertiary)] p-3 text-[var(--text-secondary)] text-sm transition-all duration-300 ease-in-out hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                      key={scanner}
                    >
                      {scanner}
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === "scans" && (
          <Card noPadding title="Recent Scan Results">
            {recentScans.length > 0 ? (
              <div className="divide-y divide-[var(--border-color)]">
                {recentScans.map((scan) => {
                  const status =
                    scanStatusConfig[
                      scan.status as keyof typeof scanStatusConfig
                    ];
                  const StatusIcon = status.icon;

                  return (
                    <div
                      className="fade-in slide-in-from-left-2 animate-in cursor-pointer p-4 transition-all duration-200 hover:scale-[1.01] hover:bg-[var(--bg-tertiary)]"
                      key={scan.id}
                      style={{
                        animationDelay: `${recentScans.indexOf(scan) * 30}ms`,
                        animationFillMode: "backwards",
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="rounded-lg p-2.5"
                          style={{ background: `${status.color}15` }}
                        >
                          <StatusIcon
                            className={
                              scan.status === "running" ? "animate-spin" : ""
                            }
                            size={18}
                            style={{ color: status.color }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <h3 className="font-medium text-[var(--text-primary)]">
                              {scan.name}
                            </h3>
                            <span
                              className="rounded px-2 py-0.5 font-medium text-[10px]"
                              style={{
                                background: `${status.color}15`,
                                color: status.color,
                              }}
                            >
                              {status.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--text-muted)] text-xs">
                            <span>{scan.scanner}</span>
                            <span>Started: {scan.startTime}</span>
                            <span>Duration: {scan.duration}</span>
                          </div>
                        </div>
                        <div className="hidden text-right md:block">
                          <div className="font-medium text-[var(--text-primary)] text-sm">
                            {scan.hosts}
                          </div>
                          <div className="text-[var(--text-muted)] text-xs">
                            Hosts
                          </div>
                        </div>
                        <div className="hidden text-right md:block">
                          <div className="font-medium text-orange-600 text-sm dark:text-orange-400">
                            {scan.vulns}
                          </div>
                          <div className="text-[var(--text-muted)] text-xs">
                            Findings
                          </div>
                        </div>
                        <ChevronRight
                          className="text-[var(--text-muted)]"
                          size={18}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-20 text-center">
                <Clock
                  className="mx-auto mb-4 text-[var(--text-muted)] opacity-20"
                  size={48}
                />
                <h3 className="mb-2 font-semibold text-[var(--text-primary)] text-lg">
                  No Scan Results Yet
                </h3>
                <p className="mx-auto mb-6 max-w-md text-[var(--text-secondary)]">
                  Connect a scanner and run your first scan to see results here.
                </p>
              </div>
            )}
          </Card>
        )}

        {activeTab === "import" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card
              subtitle="Import findings from exported scan files"
              title="Upload Scan Results"
            >
              <div className="cursor-pointer rounded-xl border-2 border-[var(--border-color)] border-dashed p-8 text-center transition-all duration-300 ease-in-out hover:border-blue-500/50">
                <FileJson
                  className="mx-auto mb-4 text-[var(--text-muted)]"
                  size={48}
                />
                <h3 className="mb-2 font-medium text-[var(--text-primary)]">
                  Drop scan file here or click to browse
                </h3>
                <p className="mb-4 text-[var(--text-muted)] text-sm">
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
                  {
                    name: "Nessus (.nessus)",
                    desc: "Native Nessus export format",
                  },
                  { name: "OpenVAS XML", desc: "OpenVAS/GVM report export" },
                  {
                    name: "Trivy JSON",
                    desc: "Container vulnerability report",
                  },
                  { name: "Nmap XML", desc: "Nmap scan results" },
                  {
                    name: "CSV Generic",
                    desc: "Comma-separated vulnerability data",
                  },
                  { name: "JSON Custom", desc: "Custom JSON schema" },
                ].map((format) => (
                  <div
                    className="flex items-center gap-3 rounded-lg bg-[var(--bg-tertiary)] p-3"
                    key={format.name}
                  >
                    <FileJson className="text-intent-accent" size={16} />
                    <div>
                      <p className="text-[var(--text-primary)] text-sm">
                        {format.name}
                      </p>
                      <p className="text-[var(--text-muted)] text-xs">
                        {format.desc}
                      </p>
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
