"use client";

import { useEffect, useState } from "react";
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
        bg: "bg-blue-500",
        gradient: "from-blue-600 via-blue-500 to-cyan-500",
        glow: "shadow-[0_0_15px_rgba(59,130,246,0.5)]",
    },
    cyber: {
        bg: "bg-cyan-500",
        gradient: "from-blue-500 via-cyan-500 to-blue-400",
        glow: "shadow-[0_0_15px_rgba(6,182,212,0.5)]",
    },
    success: {
        bg: "bg-green-500",
        gradient: "from-green-600 via-green-500 to-emerald-500",
        glow: "shadow-[0_0_15px_rgba(34,197,94,0.5)]",
    },
    warning: {
        bg: "bg-yellow-500",
        gradient: "from-yellow-600 via-yellow-500 to-amber-500",
        glow: "shadow-[0_0_15px_rgba(234,179,8,0.5)]",
    },
    danger: {
        bg: "bg-red-500",
        gradient: "from-red-600 via-red-500 to-orange-500",
        glow: "shadow-[0_0_15px_rgba(239,68,68,0.5)]",
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
}: LoadingBarProps) {
    const [mounted, setMounted] = useState(false);
    const styles = variantStyles[variant];

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !isLoading) {
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

    return (
        <div
            className={cn(positionClasses[position], className)}
            style={{ height: `${height}px` }}
        >
            {/* Background track */}
            <div className="w-full h-full bg-white/5 overflow-hidden">
                {/* Progress bar */}
                <div
                    className={cn(
                        "h-full transition-all duration-500 ease-out relative",
                        isDeterminate
                            ? `bg-gradient-to-r ${styles.gradient}`
                            : `bg-gradient-to-r ${styles.gradient} animate-loading-slide`,
                        showGlow && styles.glow
                    )}
                    style={{
                        width: isDeterminate ? `${clampedProgress}%` : "30%",
                    }}
                >
                    {/* Subtle highlight */}
                    <div className="absolute inset-0 bg-white/20 blur-[1px]" />
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
