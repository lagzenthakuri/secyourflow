"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RiskTrend, VulnerabilitySeverityDistribution } from "@/types";

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
  label?: string;
  payload?: Array<{
    name: string;
    value: number;
    color?: string;
    dataKey?: string;
  }>;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="mb-2 text-[var(--text-muted)] text-xs">{label}</p>
        {payload.map((entry, index) => (
          <div className="flex items-center gap-2 text-sm" key={index}>
            <div
              className="h-2 w-2 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="text-[var(--text-secondary)]">{entry.name}:</span>
            <span className="font-medium text-[var(--text-primary)]">
              {entry.value}
            </span>
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
    <ResponsiveContainer height={280} width="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="riskGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="criticalGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor={COLORS.CRITICAL} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS.CRITICAL} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" />
        <XAxis
          axisLine={{ stroke: "var(--border-color)" }}
          dataKey="date"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          tickLine={false}
        />
        <YAxis
          axisLine={{ stroke: "var(--border-color)" }}
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          dataKey="riskScore"
          fill="url(#riskGradient)"
          name="Risk Score"
          stroke={COLORS.primary}
          strokeWidth={2}
          type="monotone"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface SeverityDistributionChartProps {
  data: VulnerabilitySeverityDistribution[];
}

export function SeverityDistributionChart({
  data,
}: SeverityDistributionChartProps) {
  return (
    <ResponsiveContainer height={220} width="100%">
      <PieChart>
        <Pie
          cx="50%"
          cy="50%"
          data={data}
          dataKey="count"
          innerRadius={55}
          nameKey="severity"
          outerRadius={85}
          paddingAngle={3}
        >
          {data.map((entry, index) => (
            <Cell
              fill={COLORS[entry.severity as keyof typeof COLORS]}
              key={`cell-${index}`}
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
                  <p className="font-medium text-[var(--text-primary)]">
                    {data.severity}
                  </p>
                  <p className="text-[var(--text-secondary)] text-sm">
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
    <ResponsiveContainer height={240} width="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
      >
        <CartesianGrid
          horizontal={false}
          stroke="var(--border-color)"
          strokeDasharray="3 3"
        />
        <XAxis
          axisLine={{ stroke: "var(--border-color)" }}
          domain={[0, 100]}
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          tickLine={false}
          type="number"
        />
        <YAxis
          axisLine={{ stroke: "var(--border-color)" }}
          dataKey="frameworkName"
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          tickLine={false}
          type="category"
          width={100}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          barSize={20}
          dataKey="compliancePercentage"
          fill={COLORS.primary}
          name="Compliance"
          radius={[0, 4, 4, 0]}
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
    <ResponsiveContainer height={240} width="100%">
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" />
        <XAxis
          axisLine={{ stroke: "var(--border-color)" }}
          dataKey="month"
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          tickLine={false}
        />
        <YAxis
          axisLine={{ stroke: "var(--border-color)" }}
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span className="text-[var(--text-primary)] text-xs">{value}</span>
          )}
          wrapperStyle={{ paddingTop: 10 }}
        />
        <Bar
          dataKey="opened"
          fill={COLORS.CRITICAL}
          name="Opened"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="closed"
          fill={COLORS.LOW}
          name="Closed"
          radius={[4, 4, 0, 0]}
        />
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
    <ResponsiveContainer height={240} width="100%">
      <BarChart
        data={data.slice(0, 6)}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" />
        <XAxis
          axisLine={{ stroke: "var(--border-color)" }}
          dataKey="type"
          tick={{ fill: "var(--text-muted)", fontSize: 10 }}
          tickFormatter={(v) => formatLabel(v).substring(0, 8)}
          tickLine={false}
        />
        <YAxis
          axisLine={{ stroke: "var(--border-color)" }}
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          tickLine={false}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="custom-tooltip">
                  <p className="font-medium text-[var(--text-primary)]">
                    {formatLabel(data.type)}
                  </p>
                  <p className="text-[var(--text-secondary)] text-sm">
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
          fill={COLORS.accent}
          name="Assets"
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
    <ResponsiveContainer height={200} width="100%">
      <BarChart
        data={data.slice(0, 5)}
        layout="vertical"
        margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
      >
        <defs>
          <linearGradient id="epssGradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={COLORS.LOW} />
            <stop offset="50%" stopColor={COLORS.MEDIUM} />
            <stop offset="100%" stopColor={COLORS.CRITICAL} />
          </linearGradient>
        </defs>
        <CartesianGrid
          horizontal={false}
          stroke="var(--border-color)"
          strokeDasharray="3 3"
        />
        <XAxis
          axisLine={{ stroke: "var(--border-color)" }}
          domain={[0, 1]}
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          tickLine={false}
          type="number"
        />
        <YAxis
          axisLine={{ stroke: "var(--border-color)" }}
          dataKey="cveId"
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          tickLine={false}
          type="category"
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="custom-tooltip">
                  <p className="font-medium text-[var(--text-primary)]">
                    {data.cveId}
                  </p>
                  <p className="mb-1 max-w-xs truncate text-[var(--text-muted)] text-xs">
                    {data.title}
                  </p>
                  <p className="text-[var(--text-secondary)] text-sm">
                    EPSS: {(data.epssScore * 100).toFixed(1)}%
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar
          barSize={16}
          dataKey="epssScore"
          fill="url(#epssGradient)"
          name="EPSS Score"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
