"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  Activity,
  CheckCircle2,
  Clock,
  Gauge,
  Globe,
  HardDrive,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const pageLoadData = [
  { name: "Home", lcp: 1.2, fcp: 0.8, ttfb: 0.3, cls: 0.02 },
  { name: "Dashboard", lcp: 1.8, fcp: 1.1, ttfb: 0.5, cls: 0.05 },
  { name: "Assets", lcp: 1.5, fcp: 0.9, ttfb: 0.4, cls: 0.03 },
  { name: "Vulns", lcp: 1.6, fcp: 1.0, ttfb: 0.4, cls: 0.04 },
  { name: "Threats", lcp: 1.4, fcp: 0.8, ttfb: 0.3, cls: 0.02 },
  { name: "Reports", lcp: 2.1, fcp: 1.3, ttfb: 0.6, cls: 0.06 },
];

const bundleSizeData = [
  { name: "Main", size: 245, gzipped: 78 },
  { name: "Dashboard", size: 180, gzipped: 52 },
  { name: "Charts", size: 320, gzipped: 95 },
  { name: "Three.js", size: 580, gzipped: 165 },
  { name: "Auth", size: 95, gzipped: 28 },
];

const optimizationScore = [
  { name: "Performance", value: 92, color: "#10b981" },
  { name: "Accessibility", value: 88, color: "#3b82f6" },
  { name: "Best Practices", value: 95, color: "#8b5cf6" },
  { name: "SEO", value: 90, color: "#f59e0b" },
];

const resourceTiming = [
  { name: "HTML", duration: 120, size: 45 },
  { name: "CSS", duration: 85, size: 120 },
  { name: "JS", duration: 340, size: 890 },
  { name: "Images", duration: 210, size: 450 },
  { name: "Fonts", duration: 95, size: 180 },
  { name: "API", duration: 180, size: 65 },
];

const errorData = [
  { error: "Unauthorized", count: 12, users: 3, status: "401" },
  { error: "Forbidden", count: 8, users: 2, status: "403" },
  { error: "Not Found", count: 25, users: 5, status: "404" },
  { error: "Server Error", count: 3, users: 1, status: "500" },
  { error: "Database Timeout", count: 2, users: 1, status: "503" },
  { error: "Rate Limited", count: 15, users: 4, status: "429" },
];

const errorsByDay = [
  { day: "Mon", errors: 8, users: 3 },
  { day: "Tue", errors: 12, users: 4 },
  { day: "Wed", errors: 6, users: 2 },
  { day: "Thu", errors: 15, users: 5 },
  { day: "Fri", errors: 10, users: 3 },
  { day: "Sat", errors: 4, users: 2 },
  { day: "Sun", errors: 7, users: 3 },
];

const metrics = [
  {
    label: "Largest Contentful Paint",
    value: "1.4s",
    status: "good" as const,
    icon: Clock,
    description: "Main content visible",
  },
  {
    label: "First Input Delay",
    value: "45ms",
    status: "good" as const,
    icon: Zap,
    description: "Interaction latency",
  },
  {
    label: "Cumulative Layout Shift",
    value: "0.03",
    status: "good" as const,
    icon: Activity,
    description: "Visual stability",
  },
  {
    label: "Time to First Byte",
    value: "320ms",
    status: "good" as const,
    icon: Globe,
    description: "Server response",
  },
  {
    label: "Total Blocking Time",
    value: "180ms",
    status: "good" as const,
    icon: Gauge,
    description: "Main thread blocking",
  },
  {
    label: "Speed Index",
    value: "1.1s",
    status: "good" as const,
    icon: TrendingUp,
    description: "Visual completeness",
  },
];

const optimizations = [
  {
    title: "Static Generation",
    status: "active" as const,
    description: "110 pages pre-rendered at build time",
    icon: CheckCircle2,
  },
  {
    title: "Code Splitting",
    status: "active" as const,
    description: "Route-based automatic code splitting",
    icon: CheckCircle2,
  },
  {
    title: "Image Optimization",
    status: "active" as const,
    description: "Next.js Image with WebP/AVIF",
    icon: CheckCircle2,
  },
  {
    title: "Font Optimization",
    status: "active" as const,
    description: "Geist font with font-display: swap",
    icon: CheckCircle2,
  },
  {
    title: "Three.js Lazy Load",
    status: "active" as const,
    description: "Dynamic import with visibility pause",
    icon: CheckCircle2,
  },
  {
    title: "Edge Caching",
    status: "active" as const,
    description: "CDN cache headers configured",
    icon: CheckCircle2,
  },
];

