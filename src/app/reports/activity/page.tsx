"use client";
import { Input as BoilerplateInput } from "@repo/design-system/components/ui/input";
import {
  Activity as ActivityIcon,
  Calendar,
  Clock3,
  FileText,
  Globe,
  Monitor,
  RefreshCw,
  Search,
  User,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import {
  formatIpAddress,
  normalizeIpAddress,
  parseUserAgent,
} from "@/lib/request-utils";
import { cn, formatLabel } from "@/lib/utils";

interface ActivityLog {
  action: string;
  createdAt: string;
  entityId: string;
  entityType: string;
  id: string;
  ipAddress?: string | null;
  newValue?: unknown;
  oldValue?: unknown;
  user?: {
    name: string | null;
    email: string;
    role: string;
    image: string | null;
  };
  userAgent?: string | null;
}

function getEntityTypeColor(entityType: string) {
  const type = entityType.toLowerCase();
  if (type.includes("auth") || type.includes("user")) {
    return "border-blue-400/35 bg-blue-500/10 text-blue-700 dark:text-blue-200";
  }
  if (type.includes("vulnerability")) {
    return "border-red-400/35 bg-red-500/10 text-red-700 dark:text-red-200";
  }
  if (type.includes("asset")) {
    return "border-green-400/35 bg-green-500/10 text-green-700 dark:text-green-200";
  }
  if (type.includes("compliance")) {
    return "border-purple-400/35 bg-purple-500/10 text-purple-700 dark:text-purple-200";
  }
  if (type.includes("risk")) {
    return "border-orange-400/35 bg-orange-500/10 text-orange-700 dark:text-orange-200";
  }
  if (type.includes("report")) {
    return "border-yellow-400/35 bg-yellow-500/10 text-yellow-700 dark:text-yellow-200";
  }
  return "border-sky-400/35 bg-sky-500/10 text-sky-700 dark:text-sky-200";
}

export default function ReportsActivityPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const isMainOfficer = session?.user?.role === "MAIN_OFFICER";

  const fetchData = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        setError(null);
        const response = await fetch("/api/activity?limit=200", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Failed to load activity logs");
        }
        const payload = (await response.json()) as {
          logs?: ActivityLog[];
          error?: string;
        };

        setActivities(payload.logs ?? []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load activity logs"
        );
      } finally {
        if (silent) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (isMainOfficer) {
      void fetchData();
    }
  }, [fetchData, isMainOfficer]);

  const filteredActivities = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return activities;
    }

    return activities.filter((activity) =>
      `${activity.action} ${activity.entityType} ${activity.user?.name || ""} ${activity.user?.email || ""} ${normalizeIpAddress(activity.ipAddress) || ""}`
        .toLowerCase()
        .includes(needle)
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

  if (isLoading && activities.length === 0 && isMainOfficer) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <ShieldLoader size="lg" variant="cyber" />
        </div>
      </DashboardLayout>
    );
  }

  if (status !== "loading" && !isMainOfficer) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md rounded-2xl border border-red-400/20 bg-red-500/5 p-8">
            <XCircle className="mx-auto mb-4 text-intent-danger" size={48} />
            <h1 className="mb-2 font-semibold text-[var(--text-primary)] text-xl">
              Access Denied
            </h1>
            <p className="mb-6 text-[var(--text-muted)] text-sm">
              The Activity Log is only accessible by Main Officers. Please
              contact your administrator if you believe this is an error.
            </p>
            <Link
              className="inline-flex items-center gap-2 rounded-xl bg-sky-300 px-6 py-2.5 font-semibold text-slate-950 text-sm transition-all hover:bg-sky-200"
              href="/dashboard"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <section className="rounded-3xl border border-[var(--border-color)] bg-[linear-gradient(132deg,rgba(56,189,248,0.2),rgba(18,18,26,0.9)_44%,rgba(18,18,26,0.96))] p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-semibold text-2xl text-[var(--text-primary)] sm:text-3xl">
                Activity Log
              </h1>
              <p className="mt-2 text-[var(--text-secondary)] text-sm">
                System activity history showing user actions, security events,
                and system changes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 font-medium text-[var(--text-primary)] text-sm transition hover:bg-[var(--bg-elevated)]"
                href="/reports"
              >
                <Clock3 size={14} />
                Back to Reports
              </Link>
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 font-medium text-[var(--text-primary)] text-sm transition hover:bg-[var(--bg-elevated)]"
                onClick={() => void fetchData({ silent: true })}
                type="button"
              >
                <RefreshCw
                  className={isRefreshing ? "animate-spin" : ""}
                  size={14}
                />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-red-700 text-sm dark:text-red-200">
            {error}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Total Activities",
              value: totalActivities,
              tone: "border-sky-400/35 bg-sky-500/10 text-sky-700 dark:text-sky-200",
            },
            {
              label: "Today",
              value: todayActivities,
              tone: "border-emerald-400/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
            },
            {
              label: "This Week",
              value: thisWeekActivities,
              tone: "border-yellow-400/35 bg-yellow-500/10 text-yellow-700 dark:text-yellow-200",
            },
          ].map((item) => (
            <article
              className={cn("rounded-xl border px-4 py-3", item.tone)}
              key={item.label}
            >
              <p className="text-xs uppercase tracking-wide">{item.label}</p>
              <p className="mt-1 font-semibold text-2xl">{item.value}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-muted)]"
              size={15}
            />
            <BoilerplateInput
              className="!pl-9 h-10 w-full text-sm"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search activities, users, entity types, IP addresses..."
              value={search}
            />
          </label>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]">
          <header className="border-[var(--border-color)] border-b px-5 py-4">
            <h2 className="font-semibold text-[var(--text-primary)] text-base">
              Activity Log
            </h2>
          </header>
          {filteredActivities.length === 0 ? (
            <div className="p-8 text-[var(--text-muted)] text-sm">
              No activity logs found.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-color)]">
              {filteredActivities.map((activity) => {
                const userAgentInfo = parseUserAgent(activity.userAgent);
                const activityDate = new Date(activity.createdAt);
                const displayIpAddress = formatIpAddress(activity.ipAddress);

                return (
                  <div
                    className="cursor-pointer px-5 py-4 transition-colors hover:bg-[var(--bg-elevated)]"
                    key={activity.id}
                    onClick={() => setSelectedActivity(activity)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[var(--text-primary)] text-sm">
                            {activity.action}
                          </p>
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[11px]",
                              getEntityTypeColor(activity.entityType)
                            )}
                          >
                            {formatLabel(activity.entityType)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--text-muted)] text-xs">
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
                            })}
                            , {activityDate.toLocaleTimeString("en-US")}
                          </span>
                        </div>
                      </div>
                      <button
                        className="text-intent-accent text-xs transition-colors hover:text-intent-accent-strong"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-scrim)] p-4 backdrop-blur-sm"
          onClick={() => setSelectedActivity(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-[var(--border-color)] border-b bg-[var(--bg-elevated)] px-6 py-4">
              <h2 className="font-semibold text-[var(--text-primary)] text-xl">
                Activity Details
              </h2>
              <button
                className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
                onClick={() => setSelectedActivity(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ActivityIcon className="text-intent-accent" size={16} />
                  <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                    Action Information
                  </h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="mb-1 text-[var(--text-muted)] text-xs">
                      Action
                    </p>
                    <p className="font-medium text-[var(--text-primary)] text-sm">
                      {selectedActivity.action}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="mb-1 text-[var(--text-muted)] text-xs">
                        Entity Type
                      </p>
                      <span
                        className={cn(
                          "inline-block rounded-full border px-2 py-0.5 text-[11px]",
                          getEntityTypeColor(selectedActivity.entityType)
                        )}
                      >
                        {formatLabel(selectedActivity.entityType)}
                      </span>
                    </div>
                    <div>
                      <p className="mb-1 text-[var(--text-muted)] text-xs">
                        Entity ID
                      </p>
                      <p className="break-all font-mono text-[var(--text-secondary)] text-sm">
                        {selectedActivity.entityId}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedActivity.user ? (
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <User
                      className="text-blue-600 dark:text-blue-300"
                      size={16}
                    />
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                      User Information
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="mb-1 text-[var(--text-muted)] text-xs">
                          Name
                        </p>
                        <p className="text-[var(--text-primary)] text-sm">
                          {selectedActivity.user.name || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-[var(--text-muted)] text-xs">
                          Email
                        </p>
                        <p className="text-[var(--text-primary)] text-sm">
                          {selectedActivity.user.email}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="mb-1 text-[var(--text-muted)] text-xs">
                        Role
                      </p>
                      <span className="inline-block rounded-full border border-purple-400/35 bg-purple-500/10 px-2 py-0.5 text-[11px] text-purple-700 dark:text-purple-200">
                        {formatLabel(selectedActivity.user.role)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Network & Device Information */}
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Globe
                    className="text-green-600 dark:text-green-300"
                    size={16}
                  />
                  <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                    Network & Device
                  </h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="mb-1 text-[var(--text-muted)] text-xs">
                      IP Address
                    </p>
                    <p className="font-mono text-[var(--text-primary)] text-sm">
                      {formatIpAddress(selectedActivity.ipAddress)}
                    </p>
                  </div>
                  {selectedActivity.userAgent &&
                    (() => {
                      const info = parseUserAgent(selectedActivity.userAgent);
                      return (
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="mb-1 text-[var(--text-muted)] text-xs">
                              Operating System
                            </p>
                            <p className="text-[var(--text-primary)] text-sm">
                              {info.os}
                            </p>
                          </div>
                          <div>
                            <p className="mb-1 text-[var(--text-muted)] text-xs">
                              Browser
                            </p>
                            <p className="text-[var(--text-primary)] text-sm">
                              {info.browser}
                            </p>
                          </div>
                          <div>
                            <p className="mb-1 text-[var(--text-muted)] text-xs">
                              Device Type
                            </p>
                            <p className="text-[var(--text-primary)] text-sm">
                              {info.device}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  {selectedActivity.userAgent && (
                    <div>
                      <p className="mb-1 text-[var(--text-muted)] text-xs">
                        User Agent
                      </p>
                      <p className="break-all font-mono text-[var(--text-secondary)] text-xs">
                        {selectedActivity.userAgent}
                      </p>
                    </div>
                  )}
                  {!selectedActivity.userAgent && (
                    <p className="text-[var(--text-muted)] text-sm">
                      No user agent information available
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Calendar
                    className="text-yellow-600 dark:text-yellow-300"
                    size={16}
                  />
                  <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                    Timestamp
                  </h3>
                </div>
                <div>
                  <p className="mb-1 text-[var(--text-muted)] text-xs">
                    Date & Time
                  </p>
                  <p className="text-[var(--text-primary)] text-sm">
                    {new Date(selectedActivity.createdAt).toLocaleDateString(
                      "en-US",
                      {
                        month: "numeric",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                    ,{" "}
                    {new Date(selectedActivity.createdAt).toLocaleTimeString(
                      "en-US"
                    )}
                  </p>
                </div>
              </div>

              {selectedActivity.oldValue || selectedActivity.newValue ? (
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <FileText
                      className="text-orange-600 dark:text-orange-300"
                      size={16}
                    />
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                      Changes
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {selectedActivity.oldValue ? (
                      <div>
                        <p className="mb-1 text-[var(--text-muted)] text-xs">
                          Previous Value
                        </p>
                        <pre className="overflow-x-auto rounded-lg bg-[var(--code-block-bg)] p-3 text-[var(--text-secondary)] text-xs">
                          {JSON.stringify(selectedActivity.oldValue, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                    {selectedActivity.newValue ? (
                      <div>
                        <p className="mb-1 text-[var(--text-muted)] text-xs">
                          New Value
                        </p>
                        <pre className="overflow-x-auto rounded-lg bg-[var(--code-block-bg)] p-3 text-[var(--text-secondary)] text-xs">
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
