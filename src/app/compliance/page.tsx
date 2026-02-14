"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ComplianceBarChart } from "@/components/charts/DashboardCharts";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  FileCheck,
  Filter,
  HelpCircle,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Target,
  User,
  Wrench,
  XCircle,
} from "lucide-react";
import { AddControlModal } from "@/components/compliance/AddControlModal";
import { AssessControlModal } from "@/components/compliance/AssessControlModal";
import { ControlActions } from "@/components/compliance/ControlActions";
import { FrameworkActions } from "@/components/compliance/FrameworkActions";
import { EvidenceUploadModal } from "@/components/compliance/EvidenceUploadModal";
import { ShieldLoader } from "@/components/ui/ShieldLoader";

interface FrameworkControl {
  id: string;
  controlId: string;
  title: string;
  description?: string | null;
  objective?: string | null;
  status:
  | "COMPLIANT"
  | "NON_COMPLIANT"
  | "PARTIALLY_COMPLIANT"
  | "NOT_ASSESSED"
  | "NOT_APPLICABLE";
  implementationStatus?: string | null;
  maturityLevel?: number | null;
  nistCsfFunction?:
  | "GOVERN"
  | "IDENTIFY"
  | "PROTECT"
  | "DETECT"
  | "RESPOND"
  | "RECOVER"
  | null;
  controlType?: "PREVENTIVE" | "DETECTIVE" | "CORRECTIVE" | null;
  ownerRole?: string | null;
  category?: string | null;
  frequency?: string | null;
  evidence?: string | null;
  notes?: string | null;
  updatedAt?: string;
}

interface ComplianceFramework {
  frameworkId: string;
  frameworkName: string;
  description?: string | null;
  totalControls: number;
  compliant: number;
  nonCompliant: number;
  partiallyCompliant: number;
  notAssessed: number;
  compliancePercentage: number;
  avgMaturityLevel: number;
  nistCsfBreakdown: Record<string, number>;
  controls: FrameworkControl[];
}

interface ComplianceTemplateOption {
  id: string;
  name: string;
  version: string;
  description: string;
  controlCount: number;
}

const statusConfig = {
  COMPLIANT: {
    label: "Compliant",
    icon: CheckCircle2,
    tone: "border-emerald-400/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
    softTone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  },
  NON_COMPLIANT: {
    label: "Non-Compliant",
    icon: XCircle,
    tone: "border-red-400/35 bg-red-500/10 text-red-700 dark:text-red-200",
    softTone: "bg-red-500/15 text-red-600 dark:text-red-300",
  },
  PARTIALLY_COMPLIANT: {
    label: "Partial",
    icon: AlertTriangle,
    tone: "border-yellow-400/35 bg-yellow-500/10 text-yellow-700 dark:text-yellow-200",
    softTone: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-300",
  },
  NOT_ASSESSED: {
    label: "Not Assessed",
    icon: HelpCircle,
    tone: "border-[var(--border-hover)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
    softTone: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
  },
  NOT_APPLICABLE: {
    label: "N/A",
    icon: HelpCircle,
    tone: "border-[var(--border-hover)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
    softTone: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
  },
} as const;

const nistCsfConfig = {
  GOVERN: { label: "Govern", color: "#a78bfa", icon: Layers },
  IDENTIFY: { label: "Identify", color: "#60a5fa", icon: Search },
  PROTECT: { label: "Protect", color: "#34d399", icon: Shield },
  DETECT: { label: "Detect", color: "#fb923c", icon: Eye },
  RESPOND: { label: "Respond", color: "#f87171", icon: Target },
  RECOVER: { label: "Recover", color: "#22d3ee", icon: Wrench },
} as const;

const maturityLabels = [
  {
    level: 0,
    label: "Non-existent",
    tone: "border-slate-300/70 bg-slate-100 text-slate-700 dark:border-slate-400/30 dark:bg-slate-500/15 dark:text-slate-200",
  },
  {
    level: 1,
    label: "Ad Hoc",
    tone: "border-red-300/70 bg-red-100 text-red-800 dark:border-red-400/30 dark:bg-red-500/15 dark:text-red-200",
  },
  {
    level: 2,
    label: "Repeatable",
    tone: "border-orange-300/70 bg-orange-100 text-orange-800 dark:border-orange-400/30 dark:bg-orange-500/15 dark:text-orange-200",
  },
  {
    level: 3,
    label: "Defined",
    tone: "border-amber-300/70 bg-amber-100 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200",
  },
  {
    level: 4,
    label: "Managed",
    tone: "border-emerald-300/70 bg-emerald-100 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200",
  },
  {
    level: 5,
    label: "Optimized",
    tone: "border-sky-300/70 bg-sky-100 text-sky-800 dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-200",
  },
] as const;

