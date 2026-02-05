"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Cards";
import {
    Activity,
    Search,
    Filter,
    Calendar,
    ChevronLeft,
    ChevronRight,
    User,
    Shield,
    Server,
    FileText,
    Settings,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getTimeAgo } from "@/lib/utils";

export default function ActivityLogPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filter, setFilter] = useState("all");

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
            });
            if (filter !== "all") {
                params.append("entityType", filter);
            }

            const res = await fetch(`/api/activity?${params}`);
            const data = await res.json();

            if (data.logs) {
                setLogs(data.logs);
                setTotalPages(data.pagination.pages);
            }
        } catch (error) {
            console.error("Failed to fetch logs", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, filter]);

    const getIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case "auth": return <User size={16} className="text-blue-400" />;
            case "vulnerability": return <Shield size={16} className="text-red-400" />;
            case "asset": return <Server size={16} className="text-orange-400" />;
            case "report": return <FileText size={16} className="text-green-400" />;
            case "settings": return <Settings size={16} className="text-gray-400" />;
            default: return <Activity size={16} className="text-purple-400" />;
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Activity Logs</h1>
                        <p className="text-[var(--text-secondary)] mt-1">
                            Comprehensive audit trail of system activities
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            className="input py-2 px-3 text-sm bg-[var(--bg-tertiary)]"
                            value={filter}
                            onChange={(e) => {
                                setFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="all">All Activities</option>
                            <option value="auth">Authentication</option>
                            <option value="user">User Management</option>
                            <option value="vulnerability">Vulnerabilities</option>
                            <option value="asset">Assets</option>
                            <option value="settings">Settings</option>
                        </select>
                    </div>
                </div>

                <Card noPadding>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)]">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                        Action
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                        Details
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                        Time
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-[var(--text-muted)]">
                                            Loading activities...
                                        </td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-[var(--text-muted)]">
                                            No activity logs found
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-[var(--bg-tertiary)] transition-all duration-300 ease-in-out">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-lg bg-[var(--bg-elevated)]">
                                                        {getIcon(log.entityType)}
                                                    </div>
                                                    <span className="text-sm font-medium text-white capitalize">
                                                        {log.entityType}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-[var(--text-secondary)]">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] text-white">
                                                        {log.user?.name?.[0] || 'S'}
                                                    </div>
                                                    <span className="text-sm text-[var(--text-secondary)]">
                                                        {log.user?.name || 'System'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-[var(--text-muted)] line-clamp-1">
                                                    {log.entityId} {log.userAgent !== 'System' ? `- ${log.userAgent}` : ''}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-1 text-xs text-[var(--text-muted)]">
                                                    <Calendar size={12} />
                                                    {getTimeAgo(new Date(log.createdAt))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-[var(--border-color)] flex items-center justify-between">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-sm text-[var(--text-muted)]">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </Card>
            </div>
        </DashboardLayout>
    );
}
