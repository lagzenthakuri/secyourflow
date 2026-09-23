"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Pill } from "@/components/nis2/Nis2Primitives";

/** Shared indicators for the GRC interconnection pages. */

export type AppetiteStatus = "WITHIN" | "APPROACHING" | "EXCEEDED" | "NOT_EVALUATED";
export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ComplianceStatus =
    | "COMPLIANT"
    | "NON_COMPLIANT"
    | "PARTIALLY_COMPLIANT"
    | "NOT_ASSESSED"
    | "NOT_APPLICABLE";
export type PolicyStatus = "DRAFT" | "UNDER_REVIEW" | "ACTIVE" | "ARCHIVED";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const APPETITE_TONE: Record<AppetiteStatus, Tone> = {
    WITHIN: "success",
    APPROACHING: "warning",
    EXCEEDED: "danger",
    NOT_EVALUATED: "neutral",
};

const APPETITE_LABEL: Record<AppetiteStatus, string> = {
    WITHIN: "Within appetite",
    APPROACHING: "Approaching",
    EXCEEDED: "Exceeded",
    NOT_EVALUATED: "Not evaluated",
};

export function AppetitePill({
    status,
    tolerance,
}: {
    /** Raw status string from the API; unknown values read as NOT_EVALUATED. */
    status?: string | null;
    tolerance?: number | null;
}) {
    const resolved: AppetiteStatus =
        status && status in APPETITE_TONE ? (status as AppetiteStatus) : "NOT_EVALUATED";
    return (
        <Pill tone={APPETITE_TONE[resolved]}>
            {APPETITE_LABEL[resolved]}
            {tolerance != null && resolved !== "NOT_EVALUATED" ? ` · ≤${tolerance}` : ""}
        </Pill>
    );
}

const RISK_LEVEL_CLASS: Record<RiskLevel, string> = {
    CRITICAL: "severity-critical",
    HIGH: "severity-high",
    MEDIUM: "severity-medium",
    LOW: "severity-low",
};

/** Same severity chip the vulnerability tables use, banded from the 1-25 score. */
export function RiskLevelPill({ level }: { level: RiskLevel | string | null | undefined }) {
    const resolved = (level ?? "LOW") as RiskLevel;
    return (
        <span
            className={cn(
                "inline-flex whitespace-nowrap rounded-lg border px-2 py-0.5 text-[11px] font-semibold",
                RISK_LEVEL_CLASS[resolved] ?? RISK_LEVEL_CLASS.LOW,
            )}
        >
            {resolved}
        </span>
    );
}

const COMPLIANCE_TONE: Record<ComplianceStatus, Tone> = {
    COMPLIANT: "success",
    NON_COMPLIANT: "danger",
    PARTIALLY_COMPLIANT: "warning",
    NOT_ASSESSED: "neutral",
    NOT_APPLICABLE: "neutral",
};

const COMPLIANCE_LABEL: Record<ComplianceStatus, string> = {
    COMPLIANT: "Compliant",
    NON_COMPLIANT: "Non-compliant",
    PARTIALLY_COMPLIANT: "Partially compliant",
    NOT_ASSESSED: "Not assessed",
    NOT_APPLICABLE: "Not applicable",
};

export function CompliancePill({ status }: { status: ComplianceStatus | string | null | undefined }) {
    const resolved = (status ?? "NOT_ASSESSED") as ComplianceStatus;
    return <Pill tone={COMPLIANCE_TONE[resolved] ?? "neutral"}>{COMPLIANCE_LABEL[resolved] ?? resolved}</Pill>;
}

const POLICY_STATUS_TONE: Record<PolicyStatus, Tone> = {
    DRAFT: "neutral",
    UNDER_REVIEW: "info",
    ACTIVE: "success",
    ARCHIVED: "neutral",
};

const POLICY_STATUS_LABEL: Record<PolicyStatus, string> = {
    DRAFT: "Draft",
    UNDER_REVIEW: "Under review",
    ACTIVE: "Approved",
    ARCHIVED: "Retired",
};

export function PolicyStatusPill({ status }: { status: PolicyStatus | string | null | undefined }) {
    const resolved = (status ?? "DRAFT") as PolicyStatus;
    return <Pill tone={POLICY_STATUS_TONE[resolved] ?? "neutral"}>{POLICY_STATUS_LABEL[resolved] ?? resolved}</Pill>;
}

