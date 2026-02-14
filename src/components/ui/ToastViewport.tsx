"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastIntent = "success" | "error" | "warning" | "info";

export interface ToastRecord {
  id: number;
  title: string;
  description?: string;
  intent: ToastIntent;
}

const toneClasses: Record<ToastIntent, string> = {
  success: "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  error: "border-red-400/40 bg-red-500/10 text-red-700 dark:text-red-200",
  warning: "border-yellow-400/45 bg-yellow-500/10 text-yellow-700 dark:text-yellow-200",
  info: "border-sky-400/40 bg-sky-500/10 text-sky-700 dark:text-sky-200",
};

interface ToastViewportProps {
  toasts: ToastRecord[];
  onDismiss: (id: number) => void;
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[110] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={cn(
            "pointer-events-auto rounded-xl border px-4 py-3 shadow-[var(--shadow-md)] backdrop-blur-sm animate-fade-in",
            toneClasses[toast.intent],
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description ? <p className="mt-1 text-xs text-[var(--text-secondary)]">{toast.description}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="rounded-md p-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
