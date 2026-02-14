"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import {
    AssetType,
    Environment,
    Criticality,
    AssetStatus,
    CloudProvider
} from "@prisma/client";
import { Loader2, AlertCircle } from "lucide-react";

interface AddAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ASSET_TYPES: AssetType[] = [
    "SERVER", "WORKSTATION", "NETWORK_DEVICE", "CLOUD_INSTANCE",
    "CONTAINER", "DATABASE", "APPLICATION", "API", "DOMAIN",
    "CERTIFICATE", "IOT_DEVICE", "MOBILE_DEVICE", "OTHER"
];

const ENVIRONMENTS: Environment[] = ["PRODUCTION", "STAGING", "DEVELOPMENT", "TESTING", "DR"];
const CRITICALITIES: Criticality[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"];
const STATUSES: AssetStatus[] = ["ACTIVE", "INACTIVE", "DECOMMISSIONED", "MAINTENANCE"];
const CLOUD_PROVIDERS: CloudProvider[] = ["AWS", "AZURE", "GCP", "ORACLE", "IBM", "ALIBABA", "OTHER"];

export function AddAssetModal({ isOpen, onClose, onSuccess }: AddAssetModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        type: "SERVER" as AssetType,
        hostname: "",
        ipAddress: "",
        operatingSystem: "",
        environment: "PRODUCTION" as Environment,
        criticality: "MEDIUM" as Criticality,
        status: "ACTIVE" as AssetStatus,
        owner: "",
        department: "",
        location: "",
        cloudProvider: "" as CloudProvider | "",
        cloudRegion: "",
        tags: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const dataToSubmit = {
                ...formData,
                tags: formData.tags.split(",").map(t => t.trim()).filter(t => t !== ""),
                cloudProvider: formData.cloudProvider === "" ? undefined : formData.cloudProvider,
            };

            const response = await fetch("/api/assets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dataToSubmit),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to create asset");
            }

            onSuccess();
            onClose();
            setFormData({
                name: "",
                type: "SERVER",
                hostname: "",
                ipAddress: "",
                operatingSystem: "",
                environment: "PRODUCTION",
                criticality: "MEDIUM",
                status: "ACTIVE",
                owner: "",
                department: "",
                location: "",
                cloudProvider: "",
                cloudRegion: "",
                tags: "",
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
            title="Add New Asset"
            maxWidth="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Asset Name *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g., Production Web Server 01"
                            className="input w-full"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Type *
                        </label>
                        <select
                            className="input w-full"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as AssetType })}
                        >
                            {ASSET_TYPES.map((t) => (
                                <option key={t} value={t}>
                                    {t.replace(/_/g, " ")}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Environment *
                        </label>
                        <select
                            className="input w-full"
                            value={formData.environment}
                            onChange={(e) => setFormData({ ...formData, environment: e.target.value as Environment })}
                        >
                            {ENVIRONMENTS.map((e) => (
                                <option key={e} value={e}>
                                    {e}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Criticality *
                        </label>
                        <select
                            className="input w-full"
                            value={formData.criticality}
                            onChange={(e) => setFormData({ ...formData, criticality: e.target.value as Criticality })}
                        >
                            {CRITICALITIES.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Status *
                        </label>
                        <select
                            className="input w-full"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as AssetStatus })}
                        >
                            {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            IP Address
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., 192.168.1.10"
                            className="input w-full"
                            value={formData.ipAddress}
                            onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Hostname
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., web-prod-01"
                            className="input w-full"
                            value={formData.hostname}
                            onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Operating System
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., Ubuntu 22.04 LTS"
                            className="input w-full"
                            value={formData.operatingSystem}
                            onChange={(e) => setFormData({ ...formData, operatingSystem: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Cloud Provider
                        </label>
                        <select
                            className="input w-full"
                            value={formData.cloudProvider}
                            onChange={(e) => setFormData({ ...formData, cloudProvider: e.target.value as CloudProvider })}
                        >
                            <option value="">None / On-Premise</option>
                            {CLOUD_PROVIDERS.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Owner
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., IT Security Team"
                            className="input w-full"
                            value={formData.owner}
                            onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Department
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., Operations"
                            className="input w-full"
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Country / Location
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., USA / East Data Center"
                            className="input w-full"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Cloud Region
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., us-east-1"
                            className="input w-full"
                            value={formData.cloudRegion}
                            onChange={(e) => setFormData({ ...formData, cloudRegion: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Tags (comma separated)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., production, external, web"
                            className="input w-full"
                            value={formData.tags}
                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
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
                                Creating...
                            </>
                        ) : (
                            "Create Asset"
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
