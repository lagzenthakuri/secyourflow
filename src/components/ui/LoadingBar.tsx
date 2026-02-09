"use client";

import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingBarProps {
    /** Whether the loading bar is active/visible */
    isLoading?: boolean;
    /** Progress percentage (0-100). If not provided, shows indeterminate animation */
    progress?: number;
    /** Height of the loading bar in pixels */
    height?: number;
    /** Color variant */
    variant?: "primary" | "cyber" | "success" | "warning" | "danger";
    /** Position of the loading bar */
    position?: "top" | "bottom" | "inline";
    /** Custom className */
    className?: string;
    /** Show glow effect */
    showGlow?: boolean;
    /** Animation speed for indeterminate mode (ms) */
    animationSpeed?: number;
}

const variantStyles = {
    primary: {
        track: "bg-blue-500/15",
        fill: "from-blue-300 via-blue-200 to-blue-300",
        badge: "border-blue-400/35 bg-blue-500/10",
        icon: "text-blue-300",
        glow: "shadow-[0_0_10px_rgba(59,130,246,0.35)]",
    },
    cyber: {
        track: "bg-cyan-500/15",
        fill: "from-cyan-300 via-sky-200 to-cyan-300",
        badge: "border-cyan-400/35 bg-cyan-500/10",
        icon: "text-cyan-300",
        glow: "shadow-[0_0_10px_rgba(6,182,212,0.35)]",
    },
    success: {
        track: "bg-green-500/15",
        fill: "from-green-300 via-emerald-200 to-green-300",
        badge: "border-green-400/35 bg-green-500/10",
        icon: "text-green-300",
        glow: "shadow-[0_0_10px_rgba(34,197,94,0.35)]",
    },
    warning: {
        track: "bg-yellow-500/15",
        fill: "from-yellow-300 via-amber-200 to-yellow-300",
        badge: "border-yellow-400/35 bg-yellow-500/10",
        icon: "text-yellow-300",
        glow: "shadow-[0_0_10px_rgba(234,179,8,0.35)]",
    },
    danger: {
        track: "bg-red-500/15",
        fill: "from-red-300 via-orange-200 to-red-300",
        badge: "border-red-400/35 bg-red-500/10",
        icon: "text-red-300",
        glow: "shadow-[0_0_10px_rgba(239,68,68,0.35)]",
    },
};

/**
 * Premium loading bar for top-level navigation or inline progress.
 */
export function LoadingBar({
    isLoading = true,
    progress,
    height = 3,
    variant = "cyber",
    position = "top",
    className,
    showGlow = true,
    animationSpeed = 1200,
}: LoadingBarProps) {
    const styles = variantStyles[variant];

    if (!isLoading) {
        return null;
    }

    const positionClasses = {
        top: "fixed top-0 left-0 right-0 z-[100]",
        bottom: "fixed bottom-0 left-0 right-0 z-[100]",
        inline: "relative w-full overflow-hidden rounded-full",
    };

    const isDeterminate = typeof progress === "number";
    const clampedProgress = isDeterminate
        ? Math.min(Math.max(progress, 0), 100)
        : 0;
    const shieldSize = Math.max(10, Math.min(14, height * 4));

    return (
        <div
            className={cn(positionClasses[position], className)}
            style={{ height: `${height}px` }}
        >
            <div
                className={cn(
                    "relative h-full w-full overflow-hidden",
                    position === "inline" && "rounded-full",
                    styles.track
                )}
            >
                <div
                    className={cn(
                        "h-full transition-all duration-500 ease-out relative rounded-full bg-gradient-to-r",
                        isDeterminate
                            ? ""
                            : "animate-loading-slide",
                        showGlow && styles.glow
                    )}
                    style={{
                        width: isDeterminate ? `${clampedProgress}%` : "30%",
                        animationDuration: !isDeterminate ? `${animationSpeed}ms` : undefined,
                    }}
                >
                    <div className={cn("absolute inset-0", `bg-gradient-to-r ${styles.fill}`)} />
                    <div
                        className={cn(
                            "absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rounded-[4px] border flex items-center justify-center",
                            styles.badge
                        )}
                        style={{ width: `${shieldSize}px`, height: `${shieldSize}px` }}
                    >
                        <Shield
                            size={Math.max(7, shieldSize - 4)}
                            className={styles.icon}
                            strokeWidth={2.2}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

interface LoadingSkeletonProps {
    /** Width of skeleton */
    width?: string;
    /** Height of skeleton */
    height?: string;
    /** Border radius */
    rounded?: "none" | "sm" | "md" | "lg" | "full";
    /** Custom className */
    className?: string;
    /** Number of lines for text skeleton */
    lines?: number;
}

const roundedClasses = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
};

/**
 * Placeholder skeleton with shimmer effect.
 */
export function LoadingSkeleton({
    width = "100%",
    height = "1rem",
    rounded = "md",
    className,
    lines = 1,
}: LoadingSkeletonProps) {
    if (lines > 1) {
        return (
            <div className={cn("space-y-2", className)}>
                {Array.from({ length: lines }).map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "shimmer bg-white/5",
                            roundedClasses[rounded]
                        )}
                        style={{
                            width: i === lines - 1 ? "80%" : width,
                            height,
                        }}
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className={cn(
                "shimmer bg-white/5",
                roundedClasses[rounded],
                className
            )}
            style={{ width, height }}
        />
    );
}