const controlTypeConfig = {
  PREVENTIVE: { label: "Preventive", color: "#34d399" },
  DETECTIVE: { label: "Detective", color: "#fb923c" },
  CORRECTIVE: { label: "Corrective", color: "#60a5fa" },
} as const;

const numberFormatter = new Intl.NumberFormat("en-US");

function getComplianceTone(value: number) {
  if (value >= 80) return "text-emerald-700 dark:text-emerald-200";
  if (value >= 60) return "text-yellow-700 dark:text-yellow-200";
  return "text-red-700 dark:text-red-200";
}

function getComplianceBarTone(value: number) {
  if (value >= 80) return "bg-emerald-400";
  if (value >= 60) return "bg-yellow-400";
  return "bg-red-400";
}

function escapeCsv(value: unknown): string {
  const str = String(value ?? "");
  const normalized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  if (!normalized.includes(",") && !normalized.includes("\"") && !normalized.includes("\n")) {
    return normalized;
  }
  return `"${normalized.replace(/"/g, '""')}"`;
}

function getMaturityTone(level?: number | null) {
  if (typeof level !== "number" || Number.isNaN(level)) return maturityLabels[0];
  const rounded = Math.min(Math.max(Math.round(level), 0), 5);
  return maturityLabels[rounded];
}

