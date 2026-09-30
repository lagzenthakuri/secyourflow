"use client";
import type {
  AssetStatus,
  AssetType,
  CloudProvider,
  Criticality,
  Environment,
} from "@repo/database";
import { FieldError } from "@repo/design-system/components/ui/field";
import { Input as BoilerplateInput } from "@repo/design-system/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ASSET_TYPES: AssetType[] = [
  "SERVER",
  "WORKSTATION",
  "NETWORK_DEVICE",
  "CLOUD_INSTANCE",
  "CONTAINER",
  "DATABASE",
  "APPLICATION",
  "API",
  "DOMAIN",
  "CERTIFICATE",
  "IOT_DEVICE",
  "MOBILE_DEVICE",
  "OTHER",
];

const ENVIRONMENTS: Environment[] = [
  "PRODUCTION",
  "STAGING",
  "DEVELOPMENT",
  "TESTING",
  "DR",
];
const CRITICALITIES: Criticality[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFORMATIONAL",
];
const STATUSES: AssetStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "DECOMMISSIONED",
  "MAINTENANCE",
];
const CLOUD_PROVIDERS: CloudProvider[] = [
  "AWS",
  "AZURE",
  "GCP",
  "ORACLE",
  "IBM",
  "ALIBABA",
  "OTHER",
];

export function AddAssetModal({
  isOpen,
  onClose,
  onSuccess,
}: AddAssetModalProps) {
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
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t !== ""),
        cloudProvider:
          formData.cloudProvider === "" ? undefined : formData.cloudProvider,
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
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      maxWidth="lg"
      onClose={onClose}
      title="Add New Asset"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-intent-danger text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Asset Name *
            </label>
            <BoilerplateInput
              aria-describedby={nameError ? "asset-name-error" : undefined}
              aria-invalid={Boolean(nameError) || undefined}
              className="w-full"
              name="assetName"
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (e.target.value.trim()) {
                  setNameError(null);
                }
              }}
              placeholder="e.g., Production Web Server 01"
              required
              type="text"
              value={formData.name}
            />
            {nameError ? (
              <FieldError
                className="mt-1 font-medium text-sm dark:text-destructive-foreground"
                id="asset-name-error"
              >
                {nameError}
              </FieldError>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Type *
            </label>
            <Select
              onValueChange={(e) =>
                setFormData({ ...formData, type: e as AssetType })
              }
              value={formData.type}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
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
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Environment *
            </label>
            <Select
              onValueChange={(e) =>
                setFormData({ ...formData, environment: e as Environment })
              }
              value={formData.environment}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
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
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Criticality *
            </label>
            <Select
              onValueChange={(e) =>
                setFormData({ ...formData, criticality: e as Criticality })
              }
              value={formData.criticality}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
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
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Status *
            </label>
            <Select
              onValueChange={(e) =>
                setFormData({ ...formData, status: e as AssetStatus })
              }
              value={formData.status}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
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
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              IP Address
            </label>
            <BoilerplateInput
              className="w-full"
              onChange={(e) =>
                setFormData({ ...formData, ipAddress: e.target.value })
              }
              placeholder="e.g., 192.168.1.10"
              type="text"
              value={formData.ipAddress}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Hostname
            </label>
            <BoilerplateInput
              className="w-full"
              onChange={(e) =>
                setFormData({ ...formData, hostname: e.target.value })
              }
              placeholder="e.g., web-prod-01"
              type="text"
              value={formData.hostname}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Operating System
            </label>
            <BoilerplateInput
              className="w-full"
              onChange={(e) =>
                setFormData({ ...formData, operatingSystem: e.target.value })
              }
              placeholder="e.g., Ubuntu 22.04 LTS"
              type="text"
              value={formData.operatingSystem}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Cloud Provider
            </label>
            <Select
              onValueChange={(e) =>
                setFormData({
                  ...formData,
                  cloudProvider: (e === "__select_none__"
                    ? ""
                    : e) as CloudProvider,
                })
              }
              value={formData.cloudProvider || "__select_none__"}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="__select_none__">
                    None / On-Premise
                  </SelectItem>
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
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Owner
            </label>
            <BoilerplateInput
              className="w-full"
              onChange={(e) =>
                setFormData({ ...formData, owner: e.target.value })
              }
              placeholder="e.g., IT Security Team"
              type="text"
              value={formData.owner}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Department
            </label>
            <BoilerplateInput
              className="w-full"
              onChange={(e) =>
                setFormData({ ...formData, department: e.target.value })
              }
              placeholder="e.g., Operations"
              type="text"
              value={formData.department}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Country / Location
            </label>
            <BoilerplateInput
              className="w-full"
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="e.g., USA / East Data Center"
              type="text"
              value={formData.location}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Cloud Region
            </label>
            <BoilerplateInput
              className="w-full"
              onChange={(e) =>
                setFormData({ ...formData, cloudRegion: e.target.value })
              }
              placeholder="e.g., us-east-1"
              type="text"
              value={formData.cloudRegion}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Tags (comma separated)
            </label>
            <BoilerplateInput
              className="w-full"
              onChange={(e) =>
                setFormData({ ...formData, tags: e.target.value })
              }
              placeholder="e.g., production, external, web"
              type="text"
              value={formData.tags}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
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
