"use client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/design-system/components/ui/avatar";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/design-system/components/ui/dropdown-menu";
import { Input as BoilerplateInput } from "@repo/design-system/components/ui/input";
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
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  ClipboardList,
  Database,
  FileCheck,
  Files,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Moon,
  Network,
  Scale,
  Scan,
  ScrollText,
  Search,
  Server,
  Settings,
  Shield,
  Siren,
  Sun,
  Target,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useLoginAudit } from "@/hooks/useLoginAudit";
import { handleSessionFailure, redirectToLogin } from "@/lib/auth/client-session";
import {
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
  type NotificationsResponse,
  normalizeNotificationsResponse,
} from "@/lib/notification-state";
import { cn } from "@/lib/utils";

const ALL_ROLES = ["MAIN_OFFICER", "IT_OFFICER", "PENTESTER", "ANALYST"];

const navigationGroups = [
  {
    name: "Overview",
    items: [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ALL_ROLES,
      },
      { name: "Reports", href: "/reports", icon: BarChart3, roles: ALL_ROLES },
    ],
  },
  {
    name: "Exposure",
    items: [
      { name: "Assets", href: "/assets", icon: Server, roles: ALL_ROLES },
      {
        name: "Vulnerabilities",
        href: "/vulnerabilities",
        icon: Shield,
        roles: ALL_ROLES,
      },
      {
        name: "Threats",
        href: "/threats",
        icon: AlertTriangle,
        roles: ALL_ROLES,
      },
      { name: "Scanners", href: "/scanners", icon: Scan, roles: ALL_ROLES },
      { name: "CVE Search", href: "/cves", icon: Database, roles: ALL_ROLES },
    ],
  },
  {
    name: "Risk & governance",
    items: [
      {
        name: "Risk Register",
        href: "/risk-register",
        icon: ClipboardList,
        roles: ALL_ROLES,
      },
      {
        name: "Risk Appetite",
        href: "/risk-appetite",
        icon: Target,
        roles: ALL_ROLES,
      },
      {
        name: "Policies",
        href: "/policies",
        icon: ScrollText,
        roles: ALL_ROLES,
      },
      {
        name: "Compliance",
        href: "/compliance",
        icon: FileCheck,
        roles: ALL_ROLES,
      },
      {
        name: "NIS2 Governance",
        href: "/nis2/governance",
        icon: Scale,
        roles: ALL_ROLES,
      },
      {
        name: "NIS2 Incidents",
        href: "/nis2/incidents",
        icon: Siren,
        roles: ALL_ROLES,
      },
      { name: "Vendors", href: "/vendors", icon: Building2, roles: ALL_ROLES },
      {
        name: "Supply Chain",
        href: "/nis2/vendors",
        icon: Network,
        roles: ALL_ROLES,
      },
      { name: "Data Catalog", href: "/data", icon: Files, roles: ALL_ROLES },
      {
        name: "Business Impact",
        href: "/nis2/bia",
        icon: LifeBuoy,
        roles: ALL_ROLES,
      },
    ],
  },
  {
    name: "Administration",
    items: [
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
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const renderNavigation = (
    items: (typeof navigationGroups)[number]["items"]
  ) =>
    items.map((item) => {
      const isActive =
        pathname === item.href || pathname.startsWith(`${item.href}/`);
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
    <ForgeSidebar
      className="border-sidebar-border"
      collapsible="icon"
      variant="inset"
    >
      <SidebarHeader className="h-16 justify-center overflow-hidden border-sidebar-border border-b px-2 group-data-[collapsible=icon]:px-1">
        <Link
          className="flex min-w-0 items-center justify-center gap-3"
          href="/dashboard"
          onClick={closeMobileSidebar}
          title="SecYourFlow"
        >
          <Image alt="SecYourFlow" height={32} src="/logo1.png" width={32} />
          <span
            className={cn(
              "whitespace-nowrap font-semibold text-sm tracking-[0.14em] transition-[opacity,width,margin] duration-200 ease-linear",
              state === "collapsed" && "w-0 overflow-hidden opacity-0"
            )}
          >
            SECYOUR<span className="text-muted-foreground">FLOW</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="gap-1">
        {navigationGroups.map((group) => {
          const visibleItems = group.items.filter((item) =>
            item.roles.includes(userRole)
          );
          if (visibleItems.length === 0) {
            return null;
          }
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
      <SidebarFooter className="border-sidebar-border border-t p-2 group-data-[collapsible=icon]:p-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Open profile menu"
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left outline-none transition-[background-color,padding] duration-200 hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
              title={
                state === "collapsed" ? `${userName} · Profile menu` : undefined
              }
            >
              <Avatar className="size-9 border">
                {session?.user?.image ? (
                  <AvatarImage alt="" src={session.user.image} />
                ) : null}
                <AvatarFallback className="bg-primary font-semibold text-primary-foreground text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  "min-w-0 flex-1 overflow-hidden transition-[opacity,width] duration-200 ease-linear",
                  state === "collapsed" && "w-0 flex-none opacity-0"
                )}
              >
                <span className="block truncate font-medium text-sm">
                  {userName}
                </span>
                <span className="block truncate text-muted-foreground text-xs">
                  {session?.user?.email || userRole.replaceAll("_", " ")}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "shrink-0 text-muted-foreground transition-opacity duration-150",
                  state === "collapsed" && "w-0 opacity-0"
                )}
                size={16}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56"
            side="top"
          >
            <DropdownMenuLabel className="font-normal">
              <span className="block truncate font-medium text-sm">
                {userName}
              </span>
              <span className="mt-1 block truncate text-muted-foreground text-xs">
                {session?.user?.email || userRole.replaceAll("_", " ")}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings />
                Settings
              </Link>
            </DropdownMenuItem>
            {userRole === "MAIN_OFFICER" ? (
              <DropdownMenuItem asChild>
                <Link href="/users">
                  <Users />
                  User management
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => void signOut({ callbackUrl: "/" })}
              variant="destructive"
            >
              <LogOut />
              Sign out
            </DropdownMenuItem>
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
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchListId = "topbar-route-search-results";

  useEffect(() => {
    setMounted(true);
  }, []);

  const userRole = session?.user?.role || "ANALYST";
  const searchableRoutes = useMemo(
    () =>
      navigationGroups
        .flatMap((group) => group.items)
        .filter((item) => item.roles.includes(userRole))
        .map((item) => ({
          name: item.name,
          href: item.href,
          keywords: `${item.name} ${item.href}`.toLowerCase(),
        })),
    [userRole]
  );

  const filteredSearchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return searchableRoutes.slice(0, 7);
    }

    return searchableRoutes
      .filter((item) => item.keywords.includes(query))
      .slice(0, 7);
  }, [searchQuery, searchableRoutes]);

  // ... (logic remains same, just redesigning the return)

  const handleAuthFailure = handleSessionFailure;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const threatsRes = await fetch("/api/threats");
        if (threatsRes.ok) {
          const threatsData = (await threatsRes.json()) as ThreatsResponse;
          if (threatsData.stats) {
            setThreatsCount(threatsData.stats.activeThreatsCount || 0);
          }
        } else {
          const shouldStop = await handleAuthFailure(threatsRes);
          if (shouldStop) {
            return;
          }
        }

        const notifRes = await fetch("/api/notifications");
        if (!notifRes.ok) {
          const shouldStop = await handleAuthFailure(notifRes);
          if (shouldStop) {
            return;
          }
          setNotificationsCount(0);
          setNotifications([]);
          return;
        }

        const notifData = (await notifRes.json()) as NotificationsResponse;
        const normalizedNotifications =
          normalizeNotificationsResponse(notifData);
        setNotificationsCount(normalizedNotifications.unreadCount);
        setNotifications(normalizedNotifications.notifications);
      } catch (error) {
        console.error("Failed to fetch topbar data", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60_000);
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
  }, []);

  const markAsRead = async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });

      if (!response.ok) {
        const shouldStop = await handleAuthFailure(response);
        if (shouldStop) {
          return;
        }
        throw new Error("Failed to mark notifications as read");
      }

      setNotificationsCount(0);
      setNotifications((previousNotifications) =>
        markAllNotificationsRead(previousNotifications)
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      setNotifications(
        (previous) =>
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
    <header className="topbar sticky top-0 z-40 flex h-16 items-center justify-between gap-3 px-3 sm:px-5 lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-5">
        <Button
          aria-label="Toggle Sidebar"
          onClick={onToggleSidebar}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Menu aria-hidden="true" size={20} />
        </Button>

        <div
          className="relative hidden w-full max-w-xl flex-1 sm:block"
          ref={searchContainerRef}
        >
          <Search
            className="absolute top-1/2 left-4 -translate-y-1/2 text-[var(--text-muted)] transition-colors group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400"
            size={18}
          />
          <BoilerplateInput
            aria-activedescendant={
              showSearchResults && filteredSearchResults[activeResultIndex]
                ? `topbar-search-option-${activeResultIndex}`
                : undefined
            }
            aria-autocomplete="list"
            aria-controls={searchListId}
            aria-expanded={showSearchResults}
            className="!pl-10 bg-[var(--bg-tertiary)] py-2.5 text-sm"
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
                  Math.min(
                    current + 1,
                    Math.max(0, filteredSearchResults.length - 1)
                  )
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
            role="combobox"
            type="text"
            value={searchQuery}
          />
          {showSearchResults && (
            <div className="absolute top-full right-0 left-0 mt-2 overflow-hidden rounded-xl border border-[var(--overlay-border,var(--border-color))] bg-[var(--overlay-surface,var(--bg-elevated))] shadow-[var(--overlay-shadow,var(--shadow-lg))]">
              <ul className="max-h-72 overflow-y-auto p-1" id={searchListId}>
                {filteredSearchResults.length > 0 ? (
                  filteredSearchResults.map((result, index) => (
                    <li
                      aria-selected={index === activeResultIndex}
                      id={`topbar-search-option-${index}`}
                      key={result.href}
                    >
                      <button
                        className={cn(
                          "w-full rounded-lg px-3 py-2 text-left text-sm transition",
                          index === activeResultIndex
                            ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                        )}
                        onClick={() => navigateToSearchResult(result.href)}
                        onMouseEnter={() => setActiveResultIndex(index)}
                        type="button"
                      >
                        <span className="block font-medium">{result.name}</span>
                        <span className="mt-0.5 block text-[var(--text-muted)] text-xs">
                          {result.href}
                        </span>
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-2 text-[var(--text-muted)] text-sm">
                    No route matches found.
                  </li>
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
          <div
            className={cn(
              "hidden items-center gap-2 rounded-md border px-2.5 py-1.5 font-medium text-xs md:flex",
              threatsCount > 0
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-border bg-muted text-muted-foreground"
            )}
          >
            <span>{threatsCount} Active Threats</span>
          </div>
        </Link>

        <Button
          aria-label={
            mounted
              ? `Switch to ${theme === "dark" ? "light" : "dark"} mode`
              : "Toggle theme"
          }
          onClick={toggleTheme}
          size="icon"
          title={
            mounted
              ? `Switch to ${theme === "dark" ? "light" : "dark"} mode`
              : "Toggle theme"
          }
          type="button"
          variant="ghost"
        >
          {mounted ? (
            theme === "dark" ? (
              <Sun size={20} />
            ) : (
              <Moon size={20} />
            )
          ) : (
            <Sun size={20} />
          )}
        </Button>

        <div className="flex items-center gap-2">
          <Button
            aria-label="Toggle notifications"
            className="relative"
            onClick={() => setShowNotifications((current) => !current)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Bell size={20} />
            {notificationsCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[1.1rem] rounded-full bg-red-500 px-1 text-center font-semibold text-[10px] text-white leading-[1.1rem]">
                {notificationsCount > 99 ? "99+" : notificationsCount}
              </span>
            ) : null}
          </Button>

          {/* Dropdown */}
          {showNotifications && (
            <div className="absolute top-full right-0 z-50 mt-2 w-80 animate-fade-in overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-2xl">
              <div className="flex items-center justify-between border-[var(--border-color)] border-b bg-[var(--bg-tertiary)] p-3">
                <h3 className="font-semibold text-sm">Notifications</h3>
                {notificationsCount > 0 && (
                  <button
                    className="text-intent-accent text-xs transition-all duration-300 ease-in-out hover:text-intent-accent-strong"
                    onClick={markAsRead}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-[var(--text-muted)] text-sm">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      className={`w-full border-[var(--border-color)] border-b p-3 text-left transition-all duration-300 ease-in-out hover:bg-[var(--bg-tertiary)] ${notif.isRead ? "" : "bg-[var(--bg-tertiary)]/50"}`}
                      key={notif.id}
                      onClick={() => {
                        void handleNotificationClick(notif);
                      }}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">{notif.title}</p>
                        {!notif.isRead && (
                          <div className="absolute top-0 bottom-0 left-0 w-1 bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
                        )}
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="mb-1 font-bold text-sm text-white leading-snug">
                              {notif.title}
                            </p>
                            <p className="line-clamp-2 text-[var(--text-secondary)] text-xs leading-relaxed">
                              {notif.message}
                            </p>
                            <p className="mt-2 font-medium text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                              {new Date(notif.createdAt).toLocaleDateString()} •{" "}
                              {new Date(notif.createdAt).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </p>
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
    </header>
  );
}

function DashboardFrame({ children }: { children: React.ReactNode }) {
  const { toggleSidebar } = useSidebar();
  // Audit login events with IP and user agent
  useLoginAudit();

  return (
    <SidebarInset className="min-w-0 bg-background text-foreground">
      <TopBar onToggleSidebar={toggleSidebar} />
      <main className="min-h-[calc(100vh-4rem)] bg-background p-4 sm:p-6">
        {children}
      </main>
    </SidebarInset>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      redirectToLogin();
    }
  }, [status]);

  if (status !== "authenticated") {
    return (
      <div className="p-6" role="status">
        {status === "loading" ? "Checking session…" : "Redirecting to login…"}
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar />
      <DashboardFrame>{children}</DashboardFrame>
    </SidebarProvider>
  );
}
