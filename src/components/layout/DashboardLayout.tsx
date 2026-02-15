"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
                    className="lg:hidden fixed inset-0 bg-[var(--overlay-scrim)] z-30 transition-opacity duration-300 ease-in-out"
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
                {/* Logo */}
                <div className="p-5 border-b border-[var(--border-color)]">
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <Image
                            src="/logo1.png"
                            alt="SecYourFlow"
                            width={40}
                            height={40}
                        />
                        <span className="text-[14px] font-bold tracking-[0.22em] text-[var(--text-primary)]">
                            SECYOUR<span className="text-intent-accent">FLOW</span>
                        </span>
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
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
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
                                        className="w-full flex items-center gap-2 p-2.5 text-sm text-intent-danger rounded-lg hover:bg-red-500/10 transition-colors"
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
    const { data: session } = useSession();
    const { theme, toggleTheme } = useTheme();
    const router = useRouter();
    const [threatsCount, setThreatsCount] = useState(0);
    const [notificationsCount, setNotificationsCount] = useState(0);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [activeResultIndex, setActiveResultIndex] = useState(0);
    const redirectedForTwoFactorRef = useRef(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const searchListId = "topbar-route-search-results";

    const userRole = session?.user?.role || "ANALYST";
    const searchableRoutes = useMemo(
        () =>
            [...navigation, ...secondaryNav]
                .filter((item) => item.roles.includes(userRole))
                .map((item) => ({
                    name: item.name,
                    href: item.href,
                    keywords: `${item.name} ${item.href}`.toLowerCase(),
                })),
        [userRole],
    );

    const filteredSearchResults = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) {
            return searchableRoutes.slice(0, 7);
        }

        return searchableRoutes.filter((item) => item.keywords.includes(query)).slice(0, 7);
    }, [searchQuery, searchableRoutes]);

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

    useEffect(() => {
        const handleDocumentClick = (event: MouseEvent) => {
            if (!searchContainerRef.current?.contains(event.target as Node)) {
                setShowSearchResults(false);
            }
        };

        document.addEventListener("mousedown", handleDocumentClick);
        return () => document.removeEventListener("mousedown", handleDocumentClick);
    }, []);

    useEffect(() => {
        setActiveResultIndex(0);
    }, [searchQuery]);

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

    const navigateToSearchResult = (href: string) => {
        setShowSearchResults(false);
        setSearchQuery("");
        router.push(href);
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

                <div className="relative flex-1" ref={searchContainerRef}>
                    <Search
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-400 transition-colors"
                    />
                    <input
                        type="text"
                        role="combobox"
                        aria-expanded={showSearchResults}
                        aria-controls={searchListId}
                        aria-autocomplete="list"
                        aria-activedescendant={
                            showSearchResults && filteredSearchResults[activeResultIndex]
                                ? `topbar-search-option-${activeResultIndex}`
                                : undefined
                        }
                        value={searchQuery}
                        onChange={(event) => {
                            setSearchQuery(event.target.value);
                            setShowSearchResults(true);
                        }}
                        onFocus={() => setShowSearchResults(true)}
                        onKeyDown={(event) => {
                            if (!showSearchResults) {
                                return;
                            }

                            if (event.key === "ArrowDown") {
                                event.preventDefault();
                                setActiveResultIndex((current) =>
                                    Math.min(current + 1, Math.max(0, filteredSearchResults.length - 1)),
                                );
                                return;
                            }

                            if (event.key === "ArrowUp") {
                                event.preventDefault();
                                setActiveResultIndex((current) => Math.max(current - 1, 0));
                                return;
                            }

                            if (event.key === "Enter") {
                                const result = filteredSearchResults[activeResultIndex];
                                if (result) {
                                    event.preventDefault();
                                    navigateToSearchResult(result.href);
                                }
                                return;
                            }

                            if (event.key === "Escape") {
                                event.preventDefault();
                                setShowSearchResults(false);
                            }
                        }}
                        placeholder="Search assets, vulnerabilities, or CVEs..."
                        className="input !pl-10 py-2.5 text-sm bg-[var(--bg-tertiary)]"
                    />
                    {showSearchResults && (
                        <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-[var(--overlay-border,var(--border-color))] bg-[var(--overlay-surface,var(--bg-elevated))] shadow-[var(--overlay-shadow,var(--shadow-lg))]">
                            <ul id={searchListId} role="listbox" className="max-h-72 overflow-y-auto p-1">
                                {filteredSearchResults.length > 0 ? (
                                    filteredSearchResults.map((result, index) => (
                                        <li key={result.href} id={`topbar-search-option-${index}`} role="option" aria-selected={index === activeResultIndex}>
                                            <button
                                                type="button"
                                                onMouseEnter={() => setActiveResultIndex(index)}
                                                onClick={() => navigateToSearchResult(result.href)}
                                                className={cn(
                                                    "w-full rounded-lg px-3 py-2 text-left text-sm transition",
                                                    index === activeResultIndex
                                                        ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                                                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
                                                )}
                                            >
                                                <span className="block font-medium">{result.name}</span>
                                                <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{result.href}</span>
                                            </button>
                                        </li>
                                    ))
                                ) : (
                                    <li className="px-3 py-2 text-sm text-[var(--text-muted)]">No route matches found.</li>
                                )}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3 ml-4">
                {/* Live Threats Indicator */}
                <Link href="/threats">
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all duration-300 ease-in-out cursor-pointer">
                        <span className="live-indicator text-xs font-medium text-intent-danger">
                            {threatsCount} Active Threats
                        </span>
                    </div>
                </Link>

                <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                    title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                    className="relative p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-300 ease-in-out"
                >
                    {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <div className="flex items-center gap-2">

                    {/* Dropdown */}
                    {showNotifications && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                            <div className="p-3 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-tertiary)]">
                                <h3 className="font-semibold text-sm">Notifications</h3>
                                {notificationsCount > 0 && (
                                    <button onClick={markAsRead} className="text-xs text-intent-accent hover:text-intent-accent-strong transition-all duration-300 ease-in-out">
                                        Mark all read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-[var(--text-muted)]">
                                        No notifications
                                    </div>
                                ) : (
                                    notifications.map(notif => (
                                        <button
                                            key={notif.id}
                                            type="button"
                                            onClick={() => {
                                                void handleNotificationClick(notif);
                                            }}
                                            className={`w-full p-3 border-b border-[var(--border-color)] text-left hover:bg-[var(--bg-tertiary)] transition-all duration-300 ease-in-out ${!notif.isRead ? "bg-[var(--bg-tertiary)]/50" : ""}`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-medium">{notif.title}</p>
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
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </header >
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
        <div className="min-h-screen bg-[var(--bg-primary)] bg-grid">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className={cn(
                "transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)",
                isSidebarOpen ? "lg:ml-[280px]" : "lg:ml-0"
            )}>
                <TopBar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6">{children}</main>
            </div>
        </div>
    );
}
