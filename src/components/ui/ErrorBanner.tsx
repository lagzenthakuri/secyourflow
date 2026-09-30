"use client";

import { AlertCircle, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorBannerProps {
  className?: string;
  message?: string | null;
  onDismiss?: () => void;
  /** Offer a retry when the caller can re-run the failed request. */
  onRetry?: () => void;
}

/**
 * Surfaces a failed request to the user.
 *
 * Several pages captured an error into state and then never rendered it, so a
 * failed fetch showed an empty screen with no explanation.
 */
export function ErrorBanner({
  message,
  onRetry,
  onDismiss,
  className,
}: ErrorBannerProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-red-700 text-sm dark:text-red-200",
        className
      )}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="shrink-0" size={16} />
        <span>{message}</span>
      </div>
      <div className="flex items-center gap-2">
        {onRetry ? (
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/40 px-2.5 py-1 font-medium text-xs transition hover:bg-red-500/15"
            onClick={onRetry}
            type="button"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        ) : null}
        {onDismiss ? (
          <button
            aria-label="Dismiss"
            className="rounded-lg p-1 transition hover:bg-red-500/15"
            onClick={onDismiss}
            type="button"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
