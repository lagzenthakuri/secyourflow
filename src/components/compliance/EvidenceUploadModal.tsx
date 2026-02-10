"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { AlertCircle, FileClock, FileUp, Loader2, RefreshCw } from "lucide-react";

interface EvidenceVersion {
  id: string;
  version: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  checksum?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface EvidenceRecord {
  id: string;
  title: string;
  description?: string | null;
  assetId?: string | null;
  currentVersion: number;
  updatedAt: string;
  versions: EvidenceVersion[];
}

interface EvidenceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  controlId: string;
  controlLabel: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
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
    if (!file) return false;
    if (mode === "version") return selectedEvidenceId.length > 0;
    return title.trim().length > 0;
  }, [file, mode, selectedEvidenceId, title]);

  const fetchEvidence = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/compliance/controls/${controlId}/evidence`, {
        cache: "no-store",
      });

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
    if (!isOpen) return;
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

      const response = await fetch(`/api/compliance/controls/${controlId}/evidence`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Evidence upload failed");
      }

      await fetchEvidence();
      resetForm();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload evidence");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Evidence Manager: ${controlLabel}`}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {error ? (
          <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-300">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          </div>
        ) : null}

        <form onSubmit={submitEvidence} className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`rounded-md border px-3 py-1.5 ${
                mode === "new"
                  ? "border-sky-300/35 bg-sky-300/10 text-sky-100"
                  : "border-white/10 bg-white/[0.02] text-slate-300"
              }`}
            >
              New Evidence
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("version");
                if (!selectedEvidenceId && evidence.length > 0) {
                  setSelectedEvidenceId(evidence[0].id);
                }
              }}
              className={`rounded-md border px-3 py-1.5 ${
                mode === "version"
                  ? "border-emerald-300/35 bg-emerald-300/10 text-emerald-100"
                  : "border-white/10 bg-white/[0.02] text-slate-300"
              }`}
            >
              New Version
            </button>
          </div>

          {mode === "version" ? (
            <div>
              <label className="mb-1 block text-sm text-slate-300">Evidence Record</label>
              <select
                className="input w-full"
                value={selectedEvidenceId}
                onChange={(event) => setSelectedEvidenceId(event.target.value)}
              >
                <option value="">Select evidence...</option>
                {evidence.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} (v{item.currentVersion})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-300">Title</label>
              <input
                className="input w-full"
                placeholder="Evidence title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300">Asset ID (optional)</label>
              <input
                className="input w-full"
                placeholder="Asset ID"
                value={assetId}
                onChange={(event) => setAssetId(event.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Description</label>
            <textarea
              className="input w-full min-h-[70px]"
              placeholder="Describe what this evidence proves"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Version Notes</label>
            <textarea
              className="input w-full min-h-[60px]"
              placeholder="What changed in this evidence version"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">File</label>
            <input
              type="file"
              className="input w-full"
              accept=".pdf,.png,.jpg,.jpeg,.txt,.log,.csv,.json"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
            <p className="mt-1 text-xs text-slate-500">
              Supported: PDF, images, txt/log/csv/json. Max file size: 15 MB.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={handleClose} className="btn btn-secondary" disabled={isSubmitting}>
              Close
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || !canSubmit}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
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
            <h4 className="text-sm font-semibold text-white">Evidence History</h4>
            <button
              type="button"
              onClick={() => void fetchEvidence()}
              className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/[0.03] px-2 py-1 text-xs text-slate-200"
              disabled={isLoading}
            >
              <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">
              Loading evidence...
            </div>
          ) : evidence.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-4 text-sm text-slate-400">
              No evidence uploaded yet.
            </div>
          ) : (
            <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
              {evidence.map((item) => (
                <article key={item.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-slate-400">
                        Current version: v{item.currentVersion} • Updated {new Date(item.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-300/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] text-emerald-200">
                      <FileClock size={11} />
                      {item.versions.length} version(s)
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 text-xs">
                    {item.versions.map((version) => (
                      <div key={version.id} className="flex items-center justify-between gap-2 rounded bg-black/20 px-2 py-1">
                        <div className="min-w-0">
                          <p className="truncate text-slate-200">
                            v{version.version} • {version.fileName}
                          </p>
                          <p className="text-slate-500">
                            {new Date(version.createdAt).toLocaleString()} • {formatBytes(version.sizeBytes)}
                          </p>
                        </div>
                        <a
                          href={version.storagePath}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded border border-white/15 bg-white/[0.03] px-2 py-1 text-[11px] text-slate-200"
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
