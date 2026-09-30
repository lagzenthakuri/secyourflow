import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Stat {
  icon?: ComponentType<{ size?: number }>;
  label: string;
  trend?: {
    value: string | number;
    isUp?: boolean;
    neutral?: boolean;
  };
  value: string | number;
}

interface PageHeaderProps {
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
  compact?: boolean;
  description?: string;
  stats?: Stat[];
  title: string;
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  stats,
  className,
  compact = false,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        "space-y-5 border-border border-b pb-6",
        compact && "space-y-4 pb-5",
        className
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          {badge && (
            <div className="mb-2 inline-flex items-center gap-2 font-medium text-muted-foreground text-xs">
              {badge}
            </div>
          )}

          <div className="space-y-1.5">
            <h1
              className={cn(
                "font-semibold text-2xl text-foreground tracking-tight sm:text-3xl",
                compact && "text-xl sm:text-2xl"
              )}
            >
              {title}
            </h1>
            {description && (
              <p
                className={cn(
                  "max-w-3xl text-muted-foreground text-sm leading-6",
                  compact && "text-sm"
                )}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
            {actions}
          </div>
        )}
      </div>

      {stats && stats.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-border border-t pt-4">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div className="flex items-center gap-2.5" key={i}>
                {Icon && (
                  <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                    <Icon size={compact ? 15 : 18} />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs">
                    {stat.label}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-foreground text-lg tabular-nums">
                      {stat.value}
                    </span>
                    {stat.trend && (
                      <span
                        className={cn(
                          "text-xs",
                          stat.trend.neutral
                            ? "text-muted-foreground"
                            : stat.trend.isUp
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-destructive"
                        )}
                      >
                        {stat.trend.value}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
