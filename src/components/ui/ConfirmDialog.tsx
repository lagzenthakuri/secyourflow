"use client";

import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  cancelLabel: string;
  confirmLabel: string;
  intent?: "default" | "danger";
  isOpen: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
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
      ariaDescribedBy="confirm-dialog-description"
      closeButtonLabel="Close confirmation dialog"
      footer={
        <div className="flex justify-end gap-2">
          <button
            className="btn btn-secondary px-3 py-1.5 text-sm"
            data-dialog-action="cancel"
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={cn(
              "inline-flex items-center justify-center rounded-lg border px-3 py-1.5 font-medium text-sm transition",
              intent === "danger"
                ? "border-red-400/45 bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:text-red-200"
                : "border-sky-400/40 bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 dark:text-sky-200"
            )}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      }
      initialFocusSelector='[data-dialog-action="cancel"]'
      isOpen={isOpen}
      maxWidth="sm"
      onClose={onCancel}
      title={title}
    >
      <p
        className="text-[var(--text-secondary)] text-sm"
        id="confirm-dialog-description"
      >
        {message}
      </p>
    </Modal>
  );
}
