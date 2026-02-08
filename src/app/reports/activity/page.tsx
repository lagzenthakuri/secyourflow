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
    Download,
    RefreshCw,
    Clock,
    MapPin,
    Monitor,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Info,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getTimeAgo } from "@/lib/utils";

interface ActivityLog {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    user: {
        name: string | null;
        email: string;
        role: string;
    };
}

export default function ActivityLogPage() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [filter, setFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

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
                setTotal(data.pagination.total);
                setLastRefresh(new Date());
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

    const getRiskBadge = (action: string) => {
        const highRisk = ["delete", "remove", "disable", "failed"];
        const mediumRisk = ["update", "modify", "change"];
        const lowRisk = ["view", "read", "list"];

        const actionLower = action.toLowerCase();
        
        if (highRisk.some(risk => actionLower.includes(risk))) {
            return <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-500/10 text-red-400 border border-red-500/20">HIGH</span>;
        }
        if (mediumRisk.some(risk => actionLower.includes(risk))) {
            return <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">MED</span>;
        }
        if (lowRisk.some(risk => actionLower.includes(risk))) {
            return <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-green-500/10 text-green-400 border border-green-500/20">LOW</span>;
        }
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">INFO</span>;
    };

    const formatUTCTime = (date: string) => {
        const d = new Date(date);
        return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    };

    const parseUserAgent = (ua: string | null) => {
        if (!ua || ua === 'System') return { browser: 'System', os: 'N/A', device: 'Server' };
        
        const browser = ua.includes('Chrome') ? 'Chrome' : 
                       ua.includes('Firefox') ? 'Firefox' : 
                       ua.includes('Safari') ? 'Safari' : 
                       ua.includes('Edge') ? 'Edge' : 'Unknown';
        
        const os = ua.includes('Windows') ? 'Windows' : 
                  ua.includes('Mac') ? 'macOS' : 
                  ua.includes('Linux') ? 'Linux' : 
                  ua.includes('Android') ? 'Android' : 
                  ua.includes('iOS') ? 'iOS' : 'Unknown';
        
        const device = ua.includes('Mobile') ? 'Mobile' : 'Desktop';
        
        return { browser, os, device };
    };

    const exportToCSV = () => {
        const headers = ['Timestamp (UTC)', 'Type', 'Action', 'Risk', 'User', 'Role', 'IP Address', 'Browser', 'OS', 'Entity ID'];
        const rows = logs.map(log => {
            const ua = parseUserAgent(log.userAgent);
            return [
                formatUTCTime(log.createdAt),
                log.entityType,
                log.action,
                getRiskLevel(log.action),
                log.user?.name || log.user?.email || 'System',
                log.user?.role || 'N/A',
                log.ipAddress || 'N/A',
                ua.browser,
                ua.os,
                log.entityId
            ];
        });

        const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const getRiskLevel = (action: string): string => {
        const highRisk = ["delete", "remove", "disable", "failed"];
        const mediumRisk = ["update", "modify", "change"];
        const lowRisk = ["view", "read", "list"];
        const actionLower = action.toLowerCase();
        
        if (highRisk.some(risk => actionLower.includes(risk))) return 'HIGH';
        if (mediumRisk.some(risk => actionLower.includes(risk))) return 'MEDIUM';
        if (lowRisk.some(risk => actionLower.includes(risk))) return 'LOW';
        return 'INFO';
    };

    const filteredLogs = logs.filter(log => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            log.action.toLowerCase().includes(search) ||
            log.entityType.toLowerCase().includes(search) ||
            log.entityId.toLowerCase().includes(search) ||
            log.user?.name?.toLowerCase().includes(search) ||
            log.user?.email?.toLowerCase().includes(search) ||
            log.ipAddress?.toLowerCase().includes(search)
        );
    });

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div>
                        <h1 className="text-2xl font-bold text-white">SOC Activity Monitor</h1>
                        <p className="text-[var(--text-secondary)] mt-1 flex items-center gap-2">
                            <Clock size={14} className="animate-in spin-in-180 duration-700" />
                            Real-time audit trail with forensic details
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchLogs}
                            className="group relative px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-blue-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/10"
                            disabled={isLoading}
                        >
                            <div className="flex items-center gap-2">
                                <RefreshCw 
                                    size={16} 
                                    className={`transition-all duration-200 ${isLoading ? 'animate-spin text-blue-400' : 'text-[var(--text-secondary)] group-hover:text-blue-400 group-hover:rotate-180'}`} 
                                />
                                <span className="text-sm text-[var(--text-secondary)] group-hover:text-white transition-colors">
                                    Refresh
                                </span>
                            </div>
                        </button>
                        <button
                            onClick={exportToCSV}
                            className="group relative px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-green-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-green-500/10"
                        >
                            <div className="flex items-center gap-2">
                                <Download 
                                    size={16} 
                                    className="text-[var(--text-secondary)] group-hover:text-green-400 transition-all duration-200 group-hover:translate-y-0.5" 
                                />
                                <span className="text-sm text-[var(--text-secondary)] group-hover:text-white transition-colors">
                                    Export
                                </span>
                            </div>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: '100ms' }}>
                        <Card className="transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[var(--text-muted)] text-xs transition-colors duration-200">Total Events</p>
                                    <p className="text-2xl font-bold text-white mt-1 transition-all duration-300">{total}</p>
                                </div>
                                <Activity className="text-blue-400 transition-transform duration-300 group-hover:scale-110" size={24} />
                            </div>
                        </Card>
                    </div>
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: '200ms' }}>
                        <Card className="transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-green-500/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[var(--text-muted)] text-xs transition-colors duration-200">Last Refresh</p>
                                    <p className="text-sm font-medium text-white mt-1 transition-all duration-300">{getTimeAgo(lastRefresh)}</p>
                                </div>
                                <RefreshCw className="text-green-400 transition-transform duration-300 group-hover:rotate-180" size={24} />
                            </div>
                        </Card>
                    </div>
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: '300ms' }}>
                        <Card className="transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[var(--text-muted)] text-xs transition-colors duration-200">Current Page</p>
                                    <p className="text-2xl font-bold text-white mt-1 transition-all duration-300">{page}/{totalPages}</p>
                                </div>
                                <FileText className="text-purple-400 transition-transform duration-300 group-hover:scale-110" size={24} />
                            </div>
                        </Card>
                    </div>
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: '400ms' }}>
                        <Card className="transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[var(--text-muted)] text-xs transition-colors duration-200">Filter Active</p>
                                    <p className="text-sm font-medium text-white mt-1 capitalize transition-all duration-300">{filter}</p>
                                </div>
                                <Filter className="text-orange-400 transition-transform duration-300 group-hover:scale-110" size={24} />
                            </div>
                        </Card>
                    </div>
                </div>

                <Card noPadding>
                    <div className="p-4 border-b border-[var(--border-color)] flex flex-col md:flex-row gap-3 animate-in fade-in slide-in-from-top-2 duration-500" style={{ animationDelay: '500ms' }}>
                        <div className="relative flex-1 group">
                            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-all duration-200 group-focus-within:text-blue-400 group-focus-within:scale-110" size={20} />
                            <input
                                type="text"
                                placeholder="Search activities, users, IP addresses..."
                                className="input w-full text-sm transition-all duration-200 !pl-[52px] !pr-4 !py-2.5 focus:ring-2 focus:ring-blue-500/20 placeholder:text-[var(--text-muted)]"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <select
                                className="input py-2.5 pl-3 pr-8 text-sm bg-[var(--bg-tertiary)] w-full md:w-auto appearance-none cursor-pointer transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 hover:border-blue-500/30 hover:bg-[var(--bg-elevated)]"
                                value={filter}
                                onChange={(e) => {
                                    setFilter(e.target.value);
                                    setPage(1);
                                }}
                                style={{ minWidth: '160px' }}
                            >
                                <option value="all">All Activities</option>
                                <option value="auth">Authentication</option>
                                <option value="user">User Management</option>
                                <option value="vulnerability">Vulnerabilities</option>
                                <option value="asset">Assets</option>
                                <option value="settings">Settings</option>
                                <option value="compliance">Compliance</option>
                                <option value="scan">Scans</option>
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none transition-transform duration-200" size={14} />
                        </div>
                    </div>

                    <div className="overflow-x-auto animate-in fade-in duration-700" style={{ animationDelay: '600ms' }}>
                        <table className="w-full">
                            <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-color)]">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider transition-colors duration-200 hover:text-white">
                                        Risk
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider transition-colors duration-200 hover:text-white">
                                        Type
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider transition-colors duration-200 hover:text-white">
                                        Action
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider transition-colors duration-200 hover:text-white">
                                        User / Role
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider transition-colors duration-200 hover:text-white">
                                        Source IP
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider transition-colors duration-200 hover:text-white">
                                        Timestamp (UTC)
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider transition-colors duration-200 hover:text-white">
                                        Details
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <RefreshCw className="animate-spin text-blue-400" size={32} />
                                                <p className="text-[var(--text-muted)]">Loading activity logs...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Info className="text-[var(--text-muted)]" size={32} />
                                                <p className="text-[var(--text-muted)]">No activity logs found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log, index) => {
                                        const ua = parseUserAgent(log.userAgent);
                                        const isExpanded = expandedRow === log.id;
                                        
                                        return (
                                            <>
                                                <tr 
                                                    key={log.id} 
                                                    className="hover:bg-[var(--bg-tertiary)] transition-all duration-200 cursor-pointer animate-in fade-in slide-in-from-bottom-2"
                                                    style={{ animationDelay: `${index * 30}ms` }}
                                                    onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                                                >
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        {getRiskBadge(log.action)}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 rounded-lg bg-[var(--bg-elevated)] transition-transform duration-200 hover:scale-110">
                                                                {getIcon(log.entityType)}
                                                            </div>
                                                            <span className="text-xs font-medium text-white capitalize">
                                                                {log.entityType}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-xs text-[var(--text-secondary)] font-mono">
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold shadow-lg">
                                                                    {(log.user?.name || log.user?.email)?.[0]?.toUpperCase() || 'S'}
                                                                </div>
                                                                <span className="text-xs text-[var(--text-secondary)] font-medium">
                                                                    {log.user?.name || log.user?.email || 'System'}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-[var(--text-muted)] ml-8">
                                                                {log.user?.role || 'SYSTEM'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="flex items-center gap-1.5">
                                                            <MapPin size={12} className="text-[var(--text-muted)]" />
                                                            <span className="text-xs font-mono text-[var(--text-secondary)]">
                                                                {log.ipAddress || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="flex items-center gap-1.5 text-xs text-white font-mono">
                                                                <Clock size={12} className="text-blue-400" />
                                                                {formatUTCTime(log.createdAt)}
                                                            </div>
                                                            <span className="text-[10px] text-[var(--text-muted)] ml-5">
                                                                {getTimeAgo(new Date(log.createdAt))}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button 
                                                            className="group/btn relative text-xs text-blue-400 hover:text-blue-300 transition-all duration-200 px-3 py-1 rounded hover:bg-blue-500/10"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedRow(isExpanded ? null : log.id);
                                                            }}
                                                        >
                                                            <span className="flex items-center gap-1">
                                                                {isExpanded ? 'Hide' : 'Show'}
                                                                <ChevronRight 
                                                                    size={12} 
                                                                    className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : 'rotate-0'} group-hover/btn:translate-x-0.5`}
                                                                />
                                                            </span>
                                                        </button>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr key={`${log.id}-details`} className="bg-[var(--bg-elevated)] border-t border-b border-[var(--border-color)]">
                                                        <td colSpan={7} className="px-4 py-0 overflow-hidden">
                                                            <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                                                                <div className="py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                                                                    <div className="animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: '50ms' }}>
                                                                        <p className="text-[var(--text-muted)] mb-1">Entity ID</p>
                                                                        <p className="text-white font-mono bg-[var(--bg-tertiary)] px-2 py-1 rounded transition-all duration-200 hover:bg-[var(--bg-secondary)]">{log.entityId}</p>
                                                                    </div>
                                                                    <div className="animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: '100ms' }}>
                                                                        <p className="text-[var(--text-muted)] mb-1">Browser</p>
                                                                        <div className="flex items-center gap-2">
                                                                            <Monitor size={14} className="text-blue-400 transition-transform duration-200 hover:scale-110" />
                                                                            <p className="text-white">{ua.browser}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: '150ms' }}>
                                                                        <p className="text-[var(--text-muted)] mb-1">Operating System</p>
                                                                        <p className="text-white">{ua.os}</p>
                                                                    </div>
                                                                    <div className="animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: '200ms' }}>
                                                                        <p className="text-[var(--text-muted)] mb-1">Device Type</p>
                                                                        <p className="text-white">{ua.device}</p>
                                                                    </div>
                                                                    <div className="animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: '250ms' }}>
                                                                        <p className="text-[var(--text-muted)] mb-1">Full User Agent</p>
                                                                        <p className="text-white font-mono text-[10px] break-all bg-[var(--bg-tertiary)] px-2 py-1 rounded transition-all duration-200 hover:bg-[var(--bg-secondary)]">{log.userAgent || 'N/A'}</p>
                                                                    </div>
                                                                    <div className="animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: '300ms' }}>
                                                                        <p className="text-[var(--text-muted)] mb-1">Event ID</p>
                                                                        <p className="text-white font-mono text-[10px] bg-[var(--bg-tertiary)] px-2 py-1 rounded transition-all duration-200 hover:bg-[var(--bg-secondary)]">{log.id}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="p-4 border-t border-[var(--border-color)] flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110 disabled:hover:scale-100 hover:shadow-lg hover:shadow-blue-500/10"
                            >
                                <ChevronLeft size={16} className="transition-transform duration-200" />
                            </button>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-[var(--text-muted)] transition-colors duration-200 hover:text-white">
                                    Page {page} of {totalPages}
                                </span>
                                <span className="text-xs text-[var(--text-muted)] transition-colors duration-200 hover:text-white">
                                    ({total} total events)
                                </span>
                            </div>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110 disabled:hover:scale-100 hover:shadow-lg hover:shadow-blue-500/10"
                            >
                                <ChevronRight size={16} className="transition-transform duration-200" />
                            </button>
                        </div>
                    )}
                </Card>
            </div>
        </DashboardLayout>
    );
}
