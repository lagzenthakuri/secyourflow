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
    ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const users = [
    {
        id: "1",
        name: "Sarah Chen",
        email: "sarah.chen@company.com",
        role: "MAIN_OFFICER",
        department: "Security",
        lastActive: "2 minutes ago",
        status: "online",
    },
    {
        id: "2",
        name: "Mike Johnson",
        email: "mike.j@company.com",
        role: "ANALYST",
        department: "IT Operations",
        lastActive: "15 minutes ago",
        status: "online",
    },
    {
        id: "3",
        name: "Lisa Park",
        email: "lisa.park@company.com",
        role: "IT_OFFICER",
        department: "Compliance",
        lastActive: "1 hour ago",
        status: "away",
    },
    {
        id: "4",
        name: "James Wilson",
        email: "j.wilson@company.com",
        role: "PENTESTER",
        department: "Security",
        lastActive: "3 hours ago",
        status: "offline",
    },
    {
        id: "5",
        name: "Emma Davis",
        email: "emma.d@company.com",
        role: "ANALYST",
        department: "Executive",
        lastActive: "1 day ago",
        status: "offline",
    },
];

const roleColors = {
    MAIN_OFFICER: "#ef4444",
    IT_OFFICER: "#8b5cf6",
    ANALYST: "#3b82f6",
    PENTESTER: "#f97316",
};

export default function UsersPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        } else if (status === "authenticated" && session?.user?.role !== "MAIN_OFFICER") {
            router.push("/dashboard");
        }
    }, [session, status, router]);

    if (status === "loading" || (status === "authenticated" && session?.user?.role !== "MAIN_OFFICER")) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
                            {users.filter((u) => u.role === "ADMIN").length}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">Admins</p>
                    </div>
                    <div className="card p-4">
                        <p className="text-2xl font-bold text-blue-400">4</p>
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
                                        className="p-4 hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                                                    {user.name
                                                        .split(" ")
                                                        .map((n) => n[0])
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
                                                    <span
                                                        className="px-2 py-0.5 rounded text-[10px] font-medium"
                                                        style={{
                                                            background: `${roleColors[user.role as keyof typeof roleColors]}15`,
                                                            color: roleColors[user.role as keyof typeof roleColors],
                                                        }}
                                                    >
                                                        {user.role}
                                                    </span>
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

                        <Card title="Activity Log">
                            <div className="space-y-3">
                                {[
                                    { action: "User login", user: "Sarah Chen", time: "2 min ago" },
                                    { action: "Role updated", user: "Mike Johnson", time: "1 hour ago" },
                                    { action: "User invited", user: "New User", time: "3 hours ago" },
                                ].map((log, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-tertiary)]"
                                    >
                                        <div>
                                            <p className="text-sm text-[var(--text-secondary)]">
                                                {log.action}
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)]">{log.user}</p>
                                        </div>
                                        <span className="text-xs text-[var(--text-muted)]">{log.time}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