export interface RelationshipColumn<T> {
    key: string;
    label: string;
    render: (row: T) => ReactNode;
    align?: "left" | "center" | "right";
}

/**
 * The relationship table every interconnection section uses: full width, one
 * row per linked record, an empty state when nothing is connected yet.
 */
export function RelationshipTable<T>({
    columns,
    rows,
    keyOf,
    emptyMessage = "Nothing connected yet.",
}: {
    columns: RelationshipColumn<T>[];
    rows: readonly T[];
    keyOf: (row: T, index: number) => string;
    emptyMessage?: string;
}) {
    if (rows.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-[var(--border-color)] px-4 py-6 text-center text-sm text-[var(--text-muted)]">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
            <table className="w-full text-left text-sm">
                <thead className="text-[11px] uppercase bg-[var(--bg-tertiary)] text-[var(--text-muted)] font-semibold whitespace-nowrap">
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                className={cn(
                                    "px-4 py-3",
                                    column.align === "center" && "text-center",
                                    column.align === "right" && "text-right",
                                )}
                            >
                                {column.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                    {rows.map((row, index) => (
                        <tr key={keyOf(row, index)} className="hover:bg-[var(--bg-tertiary)]/40">
                            {columns.map((column) => (
                                <td
                                    key={column.key}
                                    className={cn(
                                        "px-4 py-3 text-[var(--text-secondary)]",
                                        column.align === "center" && "text-center",
                                        column.align === "right" && "text-right",
                                    )}
                                >
                                    {column.render(row)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** Compact readout used in overview headers: label above, value below. */
export function SummaryTile({
    label,
    value,
    hint,
    children,
}: {
    label: string;
    value: ReactNode;
    hint?: string;
    children?: ReactNode;
}) {
    return (
        <div className="flex-1 min-w-[150px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                {label}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-lg font-bold text-[var(--text-primary)]">{value}</span>
                {children}
            </div>
            {hint && <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{hint}</p>}
        </div>
    );
}

export interface PickerOption {
    id: string;
    label: string;
}

export interface PickerMetaOption {
    value: string;
    label: string;
}

/**
 * Checkbox picker for a link set, with an optional per-row select for the
 * relationship the link carries (MANAGES, ACCESSES, STORES…).
 */
export function RelationshipPicker({
    title,
    options,
    selected,
    onToggle,
    meta,
    metaOptions,
    metaLabel,
    onMetaChange,
    className,
}: {
    title: string;
    options: PickerOption[];
    selected: string[];
    onToggle: (id: string) => void;
    /** Current value per selected id, for the per-row select. */
    meta?: Record<string, string>;
    metaOptions?: PickerMetaOption[];
    metaLabel?: string;
    onMetaChange?: (id: string, value: string) => void;
    className?: string;
}) {
    return (
        <div
            className={`rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 ${className ?? ""}`}
        >
            <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
                    {title}
                </h3>
                <Pill tone="info">{selected.length} linked</Pill>
            </div>

            {options.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No records available to link.</p>
            ) : (
                <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
                    {options.map((option) => {
                        const isSelected = selected.includes(option.id);
                        return (
                            <li
                                key={option.id}
                                className={`rounded-lg px-2 py-1.5 transition-colors ${
                                    isSelected
                                        ? "bg-blue-500/10"
                                        : "hover:bg-[var(--bg-tertiary)]"
                                }`}
                            >
                                <label className="flex cursor-pointer items-center gap-2 text-xs">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => onToggle(option.id)}
                                        className="accent-blue-500"
                                    />
                                    <span
                                        className={
                                            isSelected
                                                ? "truncate text-[var(--text-primary)]"
                                                : "truncate text-[var(--text-secondary)]"
                                        }
                                    >
                                        {option.label}
                                    </span>
                                </label>

                                {isSelected && meta && metaOptions && onMetaChange && (
                                    <div className="mt-1 flex items-center gap-2 pl-6">
                                        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                                            {metaLabel ?? "As"}
                                        </span>
                                        <select
                                            value={meta[option.id] ?? metaOptions[0]?.value ?? ""}
                                            onChange={(event) =>
                                                onMetaChange(option.id, event.target.value)
                                            }
                                            className="rounded-md border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[11px] text-[var(--text-primary)]"
                                        >
                                            {metaOptions.map((optionMeta) => (
                                                <option key={optionMeta.value} value={optionMeta.value}>
                                                    {optionMeta.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
