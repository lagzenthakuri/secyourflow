"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Cards";
import {
    Users,
    Plus,
    Search,
    MoreVertical,
    Shield,
    Mail,
    Calendar,
    ChevronDown
} from "lucide-react";
import { cn, getTimeAgo } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldLoader } from "@/components/ui/ShieldLoader";

const roleColors = {
    MAIN_OFFICER: "#ef4444",
    IT_OFFICER: "#8b5cf6",
    ANALYST: "#3b82f6",
    PENTESTER: "#f97316",
};

export default function UsersPage() {
    const { data: session, status } = useSession();
    const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: string; lastActive: string; status: string; department?: string }>>([]);
    const [logs, setLogs] = useState<Array<{ id: string; action: string; createdAt: string | Date; user?: { name?: string }; [key: string]: unknown }>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const router = useRouter();

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [usersRes, logsRes] = await Promise.all([
                fetch("/api/users"),
                fetch("/api/activity?limit=5")
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
    };

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
        } else if (status === "authenticated" && session?.user?.role !== "MAIN_OFFICER") {
            router.push("/dashboard");
        } else if (status === "authenticated") {
            fetchData();
        }
    }, [session, status, router]);

    if (status === "loading" || isLoading || (status === "authenticated" && session?.user?.role !== "MAIN_OFFICER")) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <ShieldLoader size="lg" variant="cyber" />
                </div>
            </DashboardLayout>
        );
    }
    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Users & Access</h1>
                        <p className="text-[var(--text-secondary)] mt-1">
                            Manage user accounts and role-based access control
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="btn btn-primary">
                            <Plus size={16} />
                            Invite User
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="card p-4">
                        <p className="text-2xl font-bold text-white">{users.length}</p>
                        <p className="text-xs text-[var(--text-muted)]">Total Users</p>
                    </div>
                    <div className="card p-4">
                        <p className="text-2xl font-bold text-green-400">
                            {users.filter((u) => u.status === "online").length}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">Online Now</p>
                    </div>
                    <div className="card p-4">
                        <p className="text-2xl font-bold text-purple-400">
                            {users.filter((u) => u.role === "MAIN_OFFICER").length}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">Main Officers</p>
                    </div>
                    <div className="card p-4">
                        <p className="text-2xl font-bold text-blue-400">{Object.keys(roleColors).length}</p>
                        <p className="text-xs text-[var(--text-muted)]">Roles Defined</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* User List */}
                    <div className="lg:col-span-8">
                        <Card noPadding>
                            <div className="p-4 border-b border-[var(--border-color)]">
                                <div className="relative">
                                    <Search
                                        size={16}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search users..."
                                        className="input pl-9 py-2 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="divide-y divide-[var(--border-color)]">
                                {users.map((user) => (
                                    <div
                                        key={user.id}
                                        className="p-4 hover:bg-[var(--bg-tertiary)] transition-all duration-300 ease-in-out"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                                                    {user.name
                                                        .split(" ")
                                                        .map((n: string) => n[0])
                                                        .join("")}
                                                </div>
                                                <div
                                                    className={cn(
                                                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg-card)]",
                                                        user.status === "online"
                                                            ? "bg-green-400"
                                                            : user.status === "away"
                                                                ? "bg-yellow-400"
                                                                : "bg-gray-500"
                                                    )}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h3 className="font-medium text-white">{user.name}</h3>
                                                    {editingUser === user.id ? (
                                                        <select
                                                            value={user.role}
                                                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                            onBlur={() => setEditingUser(null)}
                                                            autoFocus
                                                            className="text-xs bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded px-1 py-0.5 text-white"
                                                        >
                                                            {Object.keys(roleColors).map(role => (
                                                                <option key={role} value={role}>{role}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span
                                                            className="px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer hover:underline"
                                                            onClick={() => setEditingUser(user.id)}
                                                            title="Click to edit role"
                                                            style={{
                                                                background: `${roleColors[user.role as keyof typeof roleColors]}15`,
                                                                color: roleColors[user.role as keyof typeof roleColors],
                                                            }}
                                                        >
                                                            {user.role}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                                                    <span className="flex items-center gap-1">
                                                        <Mail size={10} />
                                                        {user.email}
                                                    </span>
                                                    <span>{user.department}</span>
                                                </div>
                                            </div>
                                            <div className="text-right hidden md:block">
                                                <p className="text-xs text-[var(--text-muted)]">Last active</p>
                                                <p className="text-sm text-[var(--text-secondary)]">
                                                    {user.lastActive}
                                                </p>
                                            </div>
                                            <button className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                                                <MoreVertical size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-4">
                        <Card title="Role Permissions">
                            <div className="space-y-3">
                                {[
                                    { role: "Main Officer", permissions: "Full platform oversight and administration" },
                                    { role: "IT Officer", permissions: "Asset and infrastructure management" },
                                    { role: "Pentester", permissions: "Vulnerability assessment and security testing" },
                                    { role: "Analyst", permissions: "Risk analysis and threat monitoring" },
                                ].map((item) => (
                                    <div
                                        key={item.role}
                                        className="p-3 rounded-lg bg-[var(--bg-tertiary)]"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Shield size={14} className="text-blue-400" />
                                            <span className="text-sm font-medium text-white">
                                                {item.role}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            {item.permissions}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card
                            title="Activity Log"
                            action={
                                <Link href="/reports/activity" className="text-xs text-blue-400 hover:text-blue-300">
                                    See all
                                </Link>
                            }
                        >
                            <div className="space-y-3">
                                {logs.length === 0 ? (
                                    <p className="text-xs text-[var(--text-muted)] text-center py-4">No recent activity</p>
                                ) : (
                                    logs.map((log) => (
                                        <div
                                            key={log.id}
                                            className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-tertiary)]"
                                        >
                                            <div className="min-w-0 flex-1 mr-2">
                                                <p className="text-sm text-[var(--text-secondary)] truncate" title={log.action}>
                                                    {log.action}
                                                </p>
                                                <p className="text-xs text-[var(--text-muted)] truncate">{log.user?.name || 'System'}</p>
                                            </div>
                                            <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
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
