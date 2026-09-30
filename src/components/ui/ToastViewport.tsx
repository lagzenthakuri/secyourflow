"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastIntent = "success" | "error" | "warning" | "info";

export interface ToastRecord {
  description?: string;
  id: number;
  intent: ToastIntent;
  title: string;
}

const toneClasses: Record<ToastIntent, string> = {
  success:
    "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  error: "border-red-400/40 bg-red-500/10 text-red-700 dark:text-red-200",
  warning:
    "border-yellow-400/45 bg-yellow-500/10 text-yellow-700 dark:text-yellow-200",
  info: "border-sky-400/40 bg-sky-500/10 text-sky-700 dark:text-sky-200",
};

interface ToastViewportProps {
  onDismiss: (id: number) => void;
  toasts: ToastRecord[];
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[110] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          aria-live="polite"
          className={cn(
            "pointer-events-auto animate-fade-in rounded-xl border px-4 py-3 shadow-[var(--shadow-md)] backdrop-blur-sm",
            toneClasses[toast.intent]
          )}
          key={toast.id}
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-sm">{toast.title}</p>
              {toast.description ? (
                <p className="mt-1 text-[var(--text-secondary)] text-xs">
                  {toast.description}
                </p>
              ) : null}
            </div>
            <button
              aria-label="Dismiss notification"
              className="rounded-md p-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              onClick={() => onDismiss(toast.id)}
              type="button"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
