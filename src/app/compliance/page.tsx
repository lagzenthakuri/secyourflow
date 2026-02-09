"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ComplianceBarChart } from "@/components/charts/DashboardCharts";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
import { ShieldLoader } from "@/components/ui/ShieldLoader";

interface FrameworkControl {
  id: string;
  controlId: string;
  title: string;
  description?: string | null;
  status:
    | "COMPLIANT"
    | "NON_COMPLIANT"
    | "PARTIALLY_COMPLIANT"
    | "NOT_ASSESSED"
    | "NOT_APPLICABLE";
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

const statusConfig = {
  COMPLIANT: {
    label: "Compliant",
    icon: CheckCircle2,
    tone: "border-emerald-400/35 bg-emerald-500/10 text-emerald-200",
    softTone: "bg-emerald-500/15 text-emerald-300",
  },
  NON_COMPLIANT: {
    label: "Non-Compliant",
    icon: XCircle,
    tone: "border-red-400/35 bg-red-500/10 text-red-200",
    softTone: "bg-red-500/15 text-red-300",
  },
  PARTIALLY_COMPLIANT: {
    label: "Partial",
    icon: AlertTriangle,
    tone: "border-yellow-400/35 bg-yellow-500/10 text-yellow-200",
    softTone: "bg-yellow-500/15 text-yellow-300",
  },
  NOT_ASSESSED: {
    label: "Not Assessed",
    icon: HelpCircle,
    tone: "border-slate-400/35 bg-slate-500/10 text-slate-200",
    softTone: "bg-slate-500/15 text-slate-300",
  },
  NOT_APPLICABLE: {
    label: "N/A",
    icon: HelpCircle,
    tone: "border-slate-400/35 bg-slate-500/10 text-slate-200",
    softTone: "bg-slate-500/15 text-slate-300",
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
  { level: 0, label: "Non-existent", color: "#94a3b8" },
  { level: 1, label: "Ad Hoc", color: "#f87171" },
  { level: 2, label: "Repeatable", color: "#fb923c" },
  { level: 3, label: "Defined", color: "#facc15" },
  { level: 4, label: "Managed", color: "#34d399" },
  { level: 5, label: "Optimized", color: "#38bdf8" },
] as const;

const controlTypeConfig = {
  PREVENTIVE: { label: "Preventive", color: "#34d399" },
  DETECTIVE: { label: "Detective", color: "#fb923c" },
  CORRECTIVE: { label: "Corrective", color: "#60a5fa" },
} as const;

const numberFormatter = new Intl.NumberFormat("en-US");

function getComplianceTone(value: number) {
  if (value >= 80) return "text-emerald-300";
  if (value >= 60) return "text-yellow-300";
  return "text-red-300";
}

function getComplianceBarTone(value: number) {
  if (value >= 80) return "bg-emerald-400";
  if (value >= 60) return "bg-yellow-400";
  return "bg-red-400";
}

function escapeCsv(value: unknown): string {
  const str = String(value ?? "");
  if (!str.includes(",") && !str.includes("\"") && !str.includes("\n")) {
    return str;
  }
  return `"${str.replace(/"/g, '""')}"`;
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

  const exportToPDF = useCallback(() => {
    if (!selectedFramework) return;

    const doc = new jsPDF();
    const frameworkName = selectedFramework.frameworkName;
    const date = new Date().toLocaleDateString();

    doc.setFontSize(22);
    doc.setTextColor(56, 189, 248);
    doc.text("SECYOURFLOW", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(125, 125, 125);
    doc.text("Enterprise Security GRC Platform", 14, 28);

    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(`${frameworkName} Compliance Report`, 14, 45);

    doc.setFontSize(11);
    doc.setTextColor(90, 90, 90);
    doc.text(`Generated on: ${date}`, 14, 52);

    doc.setFontSize(14);
    doc.setTextColor(60, 60, 60);
    doc.text("Executive Summary", 14, 65);

    const stats = [
      ["Total Controls", selectedFramework.totalControls.toString()],
      ["Compliant Controls", selectedFramework.compliant.toString()],
      ["Non-Compliant Controls", selectedFramework.nonCompliant.toString()],
      ["Partially Compliant Controls", selectedFramework.partiallyCompliant.toString()],
      [
        "Aggregated Compliance Score",
        `${selectedFramework.compliancePercentage.toFixed(1)}%`,
      ],
      [
        "Capability Maturity Level (Avg)",
        `Level ${(selectedFramework.avgMaturityLevel || 0).toFixed(1)}`,
      ],
    ];

    autoTable(doc, {
      startY: 70,
      head: [["Compliance Governance Metric", "Current Assessment"]],
      body: stats,
      theme: "striped",
      headStyles: { fillColor: [56, 189, 248], textColor: 255 },
      styles: { cellPadding: 5 },
    });

    const finalY = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 70;
    doc.setFontSize(14);
    doc.text("NIST CSF 2.0 Mapping Breakdown", 14, finalY + 15);

    const nistData = Object.entries(nistCsfConfig).map(([key, config]) => [
      config.label,
      String(selectedFramework.nistCsfBreakdown[key] || 0),
    ]);

    autoTable(doc, {
      startY: finalY + 20,
      head: [["NIST Function", "Control Count"]],
      body: nistData,
      theme: "grid",
      headStyles: { fillColor: [88, 88, 88] },
    });

    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text("Detailed Control Assessment List", 14, 22);

    const tableData = selectedFramework.controls.map((control) => [
      control.controlId,
      control.title,
      control.status.replace(/_/g, " "),
      `L${control.maturityLevel ?? 0}`,
      control.ownerRole || "N/A",
    ]);

    autoTable(doc, {
      startY: 30,
      head: [["ID", "Control Description", "Compliance Status", "Maturity", "Owner"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [56, 189, 248] },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 1: { cellWidth: 80 } },
    });

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      doc.setPage(page);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Confidential - SECYOURFLOW GRC Platform - Page ${page} of ${pageCount}`,
        14,
        285,
      );
    }

    doc.save(`${frameworkName}_Board_Report_${new Date().toISOString().split("T")[0]}.pdf`);
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
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(132deg,rgba(56,189,248,0.2),rgba(18,18,26,0.9)_44%,rgba(18,18,26,0.96))] p-6 sm:p-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky-300/20 blur-3xl animate-pulse" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/35 bg-sky-300/10 px-3 py-1 text-xs font-medium text-sky-200">
                <FileCheck size={13} />
                Compliance Operations
              </div>
              <h1 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">Compliance</h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-200 sm:text-base">
                Keep every framework, control owner, and evidence trail aligned in a single
                operating surface for your SOC and governance teams.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-100">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  {numberFormatter.format(frameworkStats.totalFrameworks)} frameworks
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  {numberFormatter.format(frameworkStats.totalControls)} controls
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  {frameworkStats.averageCompliance.toFixed(0)}% avg compliance
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => void fetchCompliance({ silent: true })}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-white/15 hover:scale-105 active:scale-95"
              >
                <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => void startMonitoring()}
                className="inline-flex items-center gap-2 rounded-xl border border-sky-300/30 bg-sky-300/10 px-4 py-2 text-sm font-medium text-sky-100 transition-all duration-200 hover:bg-sky-300/20 hover:scale-105 active:scale-95"
              >
                <Activity size={14} />
                Monitor Evidence
              </button>
              <button
                type="button"
                onClick={exportToCsv}
                disabled={!selectedFramework}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-white/15 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                <Download size={14} />
                Export CSV
              </button>
              <button
                type="button"
                onClick={exportToPDF}
                disabled={!selectedFramework}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-white/15 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                <FileCheck size={14} />
                Board PDF
              </button>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 transition-all duration-200 hover:bg-sky-200 hover:scale-105 active:scale-95"
              >
                <Plus size={14} />
                Add Framework
              </button>
            </div>
          </div>
        </section>

        {pageError ? (
          <section className="rounded-2xl border border-red-400/25 bg-red-500/5 p-4 text-sm text-red-200">
            {pageError}
          </section>
        ) : null}

        {actionError ? (
          <section className="rounded-2xl border border-red-400/25 bg-red-500/5 p-4 text-sm text-red-200">
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
                className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300/35 hover:shadow-lg hover:shadow-sky-300/10 animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 90}ms`, animationFillMode: "backwards" }}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm text-slate-300">{metric.label}</p>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2 transition-transform duration-200 hover:scale-110">
                    <Icon size={15} className="text-slate-200" />
                  </div>
                </div>
                <p className="mt-4 text-2xl font-semibold text-white break-words">{metric.value}</p>
                <p className="mt-1 text-sm text-slate-400">{metric.hint}</p>
              </article>
            );
          })}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-4 sm:p-5 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Framework Selector</h2>
              <p className="text-sm text-slate-400">
                Choose a framework to inspect controls and assessments.
              </p>
            </div>
            <span className="text-xs text-slate-500">
              {frameworks.length === 0
                ? "No frameworks configured"
                : `${frameworks.length} frameworks loaded`}
            </span>
          </div>

          {frameworks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-10 text-center">
              <FileCheck className="mx-auto h-12 w-12 text-slate-500" />
              <p className="mt-4 text-base font-medium text-white">No Frameworks Yet</p>
              <p className="mt-2 text-sm text-slate-400">
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
                        : "border-white/10 bg-white/[0.02] hover:border-sky-300/30 hover:bg-white/[0.04] hover:scale-[1.02]",
                    )}
                    style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-white">
                          {framework.frameworkName}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
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
                      <span
                        className="rounded-md px-2 py-1 font-medium"
                        style={{
                          backgroundColor: `${maturityTone.color}22`,
                          color: maturityTone.color,
                        }}
                      >
                        L{framework.avgMaturityLevel.toFixed(1)}
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
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

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{framework.compliant} passing</span>
                      <span>{framework.nonCompliant} failing</span>
                      <ChevronRight
                        size={13}
                        className={cn(
                          "transition-transform duration-300",
                          isSelected ? "translate-x-0 text-sky-200" : "text-slate-500 group-hover:translate-x-0.5",
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
            <div className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5">
              {selectedFramework ? (
                <>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {selectedFramework.frameworkName} Controls
                      </h2>
                      <p className="mt-1 text-sm text-slate-400">
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
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                      />
                      <input
                        type="text"
                        placeholder="Search control ID, title, owner, category..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-3 text-sm text-white outline-none transition-colors duration-200 placeholder:text-slate-500 focus:border-sky-300/45"
                      />
                    </label>

                    <label className="relative block">
                      <Filter
                        size={14}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                      />
                      <select
                        value={selectedStatus}
                        onChange={(event) =>
                          setSelectedStatus(event.target.value as "ALL" | FrameworkControl["status"])
                        }
                        className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-8 text-sm text-slate-100 outline-none transition-colors duration-200 focus:border-sky-300/45"
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
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                      />
                      <select
                        value={selectedNistFunction}
                        onChange={(event) =>
                          setSelectedNistFunction(
                            event.target.value as "ALL" | keyof typeof nistCsfConfig,
                          )
                        }
                        className="h-11 w-full appearance-none rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-8 text-sm text-slate-100 outline-none transition-colors duration-200 focus:border-sky-300/45"
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
                      className="h-11 rounded-xl border border-white/20 bg-white/[0.04] px-4 text-sm font-medium text-slate-200 transition-all duration-200 hover:bg-white/[0.08]"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {[
                      {
                        key: "ALL",
                        label: `All (${selectedFrameworkStats.total})`,
                        tone: "border-white/20 bg-white/[0.05] text-slate-200",
                      },
                      {
                        key: "COMPLIANT",
                        label: `Compliant (${selectedFrameworkStats.compliant})`,
                        tone: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
                      },
                      {
                        key: "NON_COMPLIANT",
                        label: `Non-Compliant (${selectedFrameworkStats.nonCompliant})`,
                        tone: "border-red-400/30 bg-red-500/10 text-red-200",
                      },
                      {
                        key: "PARTIALLY_COMPLIANT",
                        label: `Partial (${selectedFrameworkStats.partial})`,
                        tone: "border-yellow-400/30 bg-yellow-500/10 text-yellow-200",
                      },
                      {
                        key: "NOT_ASSESSED",
                        label: `Not Assessed (${selectedFrameworkStats.notAssessed})`,
                        tone: "border-slate-400/30 bg-slate-500/10 text-slate-200",
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
                            : "border-white/10 bg-white/[0.02] text-slate-400 hover:text-slate-200",
                        )}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
                  <FileCheck className="mx-auto h-10 w-10 text-slate-500" />
                  <p className="mt-4 text-base font-medium text-white">No Framework Selected</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Select a framework to review and assess controls.
                  </p>
                </div>
              )}
            </div>

            {selectedFramework ? (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)]">
                {filteredControls.length === 0 ? (
                  <div className="p-14 text-center">
                    <FileCheck className="mx-auto h-12 w-12 text-slate-500" />
                    <p className="mt-4 text-base font-medium text-white">No Controls Found</p>
                    <p className="mt-2 text-sm text-slate-400">
                      Adjust filters or add controls to this framework.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/10">
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
                          className="group cursor-pointer p-4 transition-colors duration-200 hover:bg-white/[0.04] sm:p-5"
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
                                <span className="rounded-md border border-sky-300/35 bg-sky-300/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-sky-200">
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
                                  className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                                  style={{
                                    backgroundColor: `${maturityTone.color}22`,
                                    color: maturityTone.color,
                                  }}
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

                              <h3 className="mt-2 text-sm font-semibold text-white transition-colors duration-200 group-hover:text-sky-100 sm:text-base">
                                {control.title}
                              </h3>

                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                {control.category ? (
                                  <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5">
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
            <section className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5">
              <h3 className="text-base font-semibold text-white">Framework Benchmark</h3>
              <p className="mt-1 text-sm text-slate-400">Coverage score by framework</p>
              <div className="mt-4">
                {frameworks.length > 0 ? (
                  <ComplianceBarChart data={frameworks} />
                ) : (
                  <p className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-sm text-slate-400">
                    Add frameworks to see comparison trends.
                  </p>
                )}
              </div>
            </section>

            {selectedFramework ? (
              <section className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5">
                <h3 className="text-base font-semibold text-white">Current Framework</h3>
                <p className="mt-1 text-sm text-slate-400">{selectedFramework.frameworkName}</p>

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
                      color: "text-sky-200",
                    },
                    {
                      label: "Compliant",
                      value: String(selectedFrameworkStats.compliant),
                      color: "text-emerald-200",
                    },
                    {
                      label: "Non-Compliant",
                      value: String(selectedFrameworkStats.nonCompliant),
                      color: "text-red-200",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                    >
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">
                        {item.label}
                      </p>
                      <p className={cn("mt-2 text-xl font-semibold", item.color)}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {selectedFramework ? (
              <section className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5">
                <h3 className="text-base font-semibold text-white">NIST Coverage</h3>
                <p className="mt-1 text-sm text-slate-400">Controls per CSF function</p>
                <div className="mt-4 space-y-3">
                  {Object.entries(nistCsfConfig).map(([key, config]) => {
                    const total = selectedFramework.totalControls || 1;
                    const value = selectedFramework.nistCsfBreakdown[key] || 0;
                    const percentage = (value / total) * 100;
                    const Icon = config.icon;
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-1.5 text-slate-200">
                            <Icon size={12} style={{ color: config.color }} />
                            {config.label}
                          </span>
                          <span className="text-slate-400">{value}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
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

            <section className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-5">
              <h3 className="text-base font-semibold text-white">Maturity Scale</h3>
              <p className="mt-1 text-sm text-slate-400">Reference for levels 0 to 5</p>
              <div className="mt-4 space-y-2">
                {maturityLabels.map((item) => (
                  <div key={item.level} className="flex items-center gap-2">
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold"
                      style={{
                        backgroundColor: `${item.color}22`,
                        color: item.color,
                      }}
                    >
                      {item.level}
                    </span>
                    <span className="text-sm text-slate-300">{item.label}</span>
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
              className="btn btn-secondary"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
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
              className="btn btn-secondary"
              onClick={() => setIsEditFrameworkModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <ShieldLoader size="sm" variant="cyber" className="mr-2" />
              ) : null}
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

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
