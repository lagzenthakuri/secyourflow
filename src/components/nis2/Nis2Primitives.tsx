"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const TONE_CLASSES: Record<Tone, string> = {
    neutral: "border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
    success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
    warning: "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-400",
    danger: "border-red-400/30 bg-red-400/10 text-red-600 dark:text-red-400",
    info: "border-sky-400/30 bg-sky-400/10 text-sky-600 dark:text-sky-400",
};

export function Pill({
    tone = "neutral",
    children,
    className,
}: {
    tone?: Tone;
    children: ReactNode;
    className?: string;
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 py-0.5 text-[11px] font-semibold",
                TONE_CLASSES[tone],
                className,
            )}
        >
            {children}
        </span>
    );
}

/** Horizontal progress bar used for coverage and score readouts. */
export function ProgressBar({
    value,
    tone = "info",
    className,
}: {
    /** Percentage 0-100. */
    value: number;
    tone?: Tone;
    className?: string;
}) {
    const barTone: Record<Tone, string> = {
        neutral: "bg-[var(--text-muted)]",
        success: "bg-emerald-500",
        warning: "bg-amber-500",
        danger: "bg-red-500",
        info: "bg-sky-500",
    };

    return (
        <div
            className={cn("h-2 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]", className)}
            role="progressbar"
            aria-valuenow={Math.round(value)}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            <div
                className={cn("h-full rounded-full transition-all duration-500", barTone[tone])}
                style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
            />
        </div>
    );
}

export function toneForCoverage(coverage: number): Tone {
    if (coverage >= 80) return "success";
    if (coverage >= 50) return "warning";
    return "danger";
}

export function SectionCard({
    title,
    description,
    actions,
    children,
    className,
}: {
    title: string;
    description?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn(
                "rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5",
                className,
            )}
        >
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
                    {description && (
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
                    )}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
            {children}
        </section>
    );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
    return (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--border-color)] px-6 py-10 text-center">
            <p className="text-sm text-[var(--text-secondary)]">{message}</p>
            {action}
        </div>
    );
}

/** Renders a countdown as a compact, human-readable duration. */
export function formatDuration(ms: number): string {
    const abs = Math.abs(ms);
    const hours = Math.floor(abs / (60 * 60 * 1000));
    const minutes = Math.floor((abs % (60 * 60 * 1000)) / (60 * 1000));

    if (hours >= 48) {
        return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    }
    if (hours >= 1) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}
