"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Loader2, AlertCircle } from "lucide-react";

interface AddControlModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    frameworkId: string;
}

export function AddControlModal({ isOpen, onClose, onSuccess, frameworkId }: AddControlModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        controlId: "",
        title: "",
        description: "",
        category: "",
        objective: "",
        nistCsfFunction: "GOVERN",
        controlType: "PREVENTIVE",
        frequency: "ANNUAL",
        ownerRole: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch("/api/compliance/controls", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    frameworkId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to create control");
            }

            onSuccess();
            onClose();
            setFormData({
                controlId: "",
                title: "",
                description: "",
                category: "",
                objective: "",
                nistCsfFunction: "GOVERN",
                controlType: "PREVENTIVE",
                frequency: "ANNUAL",
                ownerRole: "",
            });
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
            title="Add New Control"
            maxWidth="md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Control ID *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g., A.12.6.1"
                            className="input w-full"
                            value={formData.controlId}
                            onChange={(e) => setFormData({ ...formData, controlId: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Category
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., Asset Management"
                            className="input w-full"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Title *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g., Management of technical vulnerabilities"
                            className="input w-full"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Description
                        </label>
                        <textarea
                            className="input w-full min-h-[80px]"
                            placeholder="Detailed description of the control..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Objective
                        </label>
                        <textarea
                            className="input w-full min-h-[80px]"
                            placeholder="What this control aims to achieve..."
                            value={formData.objective}
                            onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            NIST CSF Function
                        </label>
                        <select
                            className="input w-full"
                            value={formData.nistCsfFunction}
                            onChange={(e) => setFormData({ ...formData, nistCsfFunction: e.target.value })}
                        >
                            <option value="GOVERN">GOVERN</option>
                            <option value="IDENTIFY">IDENTIFY</option>
                            <option value="PROTECT">PROTECT</option>
                            <option value="DETECT">DETECT</option>
                            <option value="RESPOND">RESPOND</option>
                            <option value="RECOVER">RECOVER</option>
                        </select>
                    </div>

                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Control Type
                        </label>
                        <select
                            className="input w-full"
                            value={formData.controlType}
                            onChange={(e) => setFormData({ ...formData, controlType: e.target.value })}
                        >
                            <option value="PREVENTIVE">PREVENTIVE</option>
                            <option value="DETECTIVE">DETECTIVE</option>
                            <option value="CORRECTIVE">CORRECTIVE</option>
                        </select>
                    </div>

                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Frequency
                        </label>
                        <select
                            className="input w-full"
                            value={formData.frequency}
                            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                        >
                            <option value="ANNUAL">ANNUAL</option>
                            <option value="SEMI_ANNUAL">SEMI-ANNUAL</option>
                            <option value="QUARTERLY">QUARTERLY</option>
                            <option value="MONTHLY">MONTHLY</option>
                            <option value="WEEKLY">WEEKLY</option>
                            <option value="DAILY">DAILY</option>
                            <option value="CONTINUOUS">CONTINUOUS</option>
                        </select>
                    </div>

                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Owner Role
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., CISO"
                            className="input w-full"
                            value={formData.ownerRole}
                            onChange={(e) => setFormData({ ...formData, ownerRole: e.target.value })}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
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
                                Adding...
                            </>
                        ) : (
                            "Add Control"
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
