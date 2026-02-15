"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Server,
    Shield,
    AlertTriangle,
    FileCheck,
    BarChart3,
    Settings,
    Users,
    Scan,
    Bell,
    Search,
    Menu,
    ChevronDown,
    LogOut,
    ClipboardList,
    Database,
    Sun,
    Moon,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useLoginAudit } from "@/hooks/useLoginAudit";
import {
    markAllNotificationsRead,
    markNotificationRead,
    normalizeNotificationsResponse,
    type NotificationItem,
    type NotificationsResponse,
} from "@/lib/notification-state";
import { useTheme } from "@/components/providers/ThemeProvider";

const ALL_ROLES = ["MAIN_OFFICER", "IT_OFFICER", "PENTESTER", "ANALYST"];

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ALL_ROLES },
    { name: "Assets", href: "/assets", icon: Server, roles: ALL_ROLES },
    { name: "Vulnerabilities", href: "/vulnerabilities", icon: Shield, roles: ALL_ROLES },
    { name: "Threats", href: "/threats", icon: AlertTriangle, roles: ALL_ROLES },
    { name: "Risk Register", href: "/risk-register", icon: ClipboardList, roles: ALL_ROLES },
    { name: "Compliance", href: "/compliance", icon: FileCheck, roles: ALL_ROLES },
    { name: "Reports", href: "/reports", icon: BarChart3, roles: ALL_ROLES },
    { name: "Scanners", href: "/scanners", icon: Scan, roles: ALL_ROLES },
    { name: "CVE Search", href: "/cves", icon: Database, roles: ALL_ROLES },
];

