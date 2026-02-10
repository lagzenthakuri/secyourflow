"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { Clock3, RefreshCw, Search, X, User, Globe, Monitor, Calendar, FileText, Activity as ActivityIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatIpAddress, normalizeIpAddress, parseUserAgent } from "@/lib/request-utils";

interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: {
    name: string | null;
    email: string;
    role: string;
    image: string | null;
  };
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getEntityTypeColor(entityType: string) {
  const type = entityType.toLowerCase();
  if (type.includes("auth") || type.includes("user")) return "border-blue-400/35 bg-blue-500/10 text-blue-200";
  if (type.includes("vulnerability")) return "border-red-400/35 bg-red-500/10 text-red-200";
  if (type.includes("asset")) return "border-green-400/35 bg-green-500/10 text-green-200";
  if (type.includes("compliance")) return "border-purple-400/35 bg-purple-500/10 text-purple-200";
  if (type.includes("risk")) return "border-orange-400/35 bg-orange-500/10 text-orange-200";
  if (type.includes("report")) return "border-yellow-400/35 bg-yellow-500/10 text-yellow-200";
  return "border-sky-400/35 bg-sky-500/10 text-sky-200";
}

export default function ReportsActivityPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      setError(null);
      const response = await fetch("/api/activity?limit=200", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load activity logs");
      }
      const payload = (await response.json()) as { 
        logs?: ActivityLog[];
        error?: string;
      };
      
      setActivities(payload.logs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity logs");
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredActivities = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return activities;

    return activities.filter((activity) =>
      `${activity.action} ${activity.entityType} ${activity.user?.name || ""} ${activity.user?.email || ""} ${normalizeIpAddress(activity.ipAddress) || ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [activities, search]);

  const totalActivities = filteredActivities.length;
  const todayActivities = filteredActivities.filter((activity) => {
    const activityDate = new Date(activity.createdAt);
    const today = new Date();
    return activityDate.toDateString() === today.toDateString();
  }).length;
  const thisWeekActivities = filteredActivities.filter((activity) => {
    const activityDate = new Date(activity.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return activityDate >= weekAgo;
  }).length;

  if (isLoading && activities.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <ShieldLoader size="lg" variant="cyber" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <section className="rounded-3xl border border-white/10 bg-[linear-gradient(132deg,rgba(56,189,248,0.2),rgba(18,18,26,0.9)_44%,rgba(18,18,26,0.96))] p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white sm:text-3xl">Activity Log</h1>
              <p className="mt-2 text-sm text-slate-200">
                System activity history showing user actions, security events, and system changes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
              >
                <Clock3 size={14} />
                Back to Reports
              </Link>
              <button
                type="button"
                onClick={() => void fetchData({ silent: true })}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15"
              >
                <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Total Activities",
              value: totalActivities,
              tone: "border-sky-400/35 bg-sky-500/10 text-sky-200",
            },
            {
              label: "Today",
              value: todayActivities,
              tone: "border-emerald-400/35 bg-emerald-500/10 text-emerald-200",
            },
            {
              label: "This Week",
              value: thisWeekActivities,
              tone: "border-yellow-400/35 bg-yellow-500/10 text-yellow-200",
            },
          ].map((item) => (
            <article key={item.label} className={cn("rounded-xl border px-4 py-3", item.tone)}>
              <p className="text-xs uppercase tracking-wide">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold">{item.value}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)] p-4">
          <label className="relative block">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              className="input h-10 w-full !pl-9 text-sm"
              placeholder="Search activities, users, entity types, IP addresses..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.84)]">
          <header className="border-b border-white/10 px-5 py-4">
            <h2 className="text-base font-semibold text-white">Activity Log</h2>
          </header>
          {filteredActivities.length === 0 ? (
            <div className="p-8 text-sm text-slate-400">No activity logs found.</div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredActivities.map((activity) => {
                const userAgentInfo = parseUserAgent(activity.userAgent);
                const activityDate = new Date(activity.createdAt);
                const displayIpAddress = formatIpAddress(activity.ipAddress);
                
                return (
                  <div 
                    key={activity.id} 
                    className="px-5 py-4 cursor-pointer transition-colors hover:bg-white/[0.03]"
                    onClick={() => setSelectedActivity(activity)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-white">{activity.action}</p>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[11px]",
                              getEntityTypeColor(activity.entityType),
                            )}
                          >
                            {formatLabel(activity.entityType)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                          {activity.user && (
                            <span className="flex items-center gap-1">
                              <User size={12} />
                              {activity.user.name || activity.user.email}
                            </span>
                          )}
                          {displayIpAddress !== "—" && (
                            <span className="flex items-center gap-1">
                              <Globe size={12} />
                              {displayIpAddress}
                            </span>
                          )}
                          {userAgentInfo.os !== "—" && (
                            <span className="flex items-center gap-1">
                              <Monitor size={12} />
                              {userAgentInfo.os} • {userAgentInfo.browser}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {activityDate.toLocaleDateString("en-US", {
                              month: "numeric",
                              day: "numeric",
                              year: "numeric",
                            })}, {activityDate.toLocaleTimeString("en-US")}
                          </span>
                        </div>
                      </div>
                      <button
                        className="text-xs text-sky-300 hover:text-sky-200 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedActivity(activity);
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Detail Modal */}
      {selectedActivity && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedActivity(null)}
        >
          <div 
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[rgba(18,18,26,0.98)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[rgba(18,18,26,0.98)] px-6 py-4">
              <h2 className="text-xl font-semibold text-white">Activity Details</h2>
              <button
                onClick={() => setSelectedActivity(null)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ActivityIcon size={16} className="text-sky-300" />
                  <h3 className="text-sm font-semibold text-white">Action Information</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Action</p>
                    <p className="text-sm text-white font-medium">{selectedActivity.action}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Entity Type</p>
                      <span className={cn("inline-block rounded-full border px-2 py-0.5 text-[11px]", getEntityTypeColor(selectedActivity.entityType))}>
                        {formatLabel(selectedActivity.entityType)}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Entity ID</p>
                      <p className="text-sm text-slate-200 font-mono break-all">{selectedActivity.entityId}</p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedActivity.user ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User size={16} className="text-blue-300" />
                    <h3 className="text-sm font-semibold text-white">User Information</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Name</p>
                        <p className="text-sm text-white">{selectedActivity.user.name || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Email</p>
                        <p className="text-sm text-white">{selectedActivity.user.email}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Role</p>
                      <span className="inline-block rounded-full border border-purple-400/35 bg-purple-500/10 px-2 py-0.5 text-[11px] text-purple-200">
                        {formatLabel(selectedActivity.user.role)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Network & Device Information */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Globe size={16} className="text-green-300" />
                  <h3 className="text-sm font-semibold text-white">Network & Device</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">IP Address</p>
                    <p className="text-sm text-white font-mono">{formatIpAddress(selectedActivity.ipAddress)}</p>
                  </div>
                  {selectedActivity.userAgent && (() => {
                    const info = parseUserAgent(selectedActivity.userAgent);
                    return (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Operating System</p>
                          <p className="text-sm text-white">{info.os}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Browser</p>
                          <p className="text-sm text-white">{info.browser}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Device Type</p>
                          <p className="text-sm text-white">{info.device}</p>
                        </div>
                      </div>
                    );
                  })()}
                  {selectedActivity.userAgent && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">User Agent</p>
                      <p className="text-xs text-slate-300 font-mono break-all">{selectedActivity.userAgent}</p>
                    </div>
                  )}
                  {!selectedActivity.userAgent && (
                    <p className="text-sm text-slate-500">No user agent information available</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={16} className="text-yellow-300" />
                  <h3 className="text-sm font-semibold text-white">Timestamp</h3>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Date & Time</p>
                  <p className="text-sm text-white">
                    {new Date(selectedActivity.createdAt).toLocaleDateString("en-US", {
                      month: "numeric",
                      day: "numeric",
                      year: "numeric",
                    })}, {new Date(selectedActivity.createdAt).toLocaleTimeString("en-US")}
                  </p>
                </div>
              </div>

              {(selectedActivity.oldValue || selectedActivity.newValue) ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={16} className="text-orange-300" />
                    <h3 className="text-sm font-semibold text-white">Changes</h3>
                  </div>
                  <div className="space-y-3">
                    {selectedActivity.oldValue ? (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Previous Value</p>
                        <pre className="text-xs text-slate-300 bg-black/20 rounded-lg p-3 overflow-x-auto">
                          {JSON.stringify(selectedActivity.oldValue, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                    {selectedActivity.newValue ? (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">New Value</p>
                        <pre className="text-xs text-slate-300 bg-black/20 rounded-lg p-3 overflow-x-auto">
                          {JSON.stringify(selectedActivity.newValue, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
