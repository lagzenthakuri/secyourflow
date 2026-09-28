"use client";

import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  intent?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  intent = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      maxWidth="sm"
      closeButtonLabel="Close confirmation dialog"
      ariaDescribedBy="confirm-dialog-description"
      initialFocusSelector='[data-dialog-action="cancel"]'
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            data-dialog-action="cancel"
            onClick={onCancel}
            className="btn btn-secondary px-3 py-1.5 text-sm"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-sm font-medium transition",
              intent === "danger"
                ? "border-red-400/45 bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:text-red-200"
                : "border-sky-400/40 bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 dark:text-sky-200",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p id="confirm-dialog-description" className="text-sm text-[var(--text-secondary)]">
        {message}
      </p>
    </Modal>
  );
}
