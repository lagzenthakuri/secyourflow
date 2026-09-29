import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Stat {
    label: string;
    value: string | number;
    icon?: ComponentType<{ size?: number }>;
    trend?: {
        value: string | number;
        isUp?: boolean;
        neutral?: boolean;
    };
}

interface PageHeaderProps {
    title: string;
    description?: string;
    badge?: ReactNode;
    actions?: ReactNode;
    stats?: Stat[];
    className?: string;
    compact?: boolean;
}

export function PageHeader({ title, description, badge, actions, stats, className, compact = false }: PageHeaderProps) {
    return (
        <section className={cn("space-y-5 border-b border-border pb-6", compact && "space-y-4 pb-5", className)}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                        {badge && (
                            <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                {badge}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <h1 className={cn("text-2xl font-semibold tracking-tight text-foreground sm:text-3xl", compact && "text-xl sm:text-2xl")}>
                                {title}
                            </h1>
                            {description && (
                                <p className={cn("max-w-3xl text-sm leading-6 text-muted-foreground", compact && "text-sm")}>
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
                    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-4">
                        {stats.map((stat, i) => {
                            const Icon = stat.icon;
                            return (
                                <div key={i} className="flex items-center gap-2.5">
                                    {Icon && (
                                        <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                                            <Icon size={compact ? 15 : 18} />
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground">
                                            {stat.label}
                                        </span>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-lg font-semibold tabular-nums text-foreground">
                                                {stat.value}
                                            </span>
                                            {stat.trend && (
                                                <span className={cn("text-xs", stat.trend.neutral ? "text-muted-foreground" : stat.trend.isUp ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                                                    {stat.trend.value}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
            )}
        </section>
    );
}