export default function CompliancePage() {
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([]);
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFramework | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isRunningAssessment, setIsRunningAssessment] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | FrameworkControl["status"]>("ALL");
  const [selectedNistFunction, setSelectedNistFunction] = useState<
    "ALL" | keyof typeof nistCsfConfig
  >("ALL");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditFrameworkModalOpen, setIsEditFrameworkModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newFramework, setNewFramework] = useState({ name: "", description: "" });
  const [deletingFrameworkId, setDeletingFrameworkId] = useState<string | null>(null);
  const [deletingControlId, setDeletingControlId] = useState<string | null>(null);

  const [isAddControlModalOpen, setIsAddControlModalOpen] = useState(false);
  const [isAssessModalOpen, setIsAssessModalOpen] = useState(false);
  const [selectedControl, setSelectedControl] = useState<FrameworkControl | null>(null);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [selectedEvidenceControl, setSelectedEvidenceControl] = useState<FrameworkControl | null>(null);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [isTemplateImporting, setIsTemplateImporting] = useState(false);
  const [templates, setTemplates] = useState<ComplianceTemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const fetchCompliance = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        setPageError(null);
        const response = await fetch("/api/compliance", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to fetch compliance data");
        }

        const result = (await response.json()) as { data?: ComplianceFramework[] };
        const nextFrameworks = Array.isArray(result.data) ? result.data : [];
        setFrameworks(nextFrameworks);

        setSelectedFramework((prev) => {
          if (nextFrameworks.length === 0) return null;
          if (!prev) return nextFrameworks[0];
          return (
            nextFrameworks.find((item) => item.frameworkId === prev.frameworkId) ??
            nextFrameworks[0]
          );
        });
      } catch (err) {
        setPageError(
          err instanceof Error ? err.message : "Failed to load compliance data",
        );
        setFrameworks([]);
        setSelectedFramework(null);
      } finally {
        if (silent) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void fetchCompliance();
  }, [fetchCompliance]);

  const handleAddFramework = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setActionError(null);
      setIsSubmitting(true);
      const response = await fetch("/api/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFramework),
      });

      if (!response.ok) {
        throw new Error("Failed to create framework");
      }

      setIsAddModalOpen(false);
      setNewFramework({ name: "", description: "" });
      await fetchCompliance({ silent: true });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to create framework",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateFramework = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFramework) return;

    try {
      setActionError(null);
      setIsSubmitting(true);
      const response = await fetch(`/api/compliance/${selectedFramework.frameworkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedFramework.frameworkName,
          description: selectedFramework.description || "",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update framework");
      }

      setIsEditFrameworkModalOpen(false);
      await fetchCompliance({ silent: true });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to update framework",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFramework = useCallback(
    async (frameworkId: string) => {
      try {
        setActionError(null);
        setDeletingFrameworkId(frameworkId);
        const response = await fetch(`/api/compliance/${frameworkId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete framework");
        }

        await fetchCompliance({ silent: true });
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "Failed to delete framework",
        );
      } finally {
        setDeletingFrameworkId(null);
      }
    },
    [fetchCompliance],
  );

  const handleDeleteControl = useCallback(
    async (controlId: string) => {
      try {
        setActionError(null);
        setDeletingControlId(controlId);
        const response = await fetch(`/api/compliance/controls/${controlId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete control");
        }

        await fetchCompliance({ silent: true });
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Failed to delete control");
      } finally {
        setDeletingControlId(null);
      }
    },
    [fetchCompliance],
  );

  const startMonitoring = useCallback(async () => {
    try {
      setActionError(null);
      const response = await fetch("/api/compliance/monitor", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to start compliance monitoring");
      }

      await fetchCompliance({ silent: true });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to start compliance monitoring",
      );
    }
  }, [fetchCompliance]);

  const runAutomatedAssessment = useCallback(async () => {
    if (!selectedFramework) return;

    try {
      setActionError(null);
      setIsRunningAssessment(true);

      const response = await fetch("/api/compliance/assessments/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frameworkId: selectedFramework.frameworkId,
          reason: "manual-ui-trigger",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to run automated assessments");
      }

      await fetchCompliance({ silent: true });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to run automated assessments",
      );
    } finally {
      setIsRunningAssessment(false);
    }
  }, [fetchCompliance, selectedFramework]);

  const loadTemplates = useCallback(async () => {
    try {
      setIsTemplateLoading(true);
      const response = await fetch("/api/compliance/templates", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }

      const payload = (await response.json()) as { data?: ComplianceTemplateOption[] };
      const nextTemplates = Array.isArray(payload.data) ? payload.data : [];
      setTemplates(nextTemplates);
      if (nextTemplates.length > 0) {
        setSelectedTemplateId((prev) => prev || nextTemplates[0].id);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to fetch templates");
    } finally {
      setIsTemplateLoading(false);
    }
  }, []);

  const openTemplateModal = useCallback(() => {
    setIsTemplateModalOpen(true);
    if (templates.length === 0) {
      void loadTemplates();
    }
  }, [loadTemplates, templates.length]);

  const importTemplate = useCallback(async () => {
    if (!selectedTemplateId) return;

    try {
      setActionError(null);
      setIsTemplateImporting(true);

      const response = await fetch("/api/compliance/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to import template");
      }

      setIsTemplateModalOpen(false);
      await fetchCompliance({ silent: true });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to import template");
    } finally {
      setIsTemplateImporting(false);
    }
  }, [fetchCompliance, selectedTemplateId]);

  const exportToCsv = useCallback(() => {
    if (!selectedFramework) return;

    const headers = [
      "Control ID",
      "Title",
      "Status",
      "Maturity",
      "NIST Function",
      "Control Type",
      "Frequency",
      "Owner",
      "Category",
    ];

    const rows = selectedFramework.controls.map((control) => [
      escapeCsv(control.controlId),
      escapeCsv(control.title),
      escapeCsv(control.status),
      escapeCsv(control.maturityLevel ?? ""),
      escapeCsv(control.nistCsfFunction || ""),
      escapeCsv(control.controlType || ""),
      escapeCsv(control.frequency || ""),
      escapeCsv(control.ownerRole || ""),
      escapeCsv(control.category || ""),
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedFramework.frameworkName}_Compliance_Report.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }, [selectedFramework]);

  const exportToPDF = useCallback(async () => {
    if (!selectedFramework) return;

    try {
      setActionError(null);
      setIsExportingPdf(true);

      const response = await fetch(
        `/api/compliance/reports/${selectedFramework.frameworkId}/pdf`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to generate compliance PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${selectedFramework.frameworkName}_Compliance_Report_${new Date().toISOString().split("T")[0]}.pdf`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to export compliance PDF",
      );
    } finally {
      setIsExportingPdf(false);
    }
  }, [selectedFramework]);

  const filteredControls = useMemo(() => {
    if (!selectedFramework) return [];
    const search = searchQuery.trim().toLowerCase();

    return selectedFramework.controls.filter((control) => {
      const matchesSearch =
        !search ||
        control.controlId.toLowerCase().includes(search) ||
        control.title.toLowerCase().includes(search) ||
        (control.category || "").toLowerCase().includes(search) ||
        (control.ownerRole || "").toLowerCase().includes(search);

      const matchesStatus = selectedStatus === "ALL" || control.status === selectedStatus;
      const matchesNist =
        selectedNistFunction === "ALL" || control.nistCsfFunction === selectedNistFunction;

      return matchesSearch && matchesStatus && matchesNist;
    });
  }, [selectedFramework, searchQuery, selectedStatus, selectedNistFunction]);

  const frameworkStats = useMemo(() => {
    const totalFrameworks = frameworks.length;
    const totalControls = frameworks.reduce((sum, item) => sum + item.totalControls, 0);
    const totalCompliant = frameworks.reduce((sum, item) => sum + item.compliant, 0);
    const totalNonCompliant = frameworks.reduce((sum, item) => sum + item.nonCompliant, 0);
    const averageCompliance =
      totalFrameworks > 0
        ? frameworks.reduce((sum, item) => sum + item.compliancePercentage, 0) /
        totalFrameworks
        : 0;

    return {
      totalFrameworks,
      totalControls,
      totalCompliant,
      totalNonCompliant,
      averageCompliance,
    };
  }, [frameworks]);

  const selectedFrameworkStats = useMemo(() => {
    if (!selectedFramework) {
      return {
        total: 0,
        compliant: 0,
        nonCompliant: 0,
        partial: 0,
        notAssessed: 0,
      };
    }

    return {
      total: selectedFramework.totalControls,
      compliant: selectedFramework.compliant,
      nonCompliant: selectedFramework.nonCompliant,
      partial: selectedFramework.partiallyCompliant,
      notAssessed: selectedFramework.notAssessed,
    };
  }, [selectedFramework]);

  const topFrameworkName = useMemo(() => {
    if (!frameworks.length) return "N/A";
    const sorted = [...frameworks].sort(
      (a, b) => b.compliancePercentage - a.compliancePercentage,
    );
    return sorted[0]?.frameworkName || "N/A";
  }, [frameworks]);

  if (isLoading && frameworks.length === 0) {
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
          title="Compliance"
          description="Track frameworks, controls, and evidence in one unified workspace."
          badge={
            <>
              <FileCheck size={13} className="mr-2" />
              Compliance Operations
            </>
          }
          actions={
            <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 xl:w-auto xl:justify-end">
              <button
                type="button"
                onClick={() => void fetchCompliance({ silent: true })}
                className="inline-flex flex-none items-center gap-2 whitespace-nowrap rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-all duration-200 hover:-translate-y-px hover:bg-[var(--bg-elevated)] active:translate-y-0"
              >
                <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => void startMonitoring()}
                className="inline-flex flex-none items-center gap-2 whitespace-nowrap rounded-xl border border-[var(--compliance-info-border)] bg-[var(--compliance-info-bg)] px-4 py-2 text-sm font-medium text-[var(--compliance-info-text)] transition-all duration-200 hover:-translate-y-px hover:bg-[var(--compliance-info-hover-bg)] active:translate-y-0"
              >
                <Activity size={14} />
                Monitor Evidence
              </button>
              <button
                type="button"
                onClick={() => void runAutomatedAssessment()}
                disabled={!selectedFramework || isRunningAssessment}
                className="inline-flex flex-none items-center gap-2 whitespace-nowrap rounded-xl border border-[var(--compliance-success-border)] bg-[var(--compliance-success-bg)] px-4 py-2 text-sm font-medium text-[var(--compliance-success-text)] transition-all duration-200 hover:-translate-y-px hover:bg-[var(--compliance-success-hover-bg)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
              >
                <Shield size={14} className={isRunningAssessment ? "animate-pulse" : ""} />
                {isRunningAssessment ? "Assessing..." : "Auto Assess"}
              </button>
              <button
                type="button"
                onClick={openTemplateModal}
                className="inline-flex flex-none items-center gap-2 whitespace-nowrap rounded-xl border border-[var(--compliance-cyan-border)] bg-[var(--compliance-cyan-bg)] px-4 py-2 text-sm font-medium text-[var(--compliance-cyan-text)] transition-all duration-200 hover:-translate-y-px hover:bg-[var(--compliance-cyan-hover-bg)] active:translate-y-0"
              >
                <Layers size={14} />
                Import Template
              </button>
              <button
                type="button"
                onClick={exportToCsv}
                disabled={!selectedFramework}
                className="inline-flex flex-none items-center gap-2 whitespace-nowrap rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-all duration-200 hover:-translate-y-px hover:bg-[var(--bg-elevated)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
              >
                <Download size={14} />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => void exportToPDF()}
                disabled={!selectedFramework || isExportingPdf}
                className="inline-flex flex-none items-center gap-2 whitespace-nowrap rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-all duration-200 hover:-translate-y-px hover:bg-[var(--bg-elevated)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
              >
                <FileCheck size={14} />
                {isExportingPdf ? "Generating PDF..." : "Board PDF"}
              </button>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="btn btn-primary inline-flex flex-none items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-px active:translate-y-0"
              >
                <Plus size={14} />
                Add Framework
              </button>
            </div>
          }
          stats={[
            {
              label: "Total Frameworks",
              value: numberFormatter.format(frameworkStats.totalFrameworks),
              icon: Layers,
            },
            {
              label: "Average Coverage",
              value: `${frameworkStats.averageCompliance.toFixed(0)}%`,
              icon: Shield,
            },
            {
              label: "Total Controls",
              value: numberFormatter.format(frameworkStats.totalControls),
              icon: Target,
            }
          ]}
        />

        {pageError ? (
          <section className="rounded-2xl border border-red-400/25 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-200">
            {pageError}
          </section>
        ) : null}

        {actionError ? (
          <section className="rounded-2xl border border-red-400/25 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-200">
            {actionError}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Frameworks",
              value: frameworkStats.totalFrameworks,
              hint: "Active compliance models",
              icon: Layers,
            },
            {
              label: "Average Coverage",
              value: `${frameworkStats.averageCompliance.toFixed(0)}%`,
              hint: "Across all frameworks",
              icon: Shield,
            },
            {
              label: "Compliant Controls",
              value: frameworkStats.totalCompliant,
              hint: "Passing assessments",
              icon: CheckCircle2,
            },
            {
              label: "Non-Compliant",
              value: frameworkStats.totalNonCompliant,
              hint: "Requiring remediation",
              icon: AlertTriangle,
            },
            {
              label: "Top Framework",
              value: topFrameworkName,
              hint: "Highest coverage currently",
              icon: Target,
            },
          ].map((metric, index) => {
            const Icon = metric.icon;
            return (
              <article
                key={metric.label}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/35 hover:shadow-lg hover:shadow-sky-300/10 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 90}ms`, animationFillMode: "backwards" }}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm text-[var(--text-muted)]">{metric.label}</p>
                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2 transition-transform duration-200 hover:scale-110">
                    <Icon size={15} className="text-[var(--text-secondary)]" />
                  </div>
                </div>
                <p className="mt-4 text-2xl font-semibold text-[var(--text-primary)] break-words">{metric.value}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{metric.hint}</p>
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 sm:p-5 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Framework Selector</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Choose a framework to inspect controls and assessments.
              </p>
            </div>
            <span className="text-xs text-[var(--text-muted)]">
              {frameworks.length === 0
                ? "No frameworks configured"
                : `${frameworks.length} frameworks loaded`}
            </span>
          </div>

          {frameworks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-tertiary)] p-10 text-center">
              <FileCheck className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
              <p className="mt-4 text-base font-medium text-[var(--text-primary)]">No Frameworks Yet</p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Add your first framework to start tracking controls and evidence.
              </p>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition-all duration-200 hover:bg-sky-200 hover:scale-105 active:scale-95"
              >
                <Plus size={14} />
                Add Framework
              </button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {frameworks.map((framework, index) => {
                const isSelected = selectedFramework?.frameworkId === framework.frameworkId;
                const maturityTone = getMaturityTone(framework.avgMaturityLevel);
                return (
                  <article
                    key={framework.frameworkId}
                    onClick={() => setSelectedFramework(framework)}
                    className={cn(
                      "group relative cursor-pointer rounded-xl border p-4 transition-all duration-300 animate-in fade-in zoom-in-95",
                      isSelected
                        ? "border-sky-300/35 bg-sky-400/10 shadow-lg shadow-sky-400/10"
                        : "border-[var(--border-color)] bg-[var(--bg-tertiary)] hover:border-sky-300/30 hover:bg-[var(--bg-tertiary)] hover:scale-[1.02]",
                    )}
                    style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {framework.frameworkName}
                        </h3>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {numberFormatter.format(framework.totalControls)} controls
                        </p>
                      </div>
                      <FrameworkActions
                        framework={framework as unknown as Record<string, unknown>}
                        onEdit={() => {
                          setSelectedFramework(framework);
                          setIsEditFrameworkModalOpen(true);
                        }}
                        onDelete={() => void handleDeleteFramework(framework.frameworkId)}
                        isDeleting={deletingFrameworkId === framework.frameworkId}
                      />
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs">
                      <span className={cn("font-semibold", getComplianceTone(framework.compliancePercentage))}>
                        {framework.compliancePercentage.toFixed(0)}% compliant
                      </span>
                      <span className={cn("rounded-md border px-2 py-1 font-medium", maturityTone.tone)}>
                        L{framework.avgMaturityLevel.toFixed(1)}
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700 ease-out",
                          getComplianceBarTone(framework.compliancePercentage),
                        )}
                        style={{
                          width: `${Math.min(Math.max(framework.compliancePercentage, 0), 100)}%`,
                        }}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                      <span className="text-emerald-700 dark:text-emerald-200">{framework.compliant} passing</span>
                      <span className="text-red-700 dark:text-red-200">{framework.nonCompliant} failing</span>
                      <ChevronRight
                        size={13}
                        className={cn(
                          "transition-transform duration-300",
                          isSelected ? "translate-x-0 text-sky-700 dark:text-sky-200" : "text-[var(--text-muted)] group-hover:translate-x-0.5",
                        )}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="grid gap-5 xl:grid-cols-12">
          <div className="xl:col-span-8 space-y-4">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
              {selectedFramework ? (
                <>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                        {selectedFramework.frameworkName} Controls
                      </h2>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        Review status, ownership, and NIST alignment across all mapped controls.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddControlModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition-all duration-200 hover:bg-sky-200 hover:scale-105 active:scale-95"
                    >
                      <Plus size={14} />
                      Add Control
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr),180px,180px,auto]">
                    <label className="relative block">
                      <Search
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                      />
                      <input
                        type="text"
                        placeholder="Search control ID, title, owner, category..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus:border-sky-300/45"
                      />
                    </label>

                    <label className="relative block">
                      <Filter
                        size={14}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                      />
                      <select
                        value={selectedStatus}
                        onChange={(event) =>
                          setSelectedStatus(event.target.value as "ALL" | FrameworkControl["status"])
                        }
                        className="h-11 w-full appearance-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] pl-9 pr-8 text-sm text-[var(--text-primary)] outline-none transition-colors duration-200 focus:border-sky-300/45"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="COMPLIANT">Compliant</option>
                        <option value="NON_COMPLIANT">Non-Compliant</option>
                        <option value="PARTIALLY_COMPLIANT">Partial</option>
                        <option value="NOT_ASSESSED">Not Assessed</option>
                      </select>
                    </label>

                    <label className="relative block">
                      <Layers
                        size={14}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                      />
                      <select
                        value={selectedNistFunction}
                        onChange={(event) =>
                          setSelectedNistFunction(
                            event.target.value as "ALL" | keyof typeof nistCsfConfig,
                          )
                        }
                        className="h-11 w-full appearance-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] pl-9 pr-8 text-sm text-[var(--text-primary)] outline-none transition-colors duration-200 focus:border-sky-300/45"
                      >
                        <option value="ALL">All NIST Functions</option>
                        {Object.entries(nistCsfConfig).map(([key, item]) => (
                          <option key={key} value={key}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedStatus("ALL");
                        setSelectedNistFunction("ALL");
                      }}
                      className="h-11 rounded-xl border border-[var(--border-hover)] bg-[var(--bg-tertiary)] px-4 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 hover:bg-[var(--bg-elevated)]"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {[
                      {
                        key: "ALL",
                        label: `All (${selectedFrameworkStats.total})`,
                        tone: "border-[var(--border-hover)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
                      },
                      {
                        key: "COMPLIANT",
                        label: `Compliant (${selectedFrameworkStats.compliant})`,
                        tone: "border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
                      },
                      {
                        key: "NON_COMPLIANT",
                        label: `Non-Compliant (${selectedFrameworkStats.nonCompliant})`,
                        tone: "border-red-400/30 bg-red-500/10 text-red-700 dark:text-red-200",
                      },
                      {
                        key: "PARTIALLY_COMPLIANT",
                        label: `Partial (${selectedFrameworkStats.partial})`,
                        tone: "border-yellow-400/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-200",
                      },
                      {
                        key: "NOT_ASSESSED",
                        label: `Not Assessed (${selectedFrameworkStats.notAssessed})`,
                        tone: "border-[var(--border-hover)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
                      },
                    ].map((chip) => (
                      <button
                        key={chip.key}
                        type="button"
                        onClick={() =>
                          setSelectedStatus(chip.key as "ALL" | FrameworkControl["status"])
                        }
                        className={cn(
                          "rounded-full border px-3 py-1 font-medium transition-all duration-200",
                          selectedStatus === chip.key
                            ? chip.tone
                            : "border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                        )}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-[var(--border-hover)] bg-[var(--bg-tertiary)] p-10 text-center">
                  <FileCheck className="mx-auto h-10 w-10 text-[var(--text-muted)]" />
                  <p className="mt-4 text-base font-medium text-[var(--text-primary)]">No Framework Selected</p>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    Select a framework to review and assess controls.
                  </p>
                </div>
              )}
            </div>

            {selectedFramework ? (
              <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
                {filteredControls.length === 0 ? (
                  <div className="p-14 text-center">
                    <FileCheck className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
                    <p className="mt-4 text-base font-medium text-[var(--text-primary)]">No Controls Found</p>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      Adjust filters or add controls to this framework.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-color)]">
                    {filteredControls.map((control) => {
                      const status = statusConfig[control.status] || statusConfig.NOT_ASSESSED;
                      const StatusIcon = status.icon;
                      const maturityTone = getMaturityTone(control.maturityLevel);
                      const nistInfo = control.nistCsfFunction
                        ? nistCsfConfig[control.nistCsfFunction]
                        : null;
                      const controlType = control.controlType
                        ? controlTypeConfig[control.controlType]
                        : null;

                      return (
                        <article
                          key={control.id}
                          onClick={() => {
                            setSelectedControl(control);
                            setIsAssessModalOpen(true);
                          }}
                          className="group cursor-pointer p-4 transition-colors duration-200 hover:bg-[var(--bg-tertiary)] sm:p-5"
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className={cn(
                                "mt-0.5 rounded-lg border p-2",
                                status.tone,
                              )}
                            >
                              <StatusIcon size={15} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-md border border-sky-300/35 bg-sky-300/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-sky-700 dark:text-sky-200">
                                  {control.controlId}
                                </span>
                                <span
                                  className={cn(
                                    "rounded-md px-2 py-0.5 text-[11px] font-semibold",
                                    status.softTone,
                                  )}
                                >
                                  {status.label}
                                </span>
                                <span
                                  className={cn(
                                    "rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                                    maturityTone.tone,
                                  )}
                                >
                                  L{control.maturityLevel ?? 0}
                                </span>
                                {nistInfo ? (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium"
                                    style={{
                                      backgroundColor: `${nistInfo.color}24`,
                                      color: nistInfo.color,
                                    }}
                                  >
                                    <nistInfo.icon size={11} />
                                    {nistInfo.label}
                                  </span>
                                ) : null}
                              </div>

                              <h3 className="mt-2 text-sm font-semibold text-[var(--text-primary)] transition-colors duration-200 group-hover:text-sky-800 dark:group-hover:text-sky-100 sm:text-base">
                                {control.title}
                              </h3>

                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
                                {control.category ? (
                                  <span className="rounded-md border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-0.5">
                                    {control.category}
                                  </span>
                                ) : null}
                                {controlType ? (
                                  <span
                                    className="rounded-md px-2 py-0.5"
                                    style={{
                                      backgroundColor: `${controlType.color}18`,
                                      color: controlType.color,
                                    }}
                                  >
                                    {controlType.label}
                                  </span>
                                ) : null}
                                {control.ownerRole ? (
                                  <span className="inline-flex items-center gap-1">
                                    <User size={12} />
                                    {control.ownerRole}
                                  </span>
                                ) : null}
                                {control.updatedAt ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Calendar size={12} />
                                    Updated {new Date(control.updatedAt).toLocaleDateString()}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <ControlActions
                              control={control as unknown as Record<string, unknown>}
                              onAssess={() => {
                                setSelectedControl(control);
                                setIsAssessModalOpen(true);
                              }}
                              onEvidence={() => {
                                setSelectedEvidenceControl(control);
                                setIsEvidenceModalOpen(true);
                              }}
                              onDelete={() => void handleDeleteControl(control.id)}
                              isDeleting={deletingControlId === control.id}
                            />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <aside className="xl:col-span-4 space-y-4">
            <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Framework Benchmark</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Coverage score by framework</p>
              <div className="mt-4">
                {frameworks.length > 0 ? (
                  <ComplianceBarChart data={frameworks} />
                ) : (
                  <p className="rounded-xl border border-dashed border-[var(--border-hover)] bg-[var(--bg-tertiary)] p-4 text-sm text-[var(--text-muted)]">
                    Add frameworks to see comparison trends.
                  </p>
                )}
              </div>
            </section>

            {selectedFramework ? (
              <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">Current Framework</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{selectedFramework.frameworkName}</p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Coverage",
                      value: `${selectedFramework.compliancePercentage.toFixed(0)}%`,
                      color: getComplianceTone(selectedFramework.compliancePercentage),
                    },
                    {
                      label: "Maturity",
                      value: `L${selectedFramework.avgMaturityLevel.toFixed(1)}`,
                      color: "text-sky-700 dark:text-sky-200",
                    },
                    {
                      label: "Compliant",
                      value: String(selectedFrameworkStats.compliant),
                      color: "text-emerald-700 dark:text-emerald-200",
                    },
                    {
                      label: "Non-Compliant",
                      value: String(selectedFrameworkStats.nonCompliant),
                      color: "text-red-700 dark:text-red-200",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-3"
                    >
                      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                        {item.label}
                      </p>
                      <p className={cn("mt-2 text-xl font-semibold", item.color)}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {selectedFramework ? (
              <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">NIST Coverage</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Controls per CSF function</p>
                <div className="mt-4 space-y-3">
                  {Object.entries(nistCsfConfig).map(([key, config]) => {
                    const total = selectedFramework.totalControls || 1;
                    const value = selectedFramework.nistCsfBreakdown[key] || 0;
                    const percentage = (value / total) * 100;
                    const Icon = config.icon;
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                            <Icon size={12} style={{ color: config.color }} />
                            {config.label}
                          </span>
                          <span className="text-[var(--text-muted)]">{value}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: config.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Maturity Scale</h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Reference for levels 0 to 5</p>
              <div className="mt-4 space-y-2">
                {maturityLabels.map((item) => (
                  <div key={item.level} className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-md border text-xs font-semibold",
                        item.tone,
                      )}
                    >
                      {item.level}
                    </span>
                    <span className="text-sm text-[var(--text-secondary)]">{item.label}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Compliance Framework">
        <form className="space-y-4" onSubmit={handleAddFramework}>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Framework Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. NIST CSF 2.0 or ISO 27001"
              className="input w-full"
              value={newFramework.name}
              onChange={(event) =>
                setNewFramework((prev) => ({ ...prev, name: event.target.value }))
              }
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Description
            </label>
            <textarea
              placeholder="Brief description of the framework..."
              className="input min-h-[100px] w-full py-2"
              value={newFramework.description}
              onChange={(event) =>
                setNewFramework((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)]"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-blue-700"
              disabled={isSubmitting || !newFramework.name}
            >
              {isSubmitting ? (
                <ShieldLoader size="sm" variant="cyber" className="mr-2" />
              ) : (
                <Plus size={16} className="mr-2" />
              )}
              {isSubmitting ? "Adding..." : "Add Framework"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditFrameworkModalOpen}
        onClose={() => setIsEditFrameworkModalOpen(false)}
        title="Edit Framework Info"
      >
        <form className="space-y-4" onSubmit={handleUpdateFramework}>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Framework Name
            </label>
            <input
              type="text"
              required
              className="input w-full"
              value={selectedFramework?.frameworkName || ""}
              onChange={(event) =>
                setSelectedFramework((prev) =>
                  prev
                    ? {
                      ...prev,
                      frameworkName: event.target.value,
                    }
                    : prev,
                )
              }
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Description
            </label>
            <textarea
              className="input min-h-[100px] w-full py-2"
              value={selectedFramework?.description || ""}
              onChange={(event) =>
                setSelectedFramework((prev) =>
                  prev
                    ? {
                      ...prev,
                      description: event.target.value,
                    }
                    : prev,
                )
              }
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)]"
              onClick={() => setIsEditFrameworkModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ShieldLoader size="sm" variant="cyber" className="mr-2" />
              ) : null}
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="Import Framework Template"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              Template
            </label>
            <select
              className="input w-full"
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              disabled={isTemplateLoading}
            >
              {templates.length === 0 ? (
                <option value="">No templates loaded</option>
              ) : (
                templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} {template.version} ({template.controlCount} controls)
                  </option>
                ))
              )}
            </select>
          </div>

          {selectedTemplateId ? (
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-3 text-sm text-[var(--text-secondary)]">
              {templates.find((template) => template.id === selectedTemplateId)?.description}
            </div>
          ) : null}

          <div className="flex justify-between gap-2">
            <button
              type="button"
              onClick={() => void loadTemplates()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)]"
              disabled={isTemplateLoading}
            >
              {isTemplateLoading ? "Loading..." : "Refresh Templates"}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void importTemplate()}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-blue-700"
                disabled={!selectedTemplateId || isTemplateImporting}
              >
                {isTemplateImporting ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {selectedEvidenceControl ? (
        <EvidenceUploadModal
          isOpen={isEvidenceModalOpen}
          onClose={() => {
            setIsEvidenceModalOpen(false);
            setSelectedEvidenceControl(null);
          }}
          onSuccess={() => void fetchCompliance({ silent: true })}
          controlId={selectedEvidenceControl.id}
          controlLabel={selectedEvidenceControl.controlId}
        />
      ) : null}

      {selectedFramework ? (
        <AddControlModal
          isOpen={isAddControlModalOpen}
          onClose={() => setIsAddControlModalOpen(false)}
          onSuccess={() => void fetchCompliance({ silent: true })}
          frameworkId={selectedFramework.frameworkId}
        />
      ) : null}

      {selectedControl ? (
        <AssessControlModal
          isOpen={isAssessModalOpen}
          onClose={() => {
            setIsAssessModalOpen(false);
            setSelectedControl(null);
          }}
          onSuccess={() => void fetchCompliance({ silent: true })}
          control={selectedControl as unknown as {
            id: string;
            controlId: string;
            title: string;
            description?: string;
            status?: string;
            implementationStatus?: string;
            maturityLevel?: number;
            evidence?: string;
            notes?: string;
            [key: string]: unknown;
          }}
        />
      ) : null}
    </DashboardLayout>
  );
}
