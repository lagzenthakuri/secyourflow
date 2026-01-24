import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
}

export function formatPercentage(value: number, decimals: number = 1): string {
    return `${(value * 100).toFixed(decimals)}%`;
}

export function getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
        CRITICAL: "#ef4444",
        HIGH: "#f97316",
        MEDIUM: "#eab308",
        LOW: "#22c55e",
        INFORMATIONAL: "#6b7280",
    };
    return colors[severity] || colors.INFORMATIONAL;
}

export function getSeverityBgClass(severity: string): string {
    const classes: Record<string, string> = {
        CRITICAL: "bg-red-500/10 text-red-500 border-red-500/20",
        HIGH: "bg-orange-500/10 text-orange-500 border-orange-500/20",
        MEDIUM: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        LOW: "bg-green-500/10 text-green-500 border-green-500/20",
        INFORMATIONAL: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    };
    return classes[severity] || classes.INFORMATIONAL;
}

export function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
        OPEN: "#ef4444",
        IN_PROGRESS: "#3b82f6",
        MITIGATED: "#8b5cf6",
        FIXED: "#22c55e",
        ACCEPTED: "#6b7280",
        FALSE_POSITIVE: "#6b7280",
    };
    return colors[status] || "#6b7280";
}

export function calculateRiskScore(
    cvssScore: number,
    epssScore: number,
    assetCriticality: string,
    isExploited: boolean
): number {
    const criticalityMultiplier: Record<string, number> = {
        CRITICAL: 1.5,
        HIGH: 1.25,
        MEDIUM: 1.0,
        LOW: 0.75,
        INFORMATIONAL: 0.5,
    };

    let baseScore = cvssScore * 10; // CVSS is 0-10, normalize to 0-100
    let epssMultiplier = 1 + epssScore; // EPSS is 0-1
    let assetMultiplier = criticalityMultiplier[assetCriticality] || 1.0;
    let exploitMultiplier = isExploited ? 1.5 : 1.0;

    let riskScore = baseScore * epssMultiplier * assetMultiplier * exploitMultiplier;

    return Math.min(100, Math.round(riskScore * 10) / 10);
}

export function formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export function formatDateTime(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function getTimeAgo(date: Date | string): string {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return formatDate(date);
}
