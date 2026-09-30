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
import {
  AlertCircle,
  FileClock,
  FileUp,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";

interface EvidenceVersion {
  checksum?: string | null;
  createdAt: string;
  fileName: string;
  id: string;
  mimeType: string;
  notes?: string | null;
  sizeBytes: number;
  storagePath: string;
  version: number;
}

interface EvidenceRecord {
  assetId?: string | null;
  currentVersion: number;
  description?: string | null;
  id: string;
  title: string;
  updatedAt: string;
  versions: EvidenceVersion[];
}

interface EvidenceUploadModalProps {
  controlId: string;
  controlLabel: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EvidenceUploadModal({
  isOpen,
  onClose,
  onSuccess,
  controlId,
  controlLabel,
}: EvidenceUploadModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);

  const [mode, setMode] = useState<"new" | "version">("new");
  const [selectedEvidenceId, setSelectedEvidenceId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assetId, setAssetId] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const canSubmit = useMemo(() => {
    if (!file) {
      return false;
    }
    if (mode === "version") {
      return selectedEvidenceId.length > 0;
    }
    return title.trim().length > 0;
  }, [file, mode, selectedEvidenceId, title]);

  const fetchEvidence = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/compliance/controls/${controlId}/evidence`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Failed to fetch evidence");
      }

      const payload = (await response.json()) as { data?: EvidenceRecord[] };
      const records = Array.isArray(payload.data) ? payload.data : [];
      setEvidence(records);

      if (mode === "version" && records.length > 0 && !selectedEvidenceId) {
        setSelectedEvidenceId(records[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch evidence");
    } finally {
      setIsLoading(false);
    }
  }, [controlId, mode, selectedEvidenceId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    void fetchEvidence();
  }, [fetchEvidence, isOpen]);

  const resetForm = useCallback(() => {
    setMode("new");
    setSelectedEvidenceId("");
    setTitle("");
    setDescription("");
    setAssetId("");
    setNotes("");
    setFile(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    setError(null);
    onClose();
  }, [onClose, resetForm]);

  const submitEvidence = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!file) {
      setError("Select a file before uploading evidence.");
      return;
    }

    if (mode === "version" && !selectedEvidenceId) {
      setError("Select an existing evidence record for version upload.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const formData = new FormData();
      formData.set("file", file);

      if (mode === "new" || title.trim()) {
        formData.set("title", title.trim() || file.name);
      }
      if (description.trim()) {
        formData.set("description", description.trim());
      }
      if (notes.trim()) {
        formData.set("notes", notes.trim());
      }

      if (assetId.trim()) {
        formData.set("assetId", assetId.trim());
      }
      if (mode === "version") {
        formData.set("evidenceId", selectedEvidenceId);
      }

      const response = await fetch(
        `/api/compliance/controls/${controlId}/evidence`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Evidence upload failed");
      }

      await fetchEvidence();
      resetForm();
      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to upload evidence"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      maxWidth="2xl"
      onClose={handleClose}
      title={`Evidence Manager: ${controlLabel}`}
    >
      <div className="space-y-5">
        {error ? (
          <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-red-600 text-sm dark:text-red-300">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          </div>
        ) : null}

        <form
          className="space-y-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4"
          onSubmit={submitEvidence}
        >
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              className={`rounded-md border px-3 py-1.5 ${
                mode === "new"
                  ? "border-sky-300/35 bg-sky-300/10 text-sky-700 dark:text-sky-100"
                  : "border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
              }`}
              onClick={() => setMode("new")}
              type="button"
            >
              New Evidence
            </button>
            <button
              className={`rounded-md border px-3 py-1.5 ${
                mode === "version"
                  ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-700 dark:text-emerald-100"
                  : "border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
              }`}
              onClick={() => {
                setMode("version");
                if (!selectedEvidenceId && evidence.length > 0) {
                  setSelectedEvidenceId(evidence[0].id);
                }
              }}
              type="button"
            >
              New Version
            </button>
          </div>

          {mode === "version" ? (
            <div>
              <label className="mb-1 block text-[var(--text-secondary)] text-sm">
                Evidence Record
              </label>
              <Select
                onValueChange={(event) =>
                  setSelectedEvidenceId(
                    event === "__select_none__" ? "" : event
                  )
                }
                value={selectedEvidenceId || "__select_none__"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="__select_none__">
                      Select evidence...
                    </SelectItem>
                    {evidence.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.title} (v{item.currentVersion})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[var(--text-secondary)] text-sm">
                Title
              </label>
              <BoilerplateInput
                className="w-full"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Evidence title"
                value={title}
              />
            </div>
            <div>
              <label className="mb-1 block text-[var(--text-secondary)] text-sm">
                Asset ID (optional)
              </label>
              <BoilerplateInput
                className="w-full"
                onChange={(event) => setAssetId(event.target.value)}
                placeholder="Asset ID"
                value={assetId}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[var(--text-secondary)] text-sm">
              Description
            </label>
            <BoilerplateTextarea
              className="min-h-[70px] w-full"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe what this evidence proves"
              value={description}
            />
          </div>

          <div>
            <label className="mb-1 block text-[var(--text-secondary)] text-sm">
              Version Notes
            </label>
            <BoilerplateTextarea
              className="min-h-[60px] w-full"
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What changed in this evidence version"
              value={notes}
            />
          </div>

          <div>
            <label className="mb-1 block text-[var(--text-secondary)] text-sm">
              File
            </label>
            <BoilerplateInput
              accept=".pdf,.png,.jpg,.jpeg,.txt,.log,.csv,.json"
              className="w-full"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              type="file"
            />
            <p className="mt-1 text-[var(--text-muted)] text-xs">
              Supported: PDF, images, txt/log/csv/json. Max file size: 15 MB.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              className="btn btn-secondary"
              disabled={isSubmitting}
              onClick={handleClose}
              type="button"
            >
              Close
            </button>
            <button
              className="btn btn-primary"
              disabled={isSubmitting || !canSubmit}
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Uploading...
                </>
              ) : (
                <>
                  <FileUp size={16} />
                  Upload Evidence
                </>
              )}
            </button>
          </div>
        </form>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-[var(--text-primary)] text-sm">
              Evidence History
            </h4>
            <button
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border-hover)] bg-[var(--bg-tertiary)] px-2 py-1 text-[var(--text-secondary)] text-xs"
              disabled={isLoading}
              onClick={() => void fetchEvidence()}
              type="button"
            >
              <RefreshCw
                className={isLoading ? "animate-spin" : ""}
                size={12}
              />
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4 text-[var(--text-muted)] text-sm">
              Loading evidence...
            </div>
          ) : evidence.length === 0 ? (
            <div className="rounded-lg border border-[var(--border-hover)] border-dashed bg-[var(--bg-tertiary)] p-4 text-[var(--text-muted)] text-sm">
              No evidence uploaded yet.
            </div>
          ) : (
            <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
              {evidence.map((item) => (
                <article
                  className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-3"
                  key={item.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[var(--text-primary)] text-sm">
                        {item.title}
                      </p>
                      <p className="text-[var(--text-muted)] text-xs">
                        Current version: v{item.currentVersion} • Updated{" "}
                        {new Date(item.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-200">
                      <FileClock size={11} />
                      {item.versions.length} version(s)
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 text-xs">
                    {item.versions.map((version) => (
                      <div
                        className="flex items-center justify-between gap-2 rounded bg-[var(--code-block-bg)] px-2 py-1"
                        key={version.id}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[var(--text-secondary)]">
                            v{version.version} • {version.fileName}
                          </p>
                          <p className="text-[var(--text-muted)]">
                            {new Date(version.createdAt).toLocaleString()} •{" "}
                            {formatBytes(version.sizeBytes)}
                          </p>
                        </div>
                        <a
                          className="rounded border border-[var(--border-hover)] bg-[var(--bg-tertiary)] px-2 py-1 text-[11px] text-[var(--text-secondary)]"
                          href={version.storagePath}
                          rel="noreferrer"
                          target="_blank"
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}
