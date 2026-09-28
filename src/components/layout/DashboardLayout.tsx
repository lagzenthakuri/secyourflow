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
    Scale,
    Siren,
    Network,
    LifeBuoy,
    Building2,
    ScrollText,
    Target,
    Files,
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
import {
    Sidebar as ForgeSidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    useSidebar,
} from "@repo/design-system/components/ui/sidebar";
import { Button } from "@repo/design-system/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/design-system/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";

const ALL_ROLES = ["MAIN_OFFICER", "IT_OFFICER", "PENTESTER", "ANALYST"];

const navigationGroups = [
    {
        name: "Overview",
        items: [
            { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ALL_ROLES },
            { name: "Reports", href: "/reports", icon: BarChart3, roles: ALL_ROLES },
        ],
    },
    {
        name: "Exposure",
        items: [
            { name: "Assets", href: "/assets", icon: Server, roles: ALL_ROLES },
            { name: "Vulnerabilities", href: "/vulnerabilities", icon: Shield, roles: ALL_ROLES },
            { name: "Threats", href: "/threats", icon: AlertTriangle, roles: ALL_ROLES },
            { name: "Scanners", href: "/scanners", icon: Scan, roles: ALL_ROLES },
            { name: "CVE Search", href: "/cves", icon: Database, roles: ALL_ROLES },
        ],
    },
    {
        name: "Risk & governance",
        items: [
            { name: "Risk Register", href: "/risk-register", icon: ClipboardList, roles: ALL_ROLES },
            { name: "Risk Appetite", href: "/risk-appetite", icon: Target, roles: ALL_ROLES },
            { name: "Policies", href: "/policies", icon: ScrollText, roles: ALL_ROLES },
            { name: "Compliance", href: "/compliance", icon: FileCheck, roles: ALL_ROLES },
            { name: "NIS2 Governance", href: "/nis2/governance", icon: Scale, roles: ALL_ROLES },
            { name: "NIS2 Incidents", href: "/nis2/incidents", icon: Siren, roles: ALL_ROLES },
            { name: "Vendors", href: "/vendors", icon: Building2, roles: ALL_ROLES },
            { name: "Supply Chain", href: "/nis2/vendors", icon: Network, roles: ALL_ROLES },
            { name: "Data Catalog", href: "/data", icon: Files, roles: ALL_ROLES },
            { name: "Business Impact", href: "/nis2/bia", icon: LifeBuoy, roles: ALL_ROLES },
        ],
    },
    {
        name: "Administration",
        items: [
            { name: "Settings", href: "/settings", icon: Settings, roles: ALL_ROLES },
            { name: "Users", href: "/users", icon: Users, roles: ["MAIN_OFFICER"] },
        ],
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { isMobile, setOpenMobile, state } = useSidebar();

    const userRole = session?.user?.role || "ANALYST";
    const userName = session?.user?.name || "User";
    const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const closeMobileSidebar = () => {
        if (isMobile) setOpenMobile(false);
    };

    const renderNavigation = (items: (typeof navigationGroups)[number]["items"]) => items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
            <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                    <Link href={item.href} onClick={closeMobileSidebar}>
                        <item.icon aria-hidden="true" />
                        <span>{item.name}</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    });

    return (
        <ForgeSidebar collapsible="icon" variant="inset" className="border-sidebar-border">
            <SidebarHeader className="h-16 justify-center overflow-hidden border-b border-sidebar-border px-2 group-data-[collapsible=icon]:px-1">
                <Link href="/dashboard" title="SecYourFlow" className="flex min-w-0 items-center justify-center gap-3" onClick={closeMobileSidebar}>
                    <Image src="/logo1.png" alt="SecYourFlow" width={32} height={32} />
                    <span className={cn("whitespace-nowrap text-sm font-semibold tracking-[0.14em] transition-[opacity,width,margin] duration-200 ease-linear", state === "collapsed" && "w-0 overflow-hidden opacity-0") }>
                        SECYOUR<span className="text-muted-foreground">FLOW</span>
                    </span>
                </Link>
            </SidebarHeader>
            <SidebarContent className="gap-1">
                {navigationGroups.map((group) => {
                    const visibleItems = group.items.filter((item) => item.roles.includes(userRole));
                    if (visibleItems.length === 0) return null;
                    return (
                        <SidebarGroup key={group.name}>
                            <SidebarGroupLabel>{group.name}</SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>{renderNavigation(visibleItems)}</SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    );
                })}
            </SidebarContent>
            <SidebarFooter className="border-t border-sidebar-border p-2 group-data-[collapsible=icon]:p-1">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button title={state === "collapsed" ? `${userName} · Profile menu` : undefined} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left outline-none transition-[background-color,padding] duration-200 hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0" aria-label="Open profile menu">
                            <Avatar className="size-9 border">
                                {session?.user?.image ? <AvatarImage src={session.user.image} alt="" /> : null}
                                <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">{userInitials}</AvatarFallback>
                            </Avatar>
                            <span className={cn("min-w-0 flex-1 overflow-hidden transition-[opacity,width] duration-200 ease-linear", state === "collapsed" && "w-0 flex-none opacity-0")}>
                                <span className="block truncate text-sm font-medium">{userName}</span>
                                <span className="block truncate text-xs text-muted-foreground">{session?.user?.email || userRole.replaceAll("_", " ")}</span>
                            </span>
                            <ChevronDown size={16} className={cn("shrink-0 text-muted-foreground transition-opacity duration-150", state === "collapsed" && "w-0 opacity-0")} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56">
                        <DropdownMenuLabel className="font-normal">
                            <span className="block truncate text-sm font-medium">{userName}</span>
                            <span className="mt-1 block truncate text-xs text-muted-foreground">{session?.user?.email || userRole.replaceAll("_", " ")}</span>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild><Link href="/settings"><Settings />Settings</Link></DropdownMenuItem>
                        {userRole === "MAIN_OFFICER" ? <DropdownMenuItem asChild><Link href="/users"><Users />User management</Link></DropdownMenuItem> : null}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => void signOut({ callbackUrl: "/" })}><LogOut />Sign out</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarFooter>
        </ForgeSidebar>
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
    const [mounted, setMounted] = useState(false);
    const redirectedForTwoFactorRef = useRef(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const searchListId = "topbar-route-search-results";

    useEffect(() => {
        setMounted(true);
    }, []);

    const userRole = session?.user?.role || "ANALYST";
    const searchableRoutes = useMemo(
        () =>
            navigationGroups.flatMap((group) => group.items)
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
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 topbar px-3 sm:px-5 lg:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">
                <Button
                    type="button"
                    onClick={onToggleSidebar}
                    variant="ghost"
                    size="icon"
                    aria-label="Toggle Sidebar"
                >
                    <Menu size={20} aria-hidden="true" />
                </Button>

                <div className="relative hidden w-full max-w-xl flex-1 sm:block" ref={searchContainerRef}>
                    <Search
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors"
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
            <div className="ml-2 flex shrink-0 items-center gap-1 sm:gap-2">
                {/* Live Threats Indicator */}
                <Link href="/threats">
                    <div className={cn("hidden items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium md:flex", threatsCount > 0 ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-border bg-muted text-muted-foreground")}>
                        <span>
                            {threatsCount} Active Threats
                        </span>
                    </div>
                </Link>

                <Button
                    type="button"
                    onClick={toggleTheme}
                    aria-label={mounted ? `Switch to ${theme === "dark" ? "light" : "dark"} mode` : "Toggle theme"}
                    title={mounted ? `Switch to ${theme === "dark" ? "light" : "dark"} mode` : "Toggle theme"}
                    variant="ghost"
                    size="icon"
                >
                    {mounted ? (theme === "dark" ? <Sun size={20} /> : <Moon size={20} />) : <Sun size={20} />}
                </Button>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        onClick={() => setShowNotifications((current) => !current)}
                        aria-label="Toggle notifications"
                        variant="ghost"
                        size="icon"
                        className="relative"
                    >
                        <Bell size={20} />
                        {notificationsCount > 0 ? (
                            <span className="absolute -right-1 -top-1 min-w-[1.1rem] rounded-full bg-red-500 px-1 text-center text-[10px] font-semibold leading-[1.1rem] text-white">
                                {notificationsCount > 99 ? "99+" : notificationsCount}
                            </span>
                        ) : null}
                    </Button>

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

function DashboardFrame({ children }: { children: React.ReactNode }) {
    const { toggleSidebar } = useSidebar();
    // Audit login events with IP and user agent
    useLoginAudit();

    return (
        <SidebarInset className="min-w-0 bg-background text-foreground">
            <TopBar onToggleSidebar={toggleSidebar} />
        <main className="min-h-[calc(100vh-4rem)] bg-background p-4 sm:p-6">{children}</main>
        </SidebarInset>
    );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider defaultOpen>
            <Sidebar />
            <DashboardFrame>{children}</DashboardFrame>
        </SidebarProvider>
    );
}
