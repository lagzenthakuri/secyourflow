"use client";
import { Input as BoilerplateInput } from "@repo/design-system/components/ui/input";
import { FieldError } from "@repo/design-system/components/ui/field";



import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@repo/design-system/components/ui/select";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import {
    AssetType,
    Environment,
    Criticality,
    AssetStatus,
    CloudProvider
} from "@repo/database";
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
    const [nameError, setNameError] = useState<string | null>(null);

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
        if (!formData.name.trim()) {
            setNameError("Asset Name is required.");
            setError(null);
            return;
        }
        setNameError(null);
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
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-intent-danger text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Asset Name *
                        </label>
                        <BoilerplateInput
                            type="text"
                            name="assetName"
                            required
                            aria-invalid={Boolean(nameError) || undefined}
                            aria-describedby={nameError ? "asset-name-error" : undefined}
                            placeholder="e.g., Production Web Server 01"
                            className="w-full"
                            value={formData.name}
                            onChange={(e) => {
                                setFormData({ ...formData, name: e.target.value });
                                if (e.target.value.trim()) setNameError(null);
                            }}
                        />
                        {nameError ? <FieldError id="asset-name-error" className="mt-1 text-sm font-medium dark:text-destructive-foreground">{nameError}</FieldError> : null}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Type *
                        </label>
                        <Select value={formData.type} onValueChange={(e) => setFormData({ ...formData, type: e as AssetType })}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                            {ASSET_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>
                                    {t.replace(/_/g, " ")}
                                </SelectItem>
                            ))}

                            </SelectGroup>
                          </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Environment *
                        </label>
                        <Select value={formData.environment} onValueChange={(e) => setFormData({ ...formData, environment: e as Environment })}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                            {ENVIRONMENTS.map((e) => (
                                <SelectItem key={e} value={e}>
                                    {e}
                                </SelectItem>
                            ))}

                            </SelectGroup>
                          </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Criticality *
                        </label>
                        <Select value={formData.criticality} onValueChange={(e) => setFormData({ ...formData, criticality: e as Criticality })}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                            {CRITICALITIES.map((c) => (
                                <SelectItem key={c} value={c}>
                                    {c}
                                </SelectItem>
                            ))}

                            </SelectGroup>
                          </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Status *
                        </label>
                        <Select value={formData.status} onValueChange={(e) => setFormData({ ...formData, status: e as AssetStatus })}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                            {STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                    {s}
                                </SelectItem>
                            ))}

                            </SelectGroup>
                          </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            IP Address
                        </label>
                        <BoilerplateInput
                            type="text"
                            placeholder="e.g., 192.168.1.10"
                            className="w-full"
                            value={formData.ipAddress}
                            onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Hostname
                        </label>
                        <BoilerplateInput
                            type="text"
                            placeholder="e.g., web-prod-01"
                            className="w-full"
                            value={formData.hostname}
                            onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Operating System
                        </label>
                        <BoilerplateInput
                            type="text"
                            placeholder="e.g., Ubuntu 22.04 LTS"
                            className="w-full"
                            value={formData.operatingSystem}
                            onChange={(e) => setFormData({ ...formData, operatingSystem: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Cloud Provider
                        </label>
                        <Select value={formData.cloudProvider || "__select_none__"} onValueChange={(e) => setFormData({ ...formData, cloudProvider: (e === "__select_none__" ? "" : e) as CloudProvider })}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                            <SelectItem value="__select_none__">None / On-Premise</SelectItem>
                            {CLOUD_PROVIDERS.map((p) => (
                                <SelectItem key={p} value={p}>
                                    {p}
                                </SelectItem>
                            ))}

                            </SelectGroup>
                          </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Owner
                        </label>
                        <BoilerplateInput
                            type="text"
                            placeholder="e.g., IT Security Team"
                            className="w-full"
                            value={formData.owner}
                            onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Department
                        </label>
                        <BoilerplateInput
                            type="text"
                            placeholder="e.g., Operations"
                            className="w-full"
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Country / Location
                        </label>
                        <BoilerplateInput
                            type="text"
                            placeholder="e.g., USA / East Data Center"
                            className="w-full"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Cloud Region
                        </label>
                        <BoilerplateInput
                            type="text"
                            placeholder="e.g., us-east-1"
                            className="w-full"
                            value={formData.cloudRegion}
                            onChange={(e) => setFormData({ ...formData, cloudRegion: e.target.value })}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                            Tags (comma separated)
                        </label>
                        <BoilerplateInput
                            type="text"
                            placeholder="e.g., production, external, web"
                            className="w-full"
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
