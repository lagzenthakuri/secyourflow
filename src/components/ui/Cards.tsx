"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn, getSeverityBgClass } from "@/lib/utils";

interface StatCardProps {
  className?: string;
  icon?: ReactNode;
  severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  subtitle?: string;
  title: string;
  trend?: {
    value: number;
    label: string;
  };
  value: string | number;
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
    if (!trend) {
      return null;
    }
    if (trend.value > 0) {
      return <TrendingUp className="text-intent-danger" size={14} />;
    }
    if (trend.value < 0) {
      return (
        <TrendingDown
          className="text-green-600 dark:text-green-400"
          size={14}
        />
      );
    }
    return <Minus className="text-gray-600 dark:text-gray-400" size={14} />;
  };

  const getTrendColor = () => {
    if (!trend) {
      return "";
    }
    if (trend.value > 0) {
      return "text-intent-danger";
    }
    if (trend.value < 0) {
      return "text-green-600 dark:text-green-400";
    }
    return "text-gray-600 dark:text-gray-400";
  };

  return (
    <div className={cn("card stat-card p-5", className)}>
      <div className="mb-3 flex items-start justify-between">
        <span className="font-medium text-[var(--text-secondary)] text-sm">
          {title}
        </span>
        {icon && (
          <div className="rounded-lg bg-[var(--bg-tertiary)] p-2">{icon}</div>
        )}
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <span
            className={cn(
              "font-bold text-3xl",
              severity
                ? getSeverityBgClass(severity).split(" ")[1]
                : "text-[var(--text-primary)]"
            )}
          >
            {value}
          </span>
          {subtitle && (
            <p className="mt-1 text-[var(--text-muted)] text-sm">{subtitle}</p>
          )}
        </div>

        {trend && (
          <div className={cn("flex items-center gap-1", getTrendColor())}>
            {getTrendIcon()}
            <span className="font-medium text-xs">
              {Math.abs(trend.value)}% {trend.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface RiskScoreCardProps {
  className?: string;
  label: string;
  score: number;
}

export function RiskScoreCard({ score, label, className }: RiskScoreCardProps) {
  const circumference = 2 * Math.PI * 60;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = () => {
    if (score >= 80) {
      return "#ef4444";
    }
    if (score >= 60) {
      return "#f97316";
    }
    if (score >= 40) {
      return "#eab308";
    }
    return "#22c55e";
  };

  const getScoreLabel = () => {
    if (score >= 80) {
      return "Critical";
    }
    if (score >= 60) {
      return "High";
    }
    if (score >= 40) {
      return "Medium";
    }
    return "Low";
  };

  return (
    <div className={cn("card flex flex-col items-center p-6", className)}>
      <span className="mb-4 font-medium text-[var(--text-secondary)] text-sm">
        {label}
      </span>

      <div className="risk-ring">
        <svg height="160" viewBox="0 0 160 160" width="160">
          {/* Background ring */}
          <circle
            className="text-[var(--border-hover)]"
            cx="80"
            cy="80"
            fill="none"
            r="60"
            stroke="currentColor"
            strokeWidth="12"
          />
          {/* Progress ring */}
          <circle
            className="risk-ring-progress"
            cx="80"
            cy="80"
            fill="none"
            r="60"
            stroke={getScoreColor()}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeWidth="12"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold text-4xl text-[var(--text-primary)]">
            {score.toFixed(1)}
          </span>
          <span
            className="font-medium text-sm"
            style={{ color: getScoreColor() }}
          >
            {getScoreLabel()}
          </span>
        </div>
      </div>

      <div className="mt-4 w-full border-[var(--border-color)] border-t pt-4">
        <div className="flex justify-between text-[var(--text-muted)] text-xs">
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
    <span
      className={cn(
        "severity-badge",
        `severity-${severity.toLowerCase()}`,
        sizeClasses
      )}
    >
      {severity}
    </span>
  );
}

interface ProgressBarProps {
  className?: string;
  color?: string;
  max?: number;
  showLabel?: boolean;
  value: number;
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
      <div className="progress-bar flex-1">
        <div
          className="progress-bar-fill"
          style={{
            width: `${percentage}%`,
            background: color,
          }}
        />
      </div>
      {showLabel && (
        <span className="w-12 text-right font-medium text-[var(--text-secondary)] text-sm">
          {percentage.toFixed(0)}%
        </span>
      )}
    </div>
  );
}

interface CardProps {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  subtitle?: string;
  title?: string;
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
        <div className="flex items-center justify-between border-[var(--border-color)] border-b px-5 py-4">
          <div>
            {title && (
              <h3 className="font-semibold text-[var(--text-primary)] text-base">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[var(--text-muted)] text-sm">
                {subtitle}
              </p>
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
  action?: ReactNode;
  description: string;
  icon?: ReactNode;
  title: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
          {icon}
        </div>
      )}
      <h3 className="mb-1 font-semibold text-[var(--text-primary)] text-lg">
        {title}
      </h3>
      <p className="mb-4 max-w-sm text-[var(--text-muted)] text-sm">
        {description}
      </p>
      {action}
    </div>
  );
}

interface TableProps {
  columns: {
    key: string;
    label: string;
    align?: "left" | "center" | "right";
  }[];
  data: Record<string, ReactNode>[];
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
                className={cn(
                  col.align === "center" && "text-center",
                  col.align === "right" && "text-right"
                )}
                key={col.key}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              className={cn(
                "hover:bg-[var(--bg-tertiary)]",
                onRowClick ? "cursor-pointer" : ""
              )}
              key={idx}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td
                  className={cn(
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right"
                  )}
                  key={col.key}
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
