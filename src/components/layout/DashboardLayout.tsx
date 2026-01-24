"use client";

import Link from "next/link";
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
    X,
    ChevronDown,
    LogOut,
    User,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Assets", href: "/assets", icon: Server },
    { name: "Vulnerabilities", href: "/vulnerabilities", icon: Shield },
    { name: "Threats", href: "/threats", icon: AlertTriangle },
    { name: "Compliance", href: "/compliance", icon: FileCheck },
    { name: "Reports", href: "/reports", icon: BarChart3 },
    { name: "Scanners", href: "/scanners", icon: Scan },
];

const secondaryNav = [
    { name: "Users", href: "/users", icon: Users },
    { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)]"
            >
                {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "sidebar",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Logo */}
                <div className="p-6 border-b border-[var(--border-color)]">
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">SecYourFlow</h1>
                            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                                Cyber Risk Platform
                            </p>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 overflow-y-auto">
                    <div className="px-4 mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                            Main Menu
                        </span>
                    </div>
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn("sidebar-link", isActive && "active")}
                                onClick={() => setIsMobileOpen(false)}
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
                    {secondaryNav.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn("sidebar-link", isActive && "active")}
                                onClick={() => setIsMobileOpen(false)}
                            >
                                <item.icon size={18} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-[var(--border-color)]">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
                            SC
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                Sarah Chen
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">Security Analyst</p>
                        </div>
                        <button className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white transition-colors">
                            <ChevronDown size={16} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}

export function TopBar() {
    return (
        <header className="h-16 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] flex items-center justify-between px-6 sticky top-0 z-20">
            {/* Search */}
            <div className="flex-1 max-w-xl">
                <div className="relative">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                    />
                    <input
                        type="text"
                        placeholder="Search assets, vulnerabilities, or CVEs..."
                        className="input pl-10 py-2.5 text-sm bg-[var(--bg-tertiary)]"
                    />
                </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3 ml-4">
                {/* Live Threats Indicator */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                    <span className="live-indicator text-xs font-medium text-red-400">
                        23 Active Threats
                    </span>
                </div>

                {/* Notifications */}
                <button className="relative p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-white transition-colors">
                    <Bell size={20} />
                    <span className="notification-badge">5</span>
                </button>

                {/* User Menu */}
                <button className="flex items-center gap-2 p-1.5 pr-3 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-medium">
                        SC
                    </div>
                    <ChevronDown size={16} className="text-[var(--text-muted)]" />
                </button>
            </div>
        </header>
    );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] bg-grid bg-gradient-radial">
            <Sidebar />
            <div className="lg:ml-[260px]">
                <TopBar />
                <main className="p-6">{children}</main>
            </div>
        </div>
    );
}
