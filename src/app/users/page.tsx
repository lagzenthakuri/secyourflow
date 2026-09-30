"use client";
import { Input as BoilerplateInput } from "@repo/design-system/components/ui/input";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Mail, MoreVertical, Plus, Search, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Cards";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { cn, getTimeAgo } from "@/lib/utils";

const roleColors = {
  MAIN_OFFICER: "#ef4444",
  IT_OFFICER: "#8b5cf6",
  ANALYST: "#3b82f6",
  PENTESTER: "#f97316",
};

export default function UsersPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      lastActive: string;
      status: string;
      department?: string;
    }>
  >([]);
  const [logs, setLogs] = useState<
    Array<{
      id: string;
      action: string;
      createdAt: string | Date;
      user?: { name?: string };
      [key: string]: unknown;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [usersRes, logsRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/activity?limit=5"),
      ]);

      const usersData = await usersRes.json();
      const logsData = await logsRes.json();

      if (Array.isArray(usersData)) {
        setUsers(usersData);
      }
      if (logsData.logs) {
        setLogs(logsData.logs);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (response.ok) {
        setEditingUser(null);
        fetchData(); // Refresh data to show new role and log
      }
    } catch (error) {
      console.error("Failed to update role:", error);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (
      status === "authenticated" &&
      session?.user?.role !== "MAIN_OFFICER"
    ) {
      router.push("/dashboard");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [session, status, router, fetchData]);

  if (
    status === "loading" ||
    isLoading ||
    (status === "authenticated" && session?.user?.role !== "MAIN_OFFICER")
  ) {
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="font-bold text-2xl text-[var(--text-primary)]">
              Users & Access
            </h1>
            <p className="mt-1 text-[var(--text-secondary)]">
              Manage user accounts and role-based access control
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" type="button">
              <Plus size={16} />
              Invite User
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="card p-4">
            <p className="font-bold text-2xl text-[var(--text-primary)]">
              {users.length}
            </p>
            <p className="text-[var(--text-muted)] text-xs">Total Users</p>
          </div>
          <div className="card p-4">
            <p className="font-bold text-2xl text-green-600 dark:text-green-400">
              {users.filter((u) => u.status === "online").length}
            </p>
            <p className="text-[var(--text-muted)] text-xs">Online Now</p>
          </div>
          <div className="card p-4">
            <p className="font-bold text-2xl text-purple-600 dark:text-purple-400">
              {users.filter((u) => u.role === "MAIN_OFFICER").length}
            </p>
            <p className="text-[var(--text-muted)] text-xs">Main Officers</p>
          </div>
          <div className="card p-4">
            <p className="font-bold text-2xl text-intent-accent">
              {Object.keys(roleColors).length}
            </p>
            <p className="text-[var(--text-muted)] text-xs">Roles Defined</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* User List */}
          <div className="lg:col-span-8">
            <Card noPadding>
              <div className="border-[var(--border-color)] border-b p-4">
                <div className="relative">
                  <Search
                    className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-muted)]"
                    size={16}
                  />
                  <BoilerplateInput
                    className="py-2 pl-9 text-sm"
                    placeholder="Search users..."
                    type="text"
                  />
                </div>
              </div>

              <div className="divide-y divide-[var(--border-color)]">
                {users.map((user) => (
                  <div
                    className="p-4 transition-all duration-300 ease-in-out hover:bg-[var(--bg-tertiary)]"
                    key={user.id}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/50 bg-blue-600 font-medium text-[var(--text-primary)]">
                          {user.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")}
                        </div>
                        <div
                          className={cn(
                            "absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-[var(--bg-card)]",
                            { online: "bg-green-400", away: "bg-yellow-400" }[
                              user.status
                            ] ?? "bg-gray-500"
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-2">
                          <h3 className="font-medium text-[var(--text-primary)]">
                            {user.name}
                          </h3>
                          {editingUser === user.id ? (
                            <Select
                              onValueChange={(e) =>
                                handleRoleChange(user.id, e)
                              }
                              value={user.role}
                            >
                              <SelectTrigger
                                autoFocus
                                className="w-full"
                                onBlur={() => setEditingUser(null)}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {Object.keys(roleColors).map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {role}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          ) : (
                            <button
                              className="cursor-pointer rounded px-2 py-0.5 font-medium text-[10px] hover:underline"
                              onClick={() => setEditingUser(user.id)}
                              style={{
                                background: `${roleColors[user.role as keyof typeof roleColors]}15`,
                                color:
                                  roleColors[
                                    user.role as keyof typeof roleColors
                                  ],
                              }}
                              title="Click to edit role"
                              type="button"
                            >
                              {user.role}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[var(--text-muted)] text-xs">
                          <span className="flex items-center gap-1">
                            <Mail size={10} />
                            {user.email}
                          </span>
                          <span>{user.department}</span>
                        </div>
                      </div>
                      <div className="hidden text-right md:block">
                        <p className="text-[var(--text-muted)] text-xs">
                          Last active
                        </p>
                        <p className="text-[var(--text-secondary)] text-sm">
                          {user.lastActive}
                        </p>
                      </div>
                      <button
                        className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                        type="button"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 lg:col-span-4">
            <Card title="Role Permissions">
              <div className="space-y-3">
                {[
                  {
                    role: "Main Officer",
                    permissions: "Full platform oversight and administration",
                  },
                  {
                    role: "IT Officer",
                    permissions: "Asset and infrastructure management",
                  },
                  {
                    role: "Pentester",
                    permissions:
                      "Vulnerability assessment and security testing",
                  },
                  {
                    role: "Analyst",
                    permissions: "Risk analysis and threat monitoring",
                  },
                ].map((item) => (
                  <div
                    className="rounded-lg bg-[var(--bg-tertiary)] p-3"
                    key={item.role}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <Shield className="text-intent-accent" size={14} />
                      <span className="font-medium text-[var(--text-primary)] text-sm">
                        {item.role}
                      </span>
                    </div>
                    <p className="text-[var(--text-muted)] text-xs">
                      {item.permissions}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card
              action={
                <Link
                  className="text-intent-accent text-xs hover:text-intent-accent-strong"
                  href="/reports/activity"
                >
                  See all
                </Link>
              }
              title="Activity Log"
            >
              <div className="space-y-3">
                {logs.length === 0 ? (
                  <p className="py-4 text-center text-[var(--text-muted)] text-xs">
                    No recent activity
                  </p>
                ) : (
                  logs.map((log) => (
                    <div
                      className="flex items-center justify-between rounded-lg p-2 hover:bg-[var(--bg-tertiary)]"
                      key={log.id}
                    >
                      <div className="mr-2 min-w-0 flex-1">
                        <p
                          className="truncate text-[var(--text-secondary)] text-sm"
                          title={log.action}
                        >
                          {log.action}
                        </p>
                        <p className="truncate text-[var(--text-muted)] text-xs">
                          {log.user?.name || "System"}
                        </p>
                      </div>
                      <span className="whitespace-nowrap text-[var(--text-muted)] text-xs">
                        {getTimeAgo(new Date(log.createdAt))}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
