"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
    closeButtonLabel?: string;
    initialFocusSelector?: string;
    ariaDescribedBy?: string;
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
    const titleId = useId();

    const FOCUSABLE_SELECTOR =
        'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onClose();
                return;
            }

            if (e.key !== "Tab") {
                return;
            }

            const dialog = modalRef.current;
            if (!dialog) {
                return;
            }

            const focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
            if (focusableElements.length === 0) {
                e.preventDefault();
                dialog.focus();
                return;
            }

            const first = focusableElements[0];
            const last = focusableElements[focusableElements.length - 1];
            const active = document.activeElement as HTMLElement | null;

            if (e.shiftKey) {
                if (!active || active === first || !dialog.contains(active)) {
                    e.preventDefault();
                    last.focus();
                }
                return;
            }

            if (!active || active === last || !dialog.contains(active)) {
                e.preventDefault();
                first.focus();
            }
        };

        if (isOpen) {
            previousActiveElementRef.current = document.activeElement as HTMLElement | null;
            document.body.style.overflow = "hidden";
            window.addEventListener("keydown", handleKeyDown);

            window.requestAnimationFrame(() => {
                const dialog = modalRef.current;
                if (!dialog) {
                    return;
                }

                const preferredTarget =
                    (initialFocusSelector ? dialog.querySelector<HTMLElement>(initialFocusSelector) : null) ||
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
    }, [FOCUSABLE_SELECTOR, initialFocusSelector, isOpen, onClose]);

    if (!isOpen) return null;

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
                className="absolute inset-0 bg-[var(--overlay-scrim)] backdrop-blur-sm"
                onClick={onClose}
            />
            <div
                ref={modalRef}
                className={cn(
                    "relative w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-in fade-in zoom-in duration-200",
                    maxWidthClasses[maxWidth]
                )}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={ariaDescribedBy}
                tabIndex={-1}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
                    <h2 id={titleId} className="text-xl font-semibold text-[var(--text-primary)]">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-all duration-300 ease-in-out"
                        aria-label={closeButtonLabel}
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">{children}</div>
                {footer && (
                    <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)]/50">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