export function HealthDashboard() {
  const totalBundle = useMemo(
    () => bundleSizeData.reduce((acc, b) => acc + b.size, 0),
    []
  );
  const totalGzipped = useMemo(
    () => bundleSizeData.reduce((acc, b) => acc + b.gzipped, 0),
    []
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-2xl tracking-tight">
                Page Health & Optimization
              </h1>
              <p className="text-muted-foreground text-sm">
                Performance metrics, bundle analysis, and optimization status
              </p>
            </div>
          </div>
        </div>

        {/* Core Web Vitals */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => (
            <Card className="border-border bg-card" key={metric.label}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10">
                      <metric.icon className="size-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">
                        {metric.label}
                      </p>
                      <p className="font-semibold text-lg">{metric.value}</p>
                    </div>
                  </div>
                  <Badge
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    variant="outline"
                  >
                    Good
                  </Badge>
                </div>
                <p className="mt-2 text-muted-foreground text-xs">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          {/* Page Load Performance */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-medium text-sm">
                Page Load Performance (seconds)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer height={220} width="100%">
                <AreaChart data={pageLoadData}>
                  <CartesianGrid
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    axisLine={false}
                    dataKey="name"
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    dataKey="lcp"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    name="LCP"
                    stackId="1"
                    stroke="#3b82f6"
                    type="monotone"
                  />
                  <Area
                    dataKey="fcp"
                    fill="#10b981"
                    fillOpacity={0.3}
                    name="FCP"
                    stackId="2"
                    stroke="#10b981"
                    type="monotone"
                  />
                  <Area
                    dataKey="ttfb"
                    fill="#f59e0b"
                    fillOpacity={0.3}
                    name="TTFB"
                    stackId="3"
                    stroke="#f59e0b"
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bundle Size */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-medium text-sm">
                Bundle Size by Route (KB)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer height={220} width="100%">
                <BarChart data={bundleSizeData}>
                  <CartesianGrid
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    axisLine={false}
                    dataKey="name"
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="size"
                    fill="#6366f1"
                    name="Raw KB"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="gzipped"
                    fill="#10b981"
                    name="Gzipped KB"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Second Row */}
        <div className="mb-6 grid gap-6 lg:grid-cols-3">
          {/* Optimization Score */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-medium text-sm">
                Optimization Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer height={180} width="100%">
                <PieChart>
                  <Pie
                    cx="50%"
                    cy="50%"
                    data={optimizationScore}
                    dataKey="value"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {optimizationScore.map((entry) => (
                      <Cell fill={entry.color} key={entry.name} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {optimizationScore.map((item) => (
                  <div
                    className="flex items-center justify-between text-xs"
                    key={item.name}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resource Timing */}
          <Card className="border-border bg-card lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="font-medium text-sm">
                Resource Loading (ms / KB)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer height={200} width="100%">
                <BarChart data={resourceTiming} layout="vertical">
                  <CartesianGrid
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    axisLine={false}
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickLine={false}
                    type="number"
                  />
                  <YAxis
                    axisLine={false}
                    dataKey="name"
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickLine={false}
                    type="category"
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="duration"
                    fill="#3b82f6"
                    name="Duration (ms)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Error Tracking */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          {/* Errors by Type */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-medium text-sm">
                Errors by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer height={220} width="100%">
                <BarChart data={errorData}>
                  <CartesianGrid
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    angle={-20}
                    axisLine={false}
                    dataKey="error"
                    height={50}
                    textAnchor="end"
                    tick={{
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#ef4444"
                    name="Error Count"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="users"
                    fill="#f97316"
                    name="Affected Users"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Errors Over Time */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-medium text-sm">
                Errors (7 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer height={220} width="100%">
                <AreaChart data={errorsByDay}>
                  <CartesianGrid
                    stroke="hsl(var(--border))"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    axisLine={false}
                    dataKey="day"
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickLine={false}
                  />
                  <YAxis
                    axisLine={false}
                    tick={{
                      fontSize: 11,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    dataKey="errors"
                    fill="#ef4444"
                    fillOpacity={0.3}
                    name="Errors"
                    stroke="#ef4444"
                    type="monotone"
                  />
                  <Area
                    dataKey="users"
                    fill="#f97316"
                    fillOpacity={0.3}
                    name="Affected Users"
                    stroke="#f97316"
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Error Details Table */}
        <Card className="mb-6 border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-medium text-sm">Recent Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border border-b">
                    <th className="pb-2 text-left font-medium text-muted-foreground">
                      Error
                    </th>
                    <th className="pb-2 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">
                      Count
                    </th>
                    <th className="pb-2 text-right font-medium text-muted-foreground">
                      Users Affected
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {errorData.map((item) => (
                    <tr className="border-border/50 border-b" key={item.error}>
                      <td className="py-2.5 font-medium">{item.error}</td>
                      <td className="py-2.5">
                        <Badge className="font-mono text-xs" variant="outline">
                          {item.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right">{item.count}</td>
                      <td className="py-2.5 text-right">{item.users}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Optimization Status */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-medium text-sm">
              Active Optimizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {optimizations.map((opt) => (
                <div
                  className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3"
                  key={opt.title}
                >
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/10">
                    <opt.icon className="size-3.5 text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{opt.title}</p>
                    <p className="mt-0.5 text-muted-foreground text-xs">
                      {opt.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary Footer */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3">
          <div className="flex items-center gap-4 text-muted-foreground text-xs">
            <div className="flex items-center gap-1.5">
              <HardDrive className="size-3.5" />
              <span>Total Bundle: {totalBundle} KB</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="size-3.5" />
              <span>Gzipped: {totalGzipped} KB</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="size-3.5" />
              <span>110 Static Pages</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              All Systems Optimized
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