const secondaryNav = [
    { name: "Users", href: "/users", icon: Users, roles: ["MAIN_OFFICER"] },
    { name: "Settings", href: "/settings", icon: Settings, roles: ["MAIN_OFFICER", "IT_OFFICER", "PENTESTER", "ANALYST"] },
];

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [showSignOut, setShowSignOut] = useState(false);

    const userRole = session?.user?.role || "ANALYST";
    const userName = session?.user?.name || "User";
    const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const filteredNav = navigation.filter(item => item.roles.includes(userRole));
    const filteredSecondaryNav = secondaryNav.filter(item => item.roles.includes(userRole));

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300 ease-in-out"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "sidebar fixed top-0 left-0 bottom-0 z-[70] flex flex-col transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Logo Section */}
                <div className="px-8 py-10">
                    <Link href="/dashboard" className="flex items-center gap-4 group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                            <Image
                                src="/logo1.png"
                                alt="SecYourFlow"
                                width={48}
                                height={48}
                                className="relative z-10 drop-shadow-2xl"
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[18px] font-black tracking-[0.15em] text-white leading-tight">
                                SECYOUR
                            </span>
                            <span className="text-[14px] font-medium tracking-[0.4em] text-blue-400">
                                FLOW
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto custom-scrollbar">
                    {/* Main Menu */}
                    <div>
                        <div className="px-5 mb-4">
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                Intelligence
                            </span>
                        </div>
                        <div className="space-y-1">
                            {filteredNav.map((item) => {
                                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn("sidebar-link", isActive && "active")}
                                        onClick={() => {
                                            if (window.innerWidth < 1024) setIsOpen(false);
                                        }}
                                    >
                                        <item.icon size={20} className={cn("transition-colors", isActive ? "text-blue-400" : "text-[var(--text-muted)]")} />
                                        <span className="font-semibold">{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Administration */}
                    <div>
                        <div className="px-5 mb-4">
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                Control Center
                            </span>
                        </div>
                        <div className="space-y-1">
                            {filteredSecondaryNav.map((item) => {
                                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn("sidebar-link", isActive && "active")}
                                        onClick={() => {
                                            if (window.innerWidth < 1024) setIsOpen(false);
                                        }}
                                    >
                                        <item.icon size={20} className={cn("transition-colors", isActive ? "text-blue-400" : "text-[var(--text-muted)]")} />
                                        <span className="font-semibold">{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </nav>

                {/* User Section Redesigned */}
                <div className="p-6 mt-auto">
                    <div className="relative">
                        <button
                            onClick={() => setShowSignOut(!showSignOut)}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-tertiary)]/50 backdrop-blur-md border border-[var(--border-color)] hover:border-blue-500/30 transition-all group"
                        >
                            <div className="relative shrink-0">
                                <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-lg group-hover:bg-blue-500/30 transition-all" />
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white text-base font-bold relative z-10 shadow-lg border border-white/10">
                                    {userInitials}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-bold text-white truncate leading-tight mb-0.5">
                                    {userName}
                                </p>
                                <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
                                    {userRole.replace('_', ' ')}
                                </p>
                            </div>
                            <ChevronDown size={16} className={cn("text-[var(--text-muted)] transition-transform duration-300", showSignOut && "rotate-180")} />
                        </button>

                        {showSignOut && (
                            <div className="absolute bottom-full left-0 w-full mb-3 z-[80] animate-fade-in">
                                <div className="bg-[var(--bg-elevated)] backdrop-blur-xl border border-[var(--border-color)] rounded-2xl shadow-2xl p-2 overflow-hidden">
                                    <button
                                        onClick={() => signOut({ callbackUrl: "/" })}
                                        className="w-full flex items-center gap-3 p-3 text-sm font-bold text-red-400 rounded-xl hover:bg-red-500/10 transition-colors"
                                    >
                                        <LogOut size={18} />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}

interface TopBarProps {
    onToggleSidebar: () => void;
}

interface ThreatsResponse {
    stats?: {
        activeThreatsCount?: number;
    };
}

function getApiErrorMessage(payload: unknown): string | null {
    if (!payload || typeof payload !== "object") {
        return null;
    }

    const error = (payload as { error?: unknown }).error;
    return typeof error === "string" ? error : null;
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
    const { theme, toggleTheme } = useTheme();
    const router = useRouter();
    const [threatsCount, setThreatsCount] = useState(0);
    const [notificationsCount, setNotificationsCount] = useState(0);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const redirectedForTwoFactorRef = useRef(false);

    // ... (logic remains same, just redesigning the return)

    const handleAuthFailure = useCallback(
        async (response: Response): Promise<boolean> => {
            if (response.status === 401) {
                router.replace("/login");
                return true;
            }

            if (response.status === 403) {
                let payload: unknown = null;
                try {
                    payload = await response.json();
                } catch {
                    payload = null;
                }

                const errorMessage = getApiErrorMessage(payload);
                if (errorMessage?.toLowerCase().includes("two-factor authentication required")) {
                    if (!redirectedForTwoFactorRef.current) {
                        redirectedForTwoFactorRef.current = true;
                        router.replace("/auth/2fa");
                    }
                    return true;
                }
            }

            return false;
        },
        [router],
    );

    useEffect(() => {
        const fetchData = async () => {
            try {
                const threatsRes = await fetch("/api/threats");
                if (!threatsRes.ok) {
                    const shouldStop = await handleAuthFailure(threatsRes);
                    if (shouldStop) return;
                } else {
                    const threatsData = await threatsRes.json() as ThreatsResponse;
                    if (threatsData.stats) {
                        setThreatsCount(threatsData.stats.activeThreatsCount || 0);
                    }
                }

                const notifRes = await fetch("/api/notifications");
                if (!notifRes.ok) {
                    const shouldStop = await handleAuthFailure(notifRes);
                    if (shouldStop) return;
                    setNotificationsCount(0);
                    setNotifications([]);
                    return;
                }

                const notifData = await notifRes.json() as NotificationsResponse;
                const normalizedNotifications = normalizeNotificationsResponse(notifData);
                setNotificationsCount(normalizedNotifications.unreadCount);
                setNotifications(normalizedNotifications.notifications);
            } catch (error) {
                console.error("Failed to fetch topbar data", error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, [handleAuthFailure]);

    const markAsRead = async () => {
        try {
            const response = await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAllRead: true }),
            });

            if (!response.ok) {
                const shouldStop = await handleAuthFailure(response);
                if (shouldStop) return;
                throw new Error("Failed to mark notifications as read");
            }

            setNotificationsCount(0);
            setNotifications((previousNotifications) =>
                markAllNotificationsRead(previousNotifications),
            );
        } catch (e) {
            console.error(e);
        }
    };

    const handleNotificationClick = async (notification: NotificationItem) => {
        if (!notification.isRead) {
            setNotifications((previous) =>
                markNotificationRead(previous, notification.id).notifications
            );
            setNotificationsCount((prev) => Math.max(0, prev - 1));
        }

        if (notification.link) {
            setShowNotifications(false);
            if (notification.link.startsWith("http")) {
                window.location.href = notification.link;
            } else {
                router.push(notification.link);
            }
        }

        if (!notification.isRead) {
            try {
                await fetch("/api/notifications", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: notification.id, isRead: true }),
                });
            } catch (error) {
                console.error("Failed to sync notification read state", error);
            }
        }
    };

    return (
        <header className="h-20 topbar px-10 flex items-center justify-between sticky top-0 z-[40]">
            <div className="flex items-center gap-8 flex-1 max-w-2xl">
                <button
                    onClick={onToggleSidebar}
                    className="p-3 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white hover:border-blue-500/50 transition-all active:scale-95"
                    aria-label="Toggle Sidebar"
                >
                    <Menu size={22} />
                </button>

                <div className="relative flex-1 group">
                    <Search
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-400 transition-colors"
                    />
                    <input
                        type="text"
                        placeholder="Search assets, threats, or vulnerabilities..."
                        className="input !pl-12 !py-3.5 bg-[var(--bg-tertiary)]/30 border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]/50 focus:bg-[var(--bg-secondary)] transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        <span>⌘</span>
                        <span>K</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4 ml-8">
                {/* Live Threats Badge */}
                <Link href="/threats" className="hidden xl:flex">
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40 transition-all group cursor-pointer shadow-lg shadow-red-500/5">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xs font-bold text-red-500 uppercase tracking-widest group-hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-all">
                            {threatsCount} Active Threats
                        </span>
                    </div>
                </Link>

                <div className="h-8 w-px bg-[var(--border-color)] mx-2 hidden md:block" />

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="p-3 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white hover:border-blue-500/50 transition-all active:scale-95"
                    >
                        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-3 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white hover:border-blue-500/50 transition-all active:scale-95 relative"
                        >
                            <Bell size={20} />
                            {notificationsCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-[10px] font-black flex items-center justify-center rounded-lg border-2 border-[var(--bg-secondary)] shadow-lg shadow-blue-500/20">
                                    {notificationsCount}
                                </span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 top-full mt-4 w-[400px] bg-[var(--bg-elevated)] backdrop-blur-2xl border border-[var(--border-color)] rounded-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] z-[100] overflow-hidden animate-fade-in origin-top-right">
                                <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-tertiary)]/30">
                                    <h3 className="font-bold text-sm tracking-tight">Notifications</h3>
                                    {notificationsCount > 0 && (
                                        <button onClick={markAsRead} className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
                                            Clear All
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
                                    {notifications.length === 0 ? (
                                        <div className="p-10 text-center flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)]">
                                                <Bell size={24} />
                                            </div>
                                            <p className="text-sm font-medium text-[var(--text-muted)]">Everything is clear!</p>
                                        </div>
                                    ) : (
                                        notifications.map(notif => (
                                            <button
                                                key={notif.id}
                                                type="button"
                                                onClick={() => void handleNotificationClick(notif)}
                                                className={cn(
                                                    "w-full p-4 border-b border-[var(--border-color)] text-left hover:bg-white/[0.02] transition-colors relative group",
                                                    !notif.isRead && "bg-blue-500/[0.02]"
                                                )}
                                            >
                                                {!notif.isRead && (
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
                                                )}
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className="text-sm font-bold text-white mb-1 leading-snug">{notif.title}</p>
                                                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">{notif.message}</p>
                                                        <p className="text-[10px] font-medium text-[var(--text-muted)] mt-2 uppercase tracking-wider">{new Date(notif.createdAt).toLocaleDateString()} • {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Audit login events with IP and user agent
    useLoginAudit();

    // Close sidebar on initial mobile load
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setIsSidebarOpen(false);
            } else {
                setIsSidebarOpen(true);
            }
        };

        // Set initial state
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <div className="bg-mesh" />
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className={cn(
                "transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)",
                isSidebarOpen ? "lg:ml-[280px]" : "lg:ml-0"
            )}>
                <TopBar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                <main className="p-8 min-h-[calc(100vh-4rem)] relative animate-fade-in">
                    {children}
                </main>
            </div>
        </div>
    );
}
