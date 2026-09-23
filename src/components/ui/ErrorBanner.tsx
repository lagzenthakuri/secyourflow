"use client";

import { AlertCircle, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorBannerProps {
    message?: string | null;
    /** Offer a retry when the caller can re-run the failed request. */
    onRetry?: () => void;
    onDismiss?: () => void;
    className?: string;
}

/**
 * Surfaces a failed request to the user.
 *
 * Several pages captured an error into state and then never rendered it, so a
 * failed fetch showed an empty screen with no explanation.
 */
export function ErrorBanner({ message, onRetry, onDismiss, className }: ErrorBannerProps) {
    if (!message) {
        return null;
    }

    return (
        <div
            role="alert"
            className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200",
                className,
            )}
        >
            <div className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{message}</span>
            </div>
            <div className="flex items-center gap-2">
                {onRetry ? (
                    <button
                        type="button"
                        onClick={onRetry}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/40 px-2.5 py-1 text-xs font-medium transition hover:bg-red-500/15"
                    >
                        <RefreshCw size={12} />
                        Retry
                    </button>
                ) : null}
                {onDismiss ? (
                    <button
                        type="button"
                        onClick={onDismiss}
                        aria-label="Dismiss"
                        className="rounded-lg p-1 transition hover:bg-red-500/15"
                    >
                        <X size={14} />
                    </button>
                ) : null}
            </div>
        </div>
    );
}
