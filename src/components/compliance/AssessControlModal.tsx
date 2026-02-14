"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Loader2, AlertCircle, Info } from "lucide-react";
import { ComplianceStatus, ImplementationStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

interface AssessControlModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
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
}

const COMPLIANCE_STATUSES: ComplianceStatus[] = [
    "COMPLIANT", "NON_COMPLIANT", "PARTIALLY_COMPLIANT", "NOT_ASSESSED", "NOT_APPLICABLE"
];

const IMPLEMENTATION_STATUSES: ImplementationStatus[] = [
    "IMPLEMENTED", "PARTIALLY_IMPLEMENTED", "PLANNED", "NOT_IMPLEMENTED", "NOT_APPLICABLE"
];

const CONTROL_TYPES = ["PREVENTIVE", "DETECTIVE", "CORRECTIVE"];
const CONTROL_FREQUENCIES = ["CONTINUOUS", "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"];
const NIST_CSF_FUNCTIONS = ["GOVERN", "IDENTIFY", "PROTECT", "DETECT", "RESPOND", "RECOVER"];

const statusStyles: Record<ComplianceStatus, { bg: string; text: string }> = {
    COMPLIANT: { bg: "bg-green-500/10", text: "text-green-600 dark:text-green-400" },
    NON_COMPLIANT: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400" },
    PARTIALLY_COMPLIANT: { bg: "bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-400" },
    NOT_ASSESSED: { bg: "bg-gray-500/10", text: "text-gray-600 dark:text-gray-400" },
    NOT_APPLICABLE: { bg: "bg-gray-500/10", text: "text-gray-600 dark:text-gray-400" },
};

export function AssessControlModal({ isOpen, onClose, onSuccess, control }: AssessControlModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        controlId: control?.controlId || "",
        title: control?.title || "",
        status: (control?.status || "NOT_ASSESSED") as ComplianceStatus,
        implementationStatus: (control?.implementationStatus || "NOT_IMPLEMENTED") as ImplementationStatus,
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
                implementationStatus: control.implementationStatus as ImplementationStatus,
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
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Assess Control: ${control?.controlId}`}
            maxWidth="xl"
        >
            <form onSubmit={handleSubmit} className="p-1 space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {/* Basic Info */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Control Title
                        </label>
                        <input
                            type="text"
                            required
                            className="input w-full"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    {/* Left Column: Statuses */}
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">
                                Compliance Status *
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                {COMPLIANCE_STATUSES.map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, status })}
                                        className={cn(
                                            "flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all",
                                            formData.status === status
                                                ? `${statusStyles[status].bg} ${statusStyles[status].text} border-current ring-1 ring-current`
                                                : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-secondary)]"
                                        )}
                                    >
                                        {status.replace(/_/g, " ")}
                                        {formData.status === status && <div className="w-2 h-2 rounded-full bg-current" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-[var(--text-secondary)]">
                                Implementation Status *
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                {IMPLEMENTATION_STATUSES.map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, implementationStatus: status })}
                                        className={cn(
                                            "flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all",
                                            formData.implementationStatus === status
                                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/50 ring-1 ring-blue-500/50"
                                                : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-secondary)]"
                                        )}
                                    >
                                        {status.replace(/_/g, " ")}
                                        {formData.implementationStatus === status && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Framework Metadata */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                    Maturity Level (0-5)
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="0"
                                        max="5"
                                        step="1"
                                        className="flex-1 accent-blue-500"
                                        value={formData.maturityLevel}
                                        onChange={(e) => setFormData({ ...formData, maturityLevel: parseInt(e.target.value) })}
                                    />
                                    <span className="text-xl font-bold text-[var(--text-primary)] w-8 text-center">{formData.maturityLevel}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                    Control Type
                                </label>
                                <select
                                    className="input w-full"
                                    value={formData.controlType}
                                    onChange={(e) => setFormData({ ...formData, controlType: e.target.value })}
                                >
                                    {CONTROL_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                    Assessment Frequency
                                </label>
                                <select
                                    className="input w-full"
                                    value={formData.frequency}
                                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                                >
                                    {CONTROL_FREQUENCIES.map(freq => (
                                        <option key={freq} value={freq}>{freq.replace(/_/g, " ")}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                    NIST CSF Function
                                </label>
                                <select
                                    className="input w-full"
                                    value={formData.nistCsfFunction || ""}
                                    onChange={(e) => setFormData({ ...formData, nistCsfFunction: e.target.value || null })}
                                >
                                    <option value="">None</option>
                                    {NIST_CSF_FUNCTIONS.map(func => (
                                        <option key={func} value={func}>{func}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                                    Owner Role
                                </label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    placeholder="e.g. CISO, IT Security, Risk Team"
                                    value={formData.ownerRole}
                                    onChange={(e) => setFormData({ ...formData, ownerRole: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <div className="flex items-center gap-2 mb-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">
                                Evidence
                            </label>
                            <div className="group relative">
                                <Info size={14} className="text-[var(--text-muted)] cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-lg text-[10px] text-[var(--text-muted)] hidden group-hover:block z-50 shadow-2xl">
                                    Describe the evidence supporting the compliance status or provide links to documentation.
                                </div>
                            </div>
                        </div>
                        <textarea
                            className="input w-full min-h-[100px]"
                            placeholder="e.g., Audit logs verified for Q4, Screenshots attached in DMS index #452"
                            value={formData.evidence}
                            onChange={(e) => setFormData({ ...formData, evidence: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Internal Notes
                        </label>
                        <textarea
                            className="input w-full min-h-[80px]"
                            placeholder="Add internal notes about the implementation or remediation plans..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-secondary"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
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
