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
    control: any;
}

const COMPLIANCE_STATUSES: ComplianceStatus[] = [
    "COMPLIANT", "NON_COMPLIANT", "PARTIALLY_COMPLIANT", "NOT_ASSESSED", "NOT_APPLICABLE"
];

const IMPLEMENTATION_STATUSES: ImplementationStatus[] = [
    "IMPLEMENTED", "PARTIALLY_IMPLEMENTED", "PLANNED", "NOT_IMPLEMENTED", "NOT_APPLICABLE"
];

const statusStyles: Record<ComplianceStatus, { bg: string; text: string }> = {
    COMPLIANT: { bg: "bg-green-500/10", text: "text-green-400" },
    NON_COMPLIANT: { bg: "bg-red-500/10", text: "text-red-400" },
    PARTIALLY_COMPLIANT: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
    NOT_ASSESSED: { bg: "bg-gray-500/10", text: "text-gray-400" },
    NOT_APPLICABLE: { bg: "bg-gray-500/10", text: "text-gray-400" },
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
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Assess Control: ${control?.controlId}`}
            maxWidth="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {/* Basic Info (Read Only or Editable?) - Let's keep it editable for convenience */}
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Title
                        </label>
                        <input
                            type="text"
                            required
                            className="input w-full"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    {/* Assessment Status */}
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
                                            ? "bg-blue-500/10 text-blue-400 border-blue-500/50 ring-1 ring-blue-500/50"
                                            : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-secondary)]"
                                    )}
                                >
                                    {status.replace(/_/g, " ")}
                                    {formData.implementationStatus === status && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                                </button>
                            ))}
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
