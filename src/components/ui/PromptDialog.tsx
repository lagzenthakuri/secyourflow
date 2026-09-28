"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

interface PromptDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  placeholder: string;
  confirmLabel: string;
  cancelLabel: string;
  validate?: (value: string) => string | null;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({
  isOpen,
  title,
  message,
  placeholder,
  confirmLabel,
  cancelLabel,
  validate,
  onSubmit,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    const validationError = validate ? validate(trimmed) : null;

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setValue("");
    onSubmit(trimmed);
  };

  const handleCancel = () => {
    setValue("");
    setError(null);
    onCancel();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={title}
      maxWidth="sm"
      closeButtonLabel="Close input dialog"
      ariaDescribedBy="prompt-dialog-description"
      initialFocusSelector='[data-dialog-input="prompt"]'
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={handleCancel} className="btn btn-secondary px-3 py-1.5 text-sm">
            {cancelLabel}
          </button>
          <button type="button" onClick={handleSubmit} className="btn btn-primary px-3 py-1.5 text-sm">
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <p id="prompt-dialog-description" className="text-sm text-[var(--text-secondary)]">
          {message}
        </p>
        <input
          data-dialog-input="prompt"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          className="input"
        />
        {error ? <p className="text-xs text-red-600 dark:text-red-300">{error}</p> : null}
      </div>
    </Modal>
  );
}
