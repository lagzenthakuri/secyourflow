"use client";
import { Input as BoilerplateInput } from "@repo/design-system/components/ui/input";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

interface PromptDialogProps {
  cancelLabel: string;
  confirmLabel: string;
  isOpen: boolean;
  message: string;
  onCancel: () => void;
  onSubmit: (value: string) => void;
  placeholder: string;
  title: string;
  validate?: (value: string) => string | null;
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
      ariaDescribedBy="prompt-dialog-description"
      closeButtonLabel="Close input dialog"
      footer={
        <div className="flex justify-end gap-2">
          <button
            className="btn btn-secondary px-3 py-1.5 text-sm"
            onClick={handleCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className="btn btn-primary px-3 py-1.5 text-sm"
            onClick={handleSubmit}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      }
      initialFocusSelector='[data-dialog-input="prompt"]'
      isOpen={isOpen}
      maxWidth="sm"
      onClose={handleCancel}
      title={title}
    >
      <div className="space-y-3">
        <p
          className="text-[var(--text-secondary)] text-sm"
          id="prompt-dialog-description"
        >
          {message}
        </p>
        <BoilerplateInput
          className=""
          data-dialog-input="prompt"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          type="text"
          value={value}
        />
        {error ? (
          <p className="text-red-600 text-xs dark:text-red-300">{error}</p>
        ) : null}
      </div>
    </Modal>
  );
}
