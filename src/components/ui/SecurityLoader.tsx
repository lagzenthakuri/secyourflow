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
        container: "w-5 h-5",
        ring: "w-5 h-5",
        icon: 10,
        ringWidth: 1.5,
        text: "text-[10px]",
    },
    sm: {
        container: "w-12 h-12",
        ring: "w-12 h-12",
        icon: 16,
        ringWidth: 2,
        text: "text-xs",
    },
    md: {
        container: "w-20 h-20",
        ring: "w-20 h-20",
        icon: 24,
        ringWidth: 3,
        text: "text-sm",
    },
    lg: {
        container: "w-32 h-32",
        ring: "w-32 h-32",
        icon: 40,
        ringWidth: 4,
        text: "text-base",
    },
    xl: {
        container: "w-40 h-40",
        ring: "w-40 h-40",
        icon: 56,
        ringWidth: 5,
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
        ring: "stroke-blue-500",
        glow: "shadow-[0_0_30px_rgba(59,130,246,0.5)]",
        icon: "text-blue-400",
        bg: "bg-blue-500/10",
    },
    cyber: {
        ring: "stroke-cyan-500",
        glow: "shadow-[0_0_30px_rgba(6,182,212,0.5)]",
        icon: "text-cyan-400",
        bg: "bg-cyan-500/10",
    },
    success: {
        ring: "stroke-green-500",
        glow: "shadow-[0_0_30px_rgba(34,197,94,0.5)]",
        icon: "text-green-400",
        bg: "bg-green-500/10",
    },
    warning: {
        ring: "stroke-yellow-500",
        glow: "shadow-[0_0_30px_rgba(234,179,8,0.5)]",
        icon: "text-yellow-400",
        bg: "bg-yellow-500/10",
    },
    danger: {
        ring: "stroke-red-500",
        glow: "shadow-[0_0_30px_rgba(239,68,68,0.5)]",
        icon: "text-red-400",
        bg: "bg-red-500/10",
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

    return (
        <div className={cn("flex flex-col items-center justify-center", size === "xs" ? "gap-1" : "gap-4", className)}>
            {/* Loader Container */}
            <div className={cn("relative", config.container)}>
                {/* Background Circle */}
                <div
                    className={cn(
                        "absolute inset-0 rounded-full",
                        colors.bg,
                        "animate-pulse-glow"
                    )}
                />

                {/* Animated Ring */}
                <svg
                    className={cn("absolute inset-0", config.ring)}
                    viewBox="0 0 100 100"
                    style={{
                        transform: "rotate(-90deg)",
                    }}
                >
                    {/* Background track */}
                    <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth={config.ringWidth}
                    />

                    {/* Animated ring */}
                    <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        className={cn(colors.ring, colors.glow)}
                        strokeWidth={config.ringWidth}
                        strokeLinecap="round"
                        strokeDasharray="283"
                        strokeDashoffset="0"
                        style={{
                            animation: `security-spin ${speed}ms linear infinite`,
                        }}
                    />
                </svg>

                {/* Center Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <Icon
                        size={config.icon}
                        className={cn(colors.icon, "animate-pulse-glow")}
                        strokeWidth={2.5}
                    />
                </div>
            </div>

            {/* Text */}
            {text && (
                <p className={cn(config.text, "text-[var(--text-secondary)] animate-pulse font-medium")}>
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