"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["MAIN_OFFICER", "IT_OFFICER", "PENTESTER", "ANALYST"] },
    { name: "Assets", href: "/assets", icon: Server, roles: ["MAIN_OFFICER", "IT_OFFICER", "PENTESTER", "ANALYST"] },
    { name: "Vulnerabilities", href: "/vulnerabilities", icon: Shield, roles: ["MAIN_OFFICER", "PENTESTER", "ANALYST"] },
    { name: "Threats", href: "/threats", icon: AlertTriangle, roles: ["MAIN_OFFICER", "PENTESTER", "ANALYST"] },
    { name: "Risk Register", href: "/risk-register", icon: ClipboardList, roles: ["MAIN_OFFICER", "IT_OFFICER", "ANALYST"] },
    { name: "Compliance", href: "/compliance", icon: FileCheck, roles: ["MAIN_OFFICER", "IT_OFFICER", "ANALYST"] },
    { name: "Reports", href: "/reports", icon: BarChart3, roles: ["MAIN_OFFICER", "ANALYST"] },
    { name: "Scanners", href: "/scanners", icon: Scan, roles: ["MAIN_OFFICER", "IT_OFFICER", "PENTESTER", "ANALYST"] },
    { name: "CVE Search", href: "/cves", icon: Database, roles: ["MAIN_OFFICER", "IT_OFFICER", "PENTESTER", "ANALYST"] },
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
                    className="lg:hidden fixed inset-0 bg-black/50 z-30 transition-opacity duration-300 ease-in-out"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "sidebar transition-transform duration-400 ease-out",
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
                        <span className="text-[14px] font-bold tracking-[0.22em] text-white">
                            SECYOUR<span className="text-sky-300">FLOW</span>
                        </span>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 overflow-y-auto min-h-0">
                    <div className="px-4 mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                            Main Menu
                        </span>
                    </div>
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
                                <item.icon size={18} />
                                {item.name}
                            </Link>
                        );
                    })}

                    <div className="px-4 mt-6 mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                            Administration
                        </span>
                    </div>
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
                                <item.icon size={18} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-[var(--border-color)] mt-auto">
                    <div className="group relative">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] transition-all duration-300 ease-in-out cursor-pointer">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
                                {userInitials}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {userName}
                                </p>
                                <p className="text-[10px] text-[var(--text-muted)] uppercase">
                                    {userRole.replace('_', ' ')}
                                </p>
                            </div>
                            <button className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white transition-all duration-300 ease-in-out">
                                <ChevronDown size={14} />
                            </button>
                        </div>

                        {/* Simple Tooltip-style Logout Menu */}
                        <div className="absolute bottom-full left-0 w-full mb-2 hidden group-hover:block z-50 animate-fade-in">
                            <div className="bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-xl shadow-2xl p-1 overflow-hidden">
                                <button
                                    onClick={() => signOut({ callbackUrl: "/" })}
                                    className="w-full flex items-center gap-2 p-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-300 ease-in-out"
                                >
                                    <LogOut size={16} />
                                    Sign Out
                                </button>
                            </div>
                        </div>
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

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    createdAt: string;
    read: boolean;
}

interface NotificationsResponse {
    unreadCount?: number;
    notifications?: NotificationItem[];
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
    const [threatsCount, setThreatsCount] = useState(0);
    const [notificationsCount, setNotificationsCount] = useState(0);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Threats
                const threatsRes = await fetch("/api/threats");
                const threatsData = await threatsRes.json() as ThreatsResponse;
                if (threatsData.stats) {
                    setThreatsCount(threatsData.stats.activeThreatsCount || 0);
                }

                // Fetch Notifications
                const notifRes = await fetch("/api/notifications");
                const notifData = await notifRes.json() as NotificationsResponse;
                if (notifData.unreadCount !== undefined) {
                    setNotificationsCount(notifData.unreadCount);
                    setNotifications(notifData.notifications || []);
                }
            } catch (error) {
                console.error("Failed to fetch topbar data", error);
            }
        };

        fetchData();
        // Poll every minute
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    const markAsRead = async () => {
        try {
            await fetch("/api/notifications", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAllRead: true }),
            });
            setNotificationsCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <header className="h-16 bg-[var(--bg-secondary)]/80 backdrop-blur-md border-b border-[var(--border-color)]/50 flex items-center justify-between px-6 sticky top-0 z-20">
            {/* Left Section: Menu Toggle & Search */}
            <div className="flex items-center gap-4 flex-1 max-w-xl">
                <button
                    onClick={onToggleSidebar}
                    className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-white transition-all duration-300 ease-in-out"
                    aria-label="Toggle Sidebar"
                >
                    <Menu size={20} />
                </button>

                <div className="relative flex-1">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                    />
                    <input
                        type="text"
                        placeholder="Search assets, vulnerabilities, or CVEs..."
                        className="input !pl-10 py-2.5 text-sm bg-[var(--bg-tertiary)]"
                    />
                </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3 ml-4">
                {/* Live Threats Indicator */}
                <Link href="/threats">
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all duration-300 ease-in-out cursor-pointer">
                        <span className="live-indicator text-xs font-medium text-red-400">
                            {threatsCount} Active Threats
                        </span>
                    </div>
                </Link>

                {/* Notifications */}
                <div className="relative">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-white transition-all duration-300 ease-in-out"
                    >
                        <Bell size={20} />
                        {notificationsCount > 0 && (
                            <span className="notification-badge">{notificationsCount}</span>
                        )}
                    </button>

                    {/* Dropdown */}
                    {showNotifications && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                            <div className="p-3 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-tertiary)]">
                                <h3 className="font-semibold text-sm">Notifications</h3>
                                {notificationsCount > 0 && (
                                    <button onClick={markAsRead} className="text-xs text-blue-400 hover:text-blue-300 transition-all duration-300 ease-in-out duration-300">
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
                                        <div key={notif.id} className={`p-3 border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-all duration-300 ease-in-out ${!notif.read ? 'bg-[var(--bg-tertiary)]/50' : ''}`}>
                                            <p className="text-sm font-medium">{notif.title}</p>
                                            <p className="text-xs text-[var(--text-muted)] mt-1">{notif.message}</p>
                                            <p className="text-[10px] text-[var(--text-muted)] mt-2">{new Date(notif.createdAt).toLocaleString()}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
        <div className="min-h-screen bg-[var(--bg-primary)] bg-grid bg-gradient-radial">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className={cn(
                "transition-all duration-400 ease-out",
                isSidebarOpen ? "lg:ml-[260px]" : "lg:ml-0"
            )}>
                <TopBar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                <main className="p-6 min-h-[calc(100vh-4rem)]">{children}</main>

            </div>
        </div>
    );
}
