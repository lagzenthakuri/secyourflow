"use client";

import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { RiskTrend, VulnerabilitySeverityDistribution } from "@/types";

const COLORS = {
    CRITICAL: "#ef4444",
    HIGH: "#f97316",
    MEDIUM: "#eab308",
    LOW: "#22c55e",
    INFORMATIONAL: "#6b7280",
    primary: "#3b82f6",
    accent: "#06b6d4",
    purple: "#8b5cf6",
};

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color?: string; dataKey?: string }>;
    label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip">
                <p className="text-xs text-[var(--text-muted)] mb-2">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: entry.color }}
                        />
                        <span className="text-[var(--text-secondary)]">{entry.name}:</span>
                        <span className="font-medium text-[var(--text-primary)]">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
}

interface RiskTrendChartProps {
    data: RiskTrend[];
}

export function RiskTrendChart({ data }: RiskTrendChartProps) {
    return (
        <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                    <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="criticalGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.CRITICAL} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.CRITICAL} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border-color)" }}
                />
                <YAxis
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border-color)" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                    type="monotone"
                    dataKey="riskScore"
                    name="Risk Score"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    fill="url(#riskGradient)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}

interface SeverityDistributionChartProps {
    data: VulnerabilitySeverityDistribution[];
}

export function SeverityDistributionChart({ data }: SeverityDistributionChartProps) {
    return (
        <ResponsiveContainer width="100%" height={220}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="severity"
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={COLORS[entry.severity as keyof typeof COLORS]}
                            strokeWidth={0}
                        />
                    ))}
                </Pie>
                <Tooltip
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                                <div className="custom-tooltip">
                                    <p className="font-medium text-[var(--text-primary)]">{data.severity}</p>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        {data.count} vulnerabilities ({data.percentage}%)
                                    </p>
                                </div>
                            );
                        }
                        return null;
                    }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}

interface ComplianceBarChartProps {
    data: Array<{
        frameworkName: string;
        compliancePercentage: number;
        compliant: number;
        nonCompliant: number;
    }>;
}

export function ComplianceBarChart({ data }: ComplianceBarChartProps) {
    return (
        <ResponsiveContainer width="100%" height={240}>
            <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border-color)" }}
                />
                <YAxis
                    type="category"
                    dataKey="frameworkName"
                    width={100}
                    tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border-color)" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                    dataKey="compliancePercentage"
                    name="Compliance"
                    fill={COLORS.primary}
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}

interface VulnStatusChartProps {
    data: Array<{
        month: string;
        opened: number;
        closed: number;
    }>;
}

export function VulnStatusChart({ data }: VulnStatusChartProps) {
    return (
        <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis
                    dataKey="month"
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border-color)" }}
                />
                <YAxis
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border-color)" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    wrapperStyle={{ paddingTop: 10 }}
                    formatter={(value) => (
                        <span className="text-xs text-[var(--text-secondary)]">{value}</span>
                    )}
                />
                <Bar dataKey="opened" name="Opened" fill={COLORS.CRITICAL} radius={[4, 4, 0, 0]} />
                <Bar dataKey="closed" name="Closed" fill={COLORS.LOW} radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}

interface AssetTypeChartProps {
    data: Array<{
        type: string;
        count: number;
        percentage: number;
    }>;
}

export function AssetTypeChart({ data }: AssetTypeChartProps) {
    const formatLabel = (type: string) => {
        return type
            .replace(/_/g, " ")
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase());
    };

    return (
        <ResponsiveContainer width="100%" height={240}>
            <BarChart
                data={data.slice(0, 6)}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis
                    dataKey="type"
                    tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border-color)" }}
                    tickFormatter={(v) => formatLabel(v).substring(0, 8)}
                />
                <YAxis
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border-color)" }}
                />
                <Tooltip
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                                <div className="custom-tooltip">
                                    <p className="font-medium text-[var(--text-primary)]">{formatLabel(data.type)}</p>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        {data.count} assets ({data.percentage}%)
                                    </p>
                                </div>
                            );
                        }
                        return null;
                    }}
                />
                <Bar
                    dataKey="count"
                    name="Assets"
                    fill={COLORS.accent}
                    radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}

interface EPSSChartProps {
    data: Array<{
        cveId: string;
        epssScore: number;
        title: string;
    }>;
}

export function EPSSChart({ data }: EPSSChartProps) {
    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart
                data={data.slice(0, 5)}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
            >
                <defs>
                    <linearGradient id="epssGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={COLORS.LOW} />
                        <stop offset="50%" stopColor={COLORS.MEDIUM} />
                        <stop offset="100%" stopColor={COLORS.CRITICAL} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                <XAxis
                    type="number"
                    domain={[0, 1]}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    tickLine={false}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    axisLine={{ stroke: "var(--border-color)" }}
                />
                <YAxis
                    type="category"
                    dataKey="cveId"
                    tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--border-color)" }}
                />
                <Tooltip
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                                <div className="custom-tooltip">
                                    <p className="font-medium text-[var(--text-primary)]">{data.cveId}</p>
                                    <p className="text-xs text-[var(--text-muted)] mb-1 max-w-xs truncate">
                                        {data.title}
                                    </p>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        EPSS: {(data.epssScore * 100).toFixed(1)}%
                                    </p>
                                </div>
                            );
                        }
                        return null;
                    }}
                />
                <Bar
                    dataKey="epssScore"
                    name="EPSS Score"
                    fill="url(#epssGradient)"
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
