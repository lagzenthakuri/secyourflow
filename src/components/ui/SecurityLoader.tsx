"use client";

import { Shield, Lock, Scan, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SecurityLoaderProps {
    /** Size of the loader */
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    /** Icon to display in center */
    icon?: "shield" | "lock" | "scan" | "alert" | "check";
    /** Custom className */
    className?: string;
    /** Show text below loader */
    text?: string;
    /** Color variant */
    variant?: "primary" | "cyber" | "success" | "warning" | "danger";
    /** Animation speed (ms) */
    speed?: number;
}

const sizeConfig = {
    xs: {
        badge: "h-4 w-4 rounded-md",
        bar: "h-[2px] w-6",
        gap: "gap-1.5",
        inline: true,
        icon: 9,
        text: "text-[10px]",
    },
    sm: {
        badge: "h-5 w-5 rounded-md",
        bar: "h-[2px] w-10",
        gap: "gap-2",
        inline: false,
        icon: 11,
        text: "text-xs",
    },
    md: {
        badge: "h-6 w-6 rounded-lg",
        bar: "h-[2px] w-14",
        gap: "gap-2",
        inline: false,
        icon: 13,
        text: "text-sm",
    },
    lg: {
        badge: "h-7 w-7 rounded-lg",
        bar: "h-[3px] w-[4.5rem]",
        gap: "gap-2.5",
        inline: false,
        icon: 15,
        text: "text-base",
    },
    xl: {
        badge: "h-8 w-8 rounded-lg",
        bar: "h-[3px] w-24",
        gap: "gap-3",
        inline: false,
        icon: 17,
        text: "text-lg",
    },
};

const iconMap = {
    shield: Shield,
    lock: Lock,
    scan: Scan,
    alert: AlertTriangle,
    check: CheckCircle,
};

const variantColors = {
    primary: {
        badge: "border-blue-400/35 bg-blue-500/10",
        icon: "text-blue-300",
        track: "bg-blue-500/15",
        fill: "from-blue-300 via-blue-200 to-blue-300",
    },
    cyber: {
        badge: "border-cyan-400/35 bg-cyan-500/10",
        icon: "text-cyan-300",
        track: "bg-cyan-500/15",
        fill: "from-cyan-300 via-sky-200 to-cyan-300",
    },
    success: {
        badge: "border-green-400/35 bg-green-500/10",
        icon: "text-green-300",
        track: "bg-green-500/15",
        fill: "from-green-300 via-emerald-200 to-green-300",
    },
    warning: {
        badge: "border-yellow-400/35 bg-yellow-500/10",
        icon: "text-yellow-300",
        track: "bg-yellow-500/15",
        fill: "from-yellow-300 via-amber-200 to-yellow-300",
    },
    danger: {
        badge: "border-red-400/35 bg-red-500/10",
        icon: "text-red-300",
        track: "bg-red-500/15",
        fill: "from-red-300 via-orange-200 to-red-300",
    },
};

export function SecurityLoader({
    size = "md",
    icon = "shield",
    className,
    text,
    variant = "cyber",
    speed = 1500,
}: SecurityLoaderProps) {
    const config = sizeConfig[size];
    const Icon = iconMap[icon];
    const colors = variantColors[variant];
    const animationDuration = Math.max(speed, 650);

    return (
        <div
            className={cn(
                "inline-flex justify-center",
                config.inline
                    ? cn("items-center", config.gap)
                    : cn("flex-col items-center", config.gap),
                className
            )}
        >
            <div
                className={cn(
                    "flex items-center justify-center border",
                    config.badge,
                    colors.badge
                )}
            >
                <Icon
                    size={config.icon}
                    className={cn(colors.icon, "animate-security-loader-icon")}
                    strokeWidth={2.2}
                />
            </div>

            <div className={cn("relative overflow-hidden rounded-full", config.bar, colors.track)}>
                <div
                    className={cn(
                        "absolute inset-y-0 left-0 w-[45%] rounded-full bg-gradient-to-r animate-security-loader-bar",
                        colors.fill
                    )}
                    style={{ animationDuration: `${animationDuration}ms` }}
                />
            </div>

            {text && (
                <p className={cn(config.text, "text-[var(--text-secondary)] font-medium")}>
                    {text}
                </p>
            )}
        </div>
    );
}

interface SecurityLoadingOverlayProps {
    /** Whether the overlay is visible */
    isLoading: boolean;
    /** Text to display */
    text?: string;
    /** Icon variant */
    icon?: "shield" | "lock" | "scan" | "alert" | "check";
    /** Color variant */
    variant?: "primary" | "cyber" | "success" | "warning" | "danger";
    /** Size of loader */
    size?: "xs" | "sm" | "md" | "lg" | "xl";
}

export function SecurityLoadingOverlay({
    isLoading,
    text = "Securing your data...",
    icon = "shield",
    variant = "cyber",
    size = "lg",
}: SecurityLoadingOverlayProps) {
    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <SecurityLoader
                size={size}
                icon={icon}
                text={text}
                variant={variant}
            />
        </div>
    );
}

interface SecurityLoadingCardProps {
    /** Whether loading */
    isLoading: boolean;
    /** Text to display */
    text?: string;
    /** Icon variant */
    icon?: "shield" | "lock" | "scan" | "alert" | "check";
    /** Color variant */
    variant?: "primary" | "cyber" | "success" | "warning" | "danger";
    /** Size of loader */
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    /** Custom className */
    className?: string;
}

export function SecurityLoadingCard({
    isLoading,
    text = "Loading...",
    icon = "shield",
    variant = "cyber",
    size = "md",
    className,
}: SecurityLoadingCardProps) {
    if (!isLoading) return null;

    return (
        <div className={cn("card p-12 flex items-center justify-center", className)}>
            <SecurityLoader
                size={size}
                icon={icon}
                text={text}
                variant={variant}
            />
        </div>
    );
}
