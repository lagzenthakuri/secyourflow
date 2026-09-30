"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  ariaDescribedBy?: string;
  children: React.ReactNode;
  closeButtonLabel?: string;
  footer?: React.ReactNode;
  initialFocusSelector?: string;
  isOpen: boolean;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  onClose: () => void;
  title: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "md",
  closeButtonLabel = "Close dialog",
  initialFocusSelector,
  ariaDescribedBy,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key !== "Tab") {
        return;
      }

      const dialog = modalRef.current;
      if (!dialog) {
        return;
      }

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusableElements.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements.at(-1);
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (!active || active === first || !dialog.contains(active)) {
          e.preventDefault();
          last?.focus();
        }
        return;
      }

      if (!active || active === last || !dialog.contains(active)) {
        e.preventDefault();
        first?.focus();
      }
    };

    if (isOpen) {
      previousActiveElementRef.current =
        document.activeElement as HTMLElement | null;
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);

      window.requestAnimationFrame(() => {
        const dialog = modalRef.current;
        if (!dialog) {
          return;
        }

        const preferredTarget =
          (initialFocusSelector
            ? dialog.querySelector<HTMLElement>(initialFocusSelector)
            : null) ||
          dialog.querySelector<HTMLElement>(
            'input:not([disabled]), textarea:not([disabled]), [contenteditable="true"]'
          ) ||
          dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ||
          dialog;

        preferredTarget.focus();
      });
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);

      const previous = previousActiveElementRef.current;
      if (previous && typeof previous.focus === "function") {
        previous.focus();
      }
    };
  }, [initialFocusSelector, isOpen]);

  if (!isOpen) {
    return null;
  }

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-[var(--overlay-scrim)] backdrop-blur-md"
        onClick={onClose}
      />
      <div
        aria-describedby={ariaDescribedBy}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn(
          "fade-in zoom-in relative flex max-h-full w-full animate-in flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl duration-200",
          maxWidthClasses[maxWidth]
        )}
        ref={modalRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between border-[var(--border-color)] border-b px-6 py-4">
          <h2
            className="font-semibold text-[var(--text-primary)] text-xl"
            id={titleId}
          >
            {title}
          </h2>
          <button
            aria-label={closeButtonLabel}
            className="rounded-lg p-1 text-[var(--text-muted)] transition-all duration-300 ease-in-out hover:bg-[var(--bg-tertiary)]"
            onClick={() => onCloseRef.current()}
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <div className="border-[var(--border-color)] border-t bg-[var(--bg-tertiary)]/50 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
