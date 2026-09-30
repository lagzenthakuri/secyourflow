"use client";
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
import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

interface AddControlModalProps {
  frameworkId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddControlModal({
  isOpen,
  onClose,
  onSuccess,
  frameworkId,
}: AddControlModalProps) {
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
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      maxWidth="md"
      onClose={onClose}
      title="Add New Control"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-intent-danger text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Control ID *
            </label>
            <BoilerplateInput
              className="w-full"
              onChange={(e) =>
                setFormData({ ...formData, controlId: e.target.value })
              }
              placeholder="e.g., A.12.6.1"
              required
              type="text"
              value={formData.controlId}
            />
          </div>

          <div>
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Category
            </label>
            <BoilerplateInput
              className="w-full"
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              placeholder="e.g., Asset Management"
              type="text"
              value={formData.category}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Title *
            </label>
            <BoilerplateInput
              className="w-full"
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="e.g., Management of technical vulnerabilities"
              required
              type="text"
              value={formData.title}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Description
            </label>
            <BoilerplateTextarea
              className="min-h-[80px] w-full"
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Detailed description of the control..."
              value={formData.description}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Objective
            </label>
            <BoilerplateTextarea
              className="min-h-[80px] w-full"
              onChange={(e) =>
                setFormData({ ...formData, objective: e.target.value })
              }
              placeholder="What this control aims to achieve..."
              value={formData.objective}
            />
          </div>

          <div className="md:col-span-1">
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              NIST CSF Function
            </label>
            <Select
              onValueChange={(e) =>
                setFormData({ ...formData, nistCsfFunction: e })
              }
              value={formData.nistCsfFunction}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="GOVERN">GOVERN</SelectItem>
                  <SelectItem value="IDENTIFY">IDENTIFY</SelectItem>
                  <SelectItem value="PROTECT">PROTECT</SelectItem>
                  <SelectItem value="DETECT">DETECT</SelectItem>
                  <SelectItem value="RESPOND">RESPOND</SelectItem>
                  <SelectItem value="RECOVER">RECOVER</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-1">
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
                  <SelectItem value="PREVENTIVE">PREVENTIVE</SelectItem>
                  <SelectItem value="DETECTIVE">DETECTIVE</SelectItem>
                  <SelectItem value="CORRECTIVE">CORRECTIVE</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-1">
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Frequency
            </label>
            <Select
              onValueChange={(e) => setFormData({ ...formData, frequency: e })}
              value={formData.frequency}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="ANNUAL">ANNUAL</SelectItem>
                  <SelectItem value="SEMI_ANNUAL">SEMI-ANNUAL</SelectItem>
                  <SelectItem value="QUARTERLY">QUARTERLY</SelectItem>
                  <SelectItem value="MONTHLY">MONTHLY</SelectItem>
                  <SelectItem value="WEEKLY">WEEKLY</SelectItem>
                  <SelectItem value="DAILY">DAILY</SelectItem>
                  <SelectItem value="CONTINUOUS">CONTINUOUS</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-1">
            <label className="mb-1 block font-medium text-[var(--text-secondary)] text-sm">
              Owner Role
            </label>
            <BoilerplateInput
              className="w-full"
              onChange={(e) =>
                setFormData({ ...formData, ownerRole: e.target.value })
              }
              placeholder="e.g., CISO"
              type="text"
              value={formData.ownerRole}
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
