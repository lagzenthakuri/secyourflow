"use client";
import type { ComplianceStatus, ImplementationStatus } from "@repo/database";
import { Input as BoilerplateInput } from "@repo/design-system/components/ui/input";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea as BoilerplateTextarea } from "@repo/design-system/components/ui/textarea";
import { AlertCircle, Info, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

interface AssessControlModalProps {
  control: {
    id: string;
    controlId: string;
    title: string;
    description?: string | null;
    status?: string;
    implementationStatus?: string;
    maturityLevel?: number | null;
    evidence?: string | null;
    notes?: string | null;
    controlType?: string | null;
    frequency?: string | null;
    ownerRole?: string | null;
    nistCsfFunction?: string | null;
    [key: string]: unknown;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const COMPLIANCE_STATUSES: ComplianceStatus[] = [
  "COMPLIANT",
  "NON_COMPLIANT",
  "PARTIALLY_COMPLIANT",
  "NOT_ASSESSED",
  "NOT_APPLICABLE",
];

const IMPLEMENTATION_STATUSES: ImplementationStatus[] = [
  "IMPLEMENTED",
  "PARTIALLY_IMPLEMENTED",
  "PLANNED",
  "NOT_IMPLEMENTED",
  "NOT_APPLICABLE",
];

const CONTROL_TYPES = ["PREVENTIVE", "DETECTIVE", "CORRECTIVE"];
const CONTROL_FREQUENCIES = [
  "CONTINUOUS",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "SEMI_ANNUAL",
  "ANNUAL",
];
const NIST_CSF_FUNCTIONS = [
  "GOVERN",
  "IDENTIFY",
  "PROTECT",
  "DETECT",
  "RESPOND",
  "RECOVER",
];

const statusStyles: Record<ComplianceStatus, { bg: string; text: string }> = {
  COMPLIANT: {
    bg: "bg-green-500/10",
    text: "text-green-600 dark:text-green-400",
  },
  NON_COMPLIANT: { bg: "bg-red-500/10", text: "text-intent-danger" },
  PARTIALLY_COMPLIANT: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-600 dark:text-yellow-400",
  },
  NOT_ASSESSED: {
    bg: "bg-gray-500/10",
    text: "text-gray-600 dark:text-gray-400",
  },
  NOT_APPLICABLE: {
    bg: "bg-gray-500/10",
    text: "text-gray-600 dark:text-gray-400",
  },
};

export function AssessControlModal({
  isOpen,
  onClose,
  onSuccess,
  control,
}: AssessControlModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    controlId: control?.controlId || "",
    title: control?.title || "",
    status: (control?.status || "NOT_ASSESSED") as ComplianceStatus,
    implementationStatus: (control?.implementationStatus ||
      "NOT_IMPLEMENTED") as ImplementationStatus,
    evidence: control?.evidence || "",
    notes: control?.notes || "",
    maturityLevel: control?.maturityLevel || 0,
    controlType: control?.controlType || "PREVENTIVE",
    frequency: control?.frequency || "ANNUAL",
    ownerRole: control?.ownerRole || "",
    nistCsfFunction: control?.nistCsfFunction || null,
  });

  useEffect(() => {
    if (isOpen && control) {
      setFormData({
        controlId: control.controlId,
        title: control.title,
        status: control.status as ComplianceStatus,
        implementationStatus:
          control.implementationStatus as ImplementationStatus,
        evidence: control.evidence || "",
        notes: control.notes || "",
        maturityLevel: control.maturityLevel || 0,
        controlType: control.controlType || "PREVENTIVE",
        frequency: control.frequency || "ANNUAL",
        ownerRole: control.ownerRole || "",
        nistCsfFunction: control.nistCsfFunction || null,
      });
    }
  }, [isOpen, control]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/compliance/controls/${control.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update control");
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      maxWidth="xl"
      onClose={onClose}
      title={`Assess Control: ${control?.controlId}`}
    >
      <form
        className="custom-scrollbar max-h-[85vh] space-y-6 overflow-y-auto p-1"
        onSubmit={handleSubmit}
      >
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-intent-danger text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          {/* Basic Info */}
          <div className="md:col-span-2">
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Control Title
            </label>
            <BoilerplateInput
              className="w-full"
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              type="text"
              value={formData.title}
            />
          </div>

          {/* Left Column: Statuses */}
          <div className="space-y-4">
            <div className="space-y-3">
              <label className="block font-medium text-[var(--text-secondary)] text-sm">
                Compliance Status *
              </label>
              <div className="grid grid-cols-1 gap-2">
                {COMPLIANCE_STATUSES.map((status) => (
                  <button
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all",
                      formData.status === status
                        ? `${statusStyles[status].bg} ${statusStyles[status].text} border-current ring-1 ring-current`
                        : "border-transparent bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
                    )}
                    key={status}
                    onClick={() => setFormData({ ...formData, status })}
                    type="button"
                  >
                    {status.replace(/_/g, " ")}
                    {formData.status === status && (
                      <div className="h-2 w-2 rounded-full bg-current" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block font-medium text-[var(--text-secondary)] text-sm">
                Implementation Status *
              </label>
              <div className="grid grid-cols-1 gap-2">
                {IMPLEMENTATION_STATUSES.map((status) => (
                  <button
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all",
                      formData.implementationStatus === status
                        ? "border-blue-500/50 bg-blue-500/10 text-intent-accent ring-1 ring-blue-500/50"
                        : "border-transparent bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
                    )}
                    key={status}
                    onClick={() =>
                      setFormData({ ...formData, implementationStatus: status })
                    }
                    type="button"
                  >
                    {status.replace(/_/g, " ")}
                    {formData.implementationStatus === status && (
                      <div className="h-2 w-2 rounded-full bg-blue-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Framework Metadata */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
                  Maturity Level (0-5)
                </label>
                <div className="flex items-center gap-4">
                  <BoilerplateInput
                    className="flex-1 accent-blue-500"
                    max="5"
                    min="0"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maturityLevel: Number.parseInt(e.target.value, 10),
                      })
                    }
                    step="1"
                    type="range"
                    value={formData.maturityLevel}
                  />
                  <span className="w-8 text-center font-bold text-[var(--text-primary)] text-xl">
                    {formData.maturityLevel}
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
                  Control Type
                </label>
                <Select
                  onValueChange={(e) =>
                    setFormData({ ...formData, controlType: e })
                  }
                  value={formData.controlType}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {CONTROL_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
                  Assessment Frequency
                </label>
                <Select
                  onValueChange={(e) =>
                    setFormData({ ...formData, frequency: e })
                  }
                  value={formData.frequency}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {CONTROL_FREQUENCIES.map((freq) => (
                        <SelectItem key={freq} value={freq}>
                          {freq.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
                  NIST CSF Function
                </label>
                <Select
                  onValueChange={(e) =>
                    setFormData({
                      ...formData,
                      nistCsfFunction:
                        (e === "__select_none__" ? "" : e) || null,
                    })
                  }
                  value={formData.nistCsfFunction || "" || "__select_none__"}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="__select_none__">None</SelectItem>
                      {NIST_CSF_FUNCTIONS.map((func) => (
                        <SelectItem key={func} value={func}>
                          {func}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
                  Owner Role
                </label>
                <BoilerplateInput
                  className="w-full"
                  onChange={(e) =>
                    setFormData({ ...formData, ownerRole: e.target.value })
                  }
                  placeholder="e.g. CISO, IT Security, Risk Team"
                  type="text"
                  value={formData.ownerRole}
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="mb-2 flex items-center gap-2">
              <label className="font-medium text-[var(--text-secondary)] text-sm">
                Evidence
              </label>
              <div className="group relative">
                <Info
                  className="cursor-help text-[var(--text-muted)]"
                  size={14}
                />
                <div className="absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] p-2 text-[10px] text-[var(--text-muted)] shadow-2xl group-hover:block">
                  Describe the evidence supporting the compliance status or
                  provide links to documentation.
                </div>
              </div>
            </div>
            <BoilerplateTextarea
              className="min-h-[100px] w-full"
              onChange={(e) =>
                setFormData({ ...formData, evidence: e.target.value })
              }
              placeholder="e.g., Audit logs verified for Q4, Screenshots attached in DMS index #452"
              value={formData.evidence}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Internal Notes
            </label>
            <BoilerplateTextarea
              className="min-h-[80px] w-full"
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Add internal notes about the implementation or remediation plans..."
              value={formData.notes}
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            className="btn btn-secondary"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Saving...
              </>
            ) : (
              "Save Assessment"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
