"use client";

import { ReactNode } from "react";
import { cn, getSeverityBgClass } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: ReactNode;
    trend?: {
        value: number;
        label: string;
    };
    severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    className?: string;
}

export function StatCard({
    title,
    value,
    subtitle,
    icon,
    trend,
    severity,
    className,
}: StatCardProps) {
    const getTrendIcon = () => {
        if (!trend) return null;
        if (trend.value > 0) return <TrendingUp size={14} className="text-intent-danger" />;
        if (trend.value < 0) return <TrendingDown size={14} className="text-green-600 dark:text-green-400" />;
        return <Minus size={14} className="text-gray-600 dark:text-gray-400" />;
    };

    const getTrendColor = () => {
        if (!trend) return "";
        if (trend.value > 0) return "text-intent-danger";
        if (trend.value < 0) return "text-green-600 dark:text-green-400";
        return "text-gray-600 dark:text-gray-400";
    };

    return (
        <div
            className={cn(
                "card stat-card p-5",
                className
            )}
        >
            <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium text-[var(--text-secondary)]">
                    {title}
                </span>
                {icon && (
                    <div className="p-2 rounded-lg bg-[var(--bg-tertiary)]">
                        {icon}
                    </div>
                )}
            </div>

            <div className="flex items-end gap-3">
                <div className="flex-1">
                    <span
                        className={cn(
                            "text-3xl font-bold",
                            severity ? getSeverityBgClass(severity).split(" ")[1] : "text-[var(--text-primary)]"
                        )}
                    >
                        {value}
                    </span>
                    {subtitle && (
                        <p className="text-sm text-[var(--text-muted)] mt-1">{subtitle}</p>
                    )}
                </div>

                {trend && (
                    <div className={cn("flex items-center gap-1", getTrendColor())}>
                        {getTrendIcon()}
                        <span className="text-xs font-medium">
                            {Math.abs(trend.value)}% {trend.label}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

interface RiskScoreCardProps {
    score: number;
    label: string;
    className?: string;
}

export function RiskScoreCard({ score, label, className }: RiskScoreCardProps) {
    const circumference = 2 * Math.PI * 60;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const getScoreColor = () => {
        if (score >= 80) return "#ef4444";
        if (score >= 60) return "#f97316";
        if (score >= 40) return "#eab308";
        return "#22c55e";
    };

    const getScoreLabel = () => {
        if (score >= 80) return "Critical";
        if (score >= 60) return "High";
        if (score >= 40) return "Medium";
        return "Low";
    };

    return (
        <div className={cn("card p-6 flex flex-col items-center", className)}>
            <span className="text-sm font-medium text-[var(--text-secondary)] mb-4">
                {label}
            </span>

            <div className="risk-ring">
                <svg width="160" height="160" viewBox="0 0 160 160">
                    {/* Background ring */}
                    <circle
                        cx="80"
                        cy="80"
                        r="60"
                        fill="none"
                        strokeWidth="12"
                        stroke="currentColor"
                        className="text-[var(--border-hover)]"
                    />
                    {/* Progress ring */}
                    <circle
                        cx="80"
                        cy="80"
                        r="60"
                        fill="none"
                        strokeWidth="12"
                        stroke={getScoreColor()}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="risk-ring-progress"
                    />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-[var(--text-primary)]">{score.toFixed(1)}</span>
                    <span
                        className="text-sm font-medium"
                        style={{ color: getScoreColor() }}
                    >
                        {getScoreLabel()}
                    </span>
                </div>
            </div>

            <div className="w-full mt-4 pt-4 border-t border-[var(--border-color)]">
                <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span>Target: &lt;40</span>
                    <span>Industry Avg: 65</span>
                </div>
            </div>
        </div>
    );
}

interface SeverityBadgeProps {
    severity: string;
    size?: "sm" | "md";
}

export function SeverityBadge({ severity, size = "md" }: SeverityBadgeProps) {
    const sizeClasses = size === "sm" ? "text-[10px] px-2 py-0.5" : "";

    return (
        <span className={cn("severity-badge", `severity-${severity.toLowerCase()}`, sizeClasses)}>
            {severity}
        </span>
    );
}

interface ProgressBarProps {
    value: number;
    max?: number;
    color?: string;
    showLabel?: boolean;
    className?: string;
}

export function ProgressBar({
    value,
    max = 100,
    color = "#3b82f6",
    showLabel = true,
    className,
}: ProgressBarProps) {
    const percentage = Math.min((value / max) * 100, 100);

    return (
        <div className={cn("flex items-center gap-3", className)}>
            <div className="flex-1 progress-bar">
                <div
                    className="progress-bar-fill"
                    style={{
                        width: `${percentage}%`,
                        background: color,
                    }}
                />
            </div>
            {showLabel && (
                <span className="text-sm font-medium text-[var(--text-secondary)] w-12 text-right">
                    {percentage.toFixed(0)}%
                </span>
            )}
        </div>
    );
}

interface CardProps {
    title?: string;
    subtitle?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    noPadding?: boolean;
}

export function Card({
    title,
    subtitle,
    action,
    children,
    className,
    noPadding,
}: CardProps) {
    return (
        <div className={cn("card", className)}>
            {(title || action) && (
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
                    <div>
                        {title && (
                            <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
                        )}
                        {subtitle && (
                            <p className="text-sm text-[var(--text-muted)] mt-0.5">{subtitle}</p>
                        )}
                    </div>
                    {action}
                </div>
            )}
            <div className={noPadding ? "" : "p-5"}>{children}</div>
        </div>
    );
}

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description: string;
    action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            {icon && (
                <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4 text-[var(--text-muted)]">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
            <p className="text-sm text-[var(--text-muted)] max-w-sm mb-4">
                {description}
            </p>
            {action}
        </div>
    );
}

interface TableProps {
    columns: { key: string; label: string; align?: "left" | "center" | "right" }[];
    data: Array<Record<string, ReactNode>>;
    onRowClick?: (row: Record<string, ReactNode>) => void;
}

export function Table({ columns, data, onRowClick }: TableProps) {
    return (
        <div className="table-container">
            <table className="table">
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={cn(
                                    col.align === "center" && "text-center",
                                    col.align === "right" && "text-right"
                                )}
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, idx) => (
                        <tr
                            key={idx}
                            className={cn(
                                "hover:bg-[var(--bg-tertiary)]",
                                onRowClick ? "cursor-pointer" : ""
                            )}
                            onClick={() => onRowClick?.(row)}
                        >
                            {columns.map((col) => (
                                <td
                                    key={col.key}
                                    className={cn(
                                        col.align === "center" && "text-center",
                                        col.align === "right" && "text-right"
                                    )}
                                >
                                    {row[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function LoadingSkeleton({ className }: { className?: string }) {
    return <div className={cn("shimmer rounded-lg", className)} />;
}
