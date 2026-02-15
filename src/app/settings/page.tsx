"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Cards";
import {
    Settings,
    Bell,
    Shield,
    Database,
    Key,
    ChevronRight,
    Save,
    Search,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Plus,
    Trash2,
    Users as UsersIcon,
    ShieldCheck,
    FileText,
    Zap,
    Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useRouter } from "next/navigation";
import { TwoFactorSettingsPanel } from "@/components/settings/TwoFactorSettingsPanel";
import { useUiFeedback } from "@/hooks/useUiFeedback";

// Feature flags storage key
const FEATURE_FLAGS_KEY = "secyourflow.settings.featureFlags.v1";

// Toast notification component (simple, no external deps)
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={cn(
            "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top",
            type === "success" ? "bg-green-500/20 border border-green-500/50 text-green-600 dark:text-green-400" : "bg-red-500/20 border border-red-500/50 text-intent-danger"
        )}>
            {type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <span className="text-sm font-medium">{message}</span>
        </div>
    );
}

interface SettingSystemHealth {
    nvdApiKeyConfigured?: boolean;
    githubTokenConfigured?: boolean;
    openrouterConfigured?: boolean;
    nextauthSecretConfigured?: boolean;
    databaseUrlConfigured?: boolean;
}

interface PlatformSettings {
    organizationName?: string;
    domain?: string;
    timezone?: string;
    dateFormat?: string;
    notifyCritical?: boolean;
    notifyExploited?: boolean;
    notifyCompliance?: boolean;
    notifyScan?: boolean;
    notifyWeekly?: boolean;
    require2FA?: boolean;
    sessionTimeout?: number;
    passwordPolicy?: string;
    aiRiskAssessmentEnabled?: boolean;
    systemHealth?: SettingSystemHealth;
    serverTimestamp?: string;
    [key: string]: unknown;
}

interface FeatureFlags {
    changeControlMode: string;
    settingsChangeReasonRequired: boolean;
    auditLogRetentionDays: number;
    dataRetentionDays: number;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    notifyKevOnly: boolean;
    epssAlertThreshold: number;
    aiAssistEnabled: boolean;
    aiRiskAutofillEnabled: boolean;
    aiHumanReviewRequired: boolean;
    aiDataRedactionMode: string;
    aiModelAllowlist: string[];
    [key: string]: unknown;
}

interface NotificationRuleRecord {
    id: string;
    name: string;
    channel: "IN_APP";
    eventType: string;
    minimumSeverity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL" | null;
    includeExploited: boolean;
    includeKev: boolean;
    recipients: string[];
    isActive: boolean;
}

type SettingsSectionId =
    | "general"
    | "governance"
    | "notifications"
    | "soc-notifications"
    | "security"
    | "ai-assist"
    | "system-health"
    | "integrations"
    | "api"
    | "users";

interface SettingsSectionItem {
    id: SettingsSectionId;
    label: string;
    description: string;
    icon: LucideIcon;
    mainOfficerOnly?: boolean;
}

const settingsSections: SettingsSectionItem[] = [
    { id: "general", label: "General", description: "Organization profile and baseline preferences", icon: Settings },
    { id: "governance", label: "Governance", description: "Change control, retention, and audit guardrails", icon: FileText },
    { id: "notifications", label: "Notifications", description: "Alert channels and summary signals", icon: Bell },
    { id: "soc-notifications", label: "SOC Routing", description: "Quiet hours and incident-routing thresholds", icon: Activity },
    { id: "security", label: "Security", description: "Identity, sessions, password and 2FA controls", icon: Shield },
    { id: "ai-assist", label: "AI Assist", description: "Model governance and human-review policies", icon: Zap },
    { id: "system-health", label: "System Health", description: "Runtime configuration and dependency checks", icon: Activity },
    { id: "integrations", label: "Integrations", description: "Third-party connectors and workflow links", icon: Database },
    { id: "api", label: "API Access", description: "API keys and service access governance", icon: Key },
    { id: "users", label: "Users & Roles", description: "Role assignment and access administration", icon: UsersIcon },
];

const MAIN_OFFICER_ROLE = "MAIN_OFFICER";

const COMMON_SAVE_FIELDS: Array<keyof PlatformSettings> = [
    "timezone",
    "dateFormat",
    "notifyCritical",
    "notifyExploited",
    "notifyCompliance",
    "notifyScan",
    "notifyWeekly",
];

const MAIN_OFFICER_ONLY_SAVE_FIELDS: Array<keyof PlatformSettings> = [
    "require2FA",
    "sessionTimeout",
    "passwordPolicy",
    "aiRiskAssessmentEnabled",
];

function isTwoFactorRequiredError(error?: string) {
    if (!error) return false;
    return error.toLowerCase().includes("two-factor authentication required");
}

function formatRoleLabel(role?: string) {
    if (!role) return "";
    if (role === MAIN_OFFICER_ROLE) return "MAIN-OFFICER";
    return role;
}

export default function SettingsPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [activeSection, setActiveSection] = useState<SettingsSectionId>("general");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState<PlatformSettings | null>(null);
    const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(getDefaultFeatureFlags());
    const [isEditingGeneral, setIsEditingGeneral] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const isMainOfficer = session?.user?.role === MAIN_OFFICER_ROLE;

    // Load feature flags from localStorage.
    const loadFeatureFlags = useCallback(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(FEATURE_FLAGS_KEY);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored) as Partial<FeatureFlags>;
                    return {
                        ...getDefaultFeatureFlags(),
                        ...parsed,
                        aiModelAllowlist: Array.isArray(parsed.aiModelAllowlist)
                            ? parsed.aiModelAllowlist.filter((value): value is string => typeof value === "string")
                            : getDefaultFeatureFlags().aiModelAllowlist,
                    };
                } catch (e) {
                    console.error("Failed to parse feature flags:", e);
                }
            }
        }
        return getDefaultFeatureFlags();
    }, []);

    // Save feature flags to localStorage
    const saveFeatureFlags = useCallback((flags: FeatureFlags) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(flags));
        }
    }, []);

    const fetchSettings = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/settings", { cache: "no-store" });
            const data = await response.json() as PlatformSettings | { error?: string };
            if (!response.ok) {
                const errorMessage =
                    typeof (data as { error?: unknown }).error === "string"
                        ? (data as { error: string }).error
                        : "Failed to load settings";
                if (response.status === 401) {
                    router.replace("/login");
                    return;
                }
                if (response.status === 403 && isTwoFactorRequiredError(errorMessage)) {
                    setToast({ message: "Please complete two-factor verification to continue", type: "error" });
                    router.replace("/auth/2fa");
                    return;
                }
                setToast({ message: errorMessage, type: "error" });
                return;
            }
            setSettings(data);
            setFeatureFlags(loadFeatureFlags());
            setHasUnsavedChanges(false);
        } catch (error) {
            console.error("Failed to fetch settings:", error);
            setToast({ message: "Failed to load settings", type: "error" });
        } finally {
            setIsLoading(false);
        }
    }, [loadFeatureFlags, router]);

    useEffect(() => {
        void fetchSettings();
    }, [fetchSettings]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const handleSave = async () => {
        if (!settings) {
            setToast({ message: "Settings are not loaded yet", type: "error" });
            return;
        }

        try {
            setIsSaving(true);
            const payload: Partial<PlatformSettings> = {};

            for (const field of COMMON_SAVE_FIELDS) {
                if (settings[field] !== undefined) {
                    payload[field] = settings[field];
                }
            }

            if (isMainOfficer) {
                for (const field of MAIN_OFFICER_ONLY_SAVE_FIELDS) {
                    if (settings[field] !== undefined) {
                        payload[field] = settings[field];
                    }
                }
                if (settings.organizationName !== undefined) {
                    payload.organizationName = settings.organizationName;
                }
                if (settings.domain !== undefined) {
                    payload.domain = settings.domain;
                }
            }

            const response = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const data = await response.json() as PlatformSettings;
                setSettings((prev) => ({ ...(prev ?? {}), ...data }));
                setHasUnsavedChanges(false);
                setToast({ message: "Settings saved successfully!", type: "success" });
            } else {
                const error = await response.json() as { error?: string };
                const errorMessage = error.error || "Failed to save settings";
                if (response.status === 401) {
                    router.replace("/login");
                    return;
                }
                if (response.status === 403 && isTwoFactorRequiredError(errorMessage)) {
                    setToast({ message: "Please complete two-factor verification to continue", type: "error" });
                    router.replace("/auth/2fa");
                    return;
                }
                setToast({ message: errorMessage, type: "error" });
            }
        } catch (error) {
            console.error("Failed to save settings:", error);
            setToast({ message: "Failed to save settings", type: "error" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveFeatureFlags = () => {
        saveFeatureFlags(featureFlags);
        setToast({ message: "Feature flags saved!", type: "success" });
    };

    const updateSettings = (updates: Partial<PlatformSettings>) => {
        setSettings((prev) => ({ ...(prev ?? {}), ...updates }));
        setHasUnsavedChanges(true);
    };

    const updateFeatureFlags = (updates: Partial<FeatureFlags>) => {
        setFeatureFlags((prev) => ({ ...prev, ...updates }));
    };

    const accessibleSections = useMemo(
        () => settingsSections,
        [],
    );

    const filteredSections = useMemo(
        () =>
            accessibleSections.filter((section) =>
                `${section.label} ${section.description}`.toLowerCase().includes(searchQuery.toLowerCase()),
            ),
        [accessibleSections, searchQuery],
    );

    useEffect(() => {
        if (filteredSections.length === 0) return;
        if (!filteredSections.some((section) => section.id === activeSection)) {
            setActiveSection(filteredSections[0].id);
        }
    }, [activeSection, filteredSections]);

    const activeSectionInfo = useMemo(
        () =>
            filteredSections.find((section) => section.id === activeSection)
            ?? accessibleSections.find((section) => section.id === activeSection),
        [activeSection, filteredSections, accessibleSections],
    );

    const notificationsEnabledCount = useMemo(() => {
        const notificationKeys: Array<keyof PlatformSettings> = [
            "notifyCritical",
            "notifyExploited",
            "notifyCompliance",
            "notifyScan",
            "notifyWeekly",
        ];
        return notificationKeys.filter((key) => Boolean(settings?.[key])).length;
    }, [settings]);

    const configuredEnvCount = useMemo(() => {
        const health = settings?.systemHealth;
        if (!health) return 0;
        return [
            health.nvdApiKeyConfigured,
            health.githubTokenConfigured,
            health.openrouterConfigured,
            health.nextauthSecretConfigured,
            health.databaseUrlConfigured,
        ].filter(Boolean).length;
    }, [settings]);

    const enabledFeatureFlagCount = useMemo(
        () =>
            Object.values(featureFlags).filter((value) => {
                if (typeof value === "boolean") return value;
                if (Array.isArray(value)) return value.length > 0;
                return false;
            }).length,
        [featureFlags],
    );

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex min-h-[60vh] items-center justify-center">
                    <ShieldLoader size="lg" variant="cyber" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <div className="space-y-5">
                <PageHeader
                    title="Settings"
                    description="Configure security controls, governance policy, operational alerts, and platform integrations in one auditable workspace."
                    badge={
                        <>
                            <Settings size={13} />
                            Configuration Center
                        </>
                    }
                    actions={
                        <>
                            <div
                                className={cn(
                                    "rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wide",
                                    isMainOfficer
                                        ? "border-purple-400/40 bg-purple-500/10 text-purple-700 dark:text-purple-200"
                                        : "border-sky-400/40 bg-sky-500/10 text-sky-700 dark:text-sky-100",
                                )}
                            >
                                {formatRoleLabel(session?.user?.role)}
                            </div>
                            <button
                                type="button"
                                onClick={fetchSettings}
                                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--bg-elevated)] hover:scale-105 active:scale-95"
                            >
                                <Activity size={14} />
                                Refresh
                            </button>
                        </>
                    }
                    stats={[
                        {
                            label: "Alerts Enabled",
                            value: notificationsEnabledCount,
                            trend: { value: "Notification channels currently active", neutral: true },
                            icon: Bell,
                        },
                        {
                            label: "Session Timeout",
                            value: `${settings?.sessionTimeout ?? 30} min`,
                            trend: { value: "Current authentication session policy", neutral: true },
                            icon: Shield,
                        },
                        {
                            label: "Password Policy",
                            value: String(settings?.passwordPolicy ?? "STRONG"),
                            trend: { value: "Credential complexity baseline", neutral: true },
                            icon: Key,
                        },
                        {
                            label: "2FA Requirement",
                            value: settings?.require2FA ? "Required" : "Optional",
                            trend: { value: "Global multi-factor enforcement state", neutral: true },
                            icon: ShieldCheck,
                        },
                    ]}
                />

                <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <aside className="lg:col-span-4 xl:col-span-3">
                        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: '350ms', animationFillMode: 'backwards' }}>
                            <div className="relative mb-3">
                                <Search
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                                    size={16}
                                />
                                <input
                                    type="text"
                                    placeholder="Search settings..."
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    className="h-10 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none transition-colors duration-200 placeholder:[var(--text-muted)] focus:border-sky-300/45"
                                />
                            </div>

                            <div className="space-y-1.5">
                                {filteredSections.map((section, index) => (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        className={cn(
                                            "group w-full rounded-xl border px-3 py-3 text-left transition-all duration-200 animate-in fade-in slide-in-from-left-2",
                                            activeSection === section.id
                                                ? "border-sky-300/30 bg-sky-500/10 shadow-lg shadow-sky-300/10"
                                                : "border-transparent bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)] hover:scale-[1.02]",
                                        )}
                                        style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'backwards' }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <section.icon
                                                size={16}
                                                className={cn(
                                                    activeSection === section.id ? "text-sky-700 dark:text-sky-200" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]",
                                                )}
                                            />
                                            <p
                                                className={cn(
                                                    "text-sm font-medium",
                                                    activeSection === section.id ? "text-sky-700 dark:text-sky-100" : "text-[var(--text-secondary)]",
                                                )}
                                            >
                                                {section.label}
                                            </p>
                                            {section.mainOfficerOnly ? (
                                                <span className="ml-auto rounded-md border border-red-400/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700 dark:text-red-200">
                                                    Officer
                                                </span>
                                            ) : (
                                                <ChevronRight size={14} className="ml-auto text-[var(--text-muted)]" />
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs text-[var(--text-muted)]">{section.description}</p>
                                    </button>
                                ))}
                                {filteredSections.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-[var(--border-color)] px-3 py-4 text-xs text-[var(--text-muted)]">
                                        No settings sections match your search.
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </aside>

                    <div className="lg:col-span-8 xl:col-span-9 space-y-4">
                        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-4 animate-in fade-in slide-in-from-right-4 duration-500" style={{ animationDelay: '350ms', animationFillMode: 'backwards' }}>
                            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Active Section</p>
                            <h2 className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                                {activeSectionInfo?.label ?? "Settings"}
                            </h2>
                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                {activeSectionInfo?.description ?? "Manage platform configuration"}
                            </p>
                        </div>

                        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500" style={{ animationDelay: '450ms', animationFillMode: 'backwards' }}>
                            {activeSection === "general" && (
                                <GeneralSection
                                    settings={settings}
                                    updateSettings={updateSettings}
                                    isEditingGeneral={isEditingGeneral}
                                    setIsEditingGeneral={setIsEditingGeneral}
                                    handleSave={handleSave}
                                    fetchSettings={fetchSettings}
                                    isSaving={isSaving}
                                />
                            )}

                            {activeSection === "governance" && (
                                <GovernanceSection
                                    featureFlags={featureFlags}
                                    updateFeatureFlags={updateFeatureFlags}
                                    handleSaveFeatureFlags={handleSaveFeatureFlags}
                                />
                            )}

                            {activeSection === "notifications" && (
                                <NotificationsSection
                                    settings={settings}
                                    updateSettings={updateSettings}
                                    handleSave={handleSave}
                                    isSaving={isSaving}
                                />
                            )}

                            {activeSection === "soc-notifications" && (
                                <SOCRoutingSection
                                    featureFlags={featureFlags}
                                    updateFeatureFlags={updateFeatureFlags}
                                    handleSaveFeatureFlags={handleSaveFeatureFlags}
                                />
                            )}

                            {activeSection === "security" && (
                                <SecuritySection
                                    settings={settings}
                                    updateSettings={updateSettings}
                                    handleSave={handleSave}
                                    isSaving={isSaving}
                                />
                            )}

                            {activeSection === "ai-assist" && (
                                <AIAssistSection
                                    featureFlags={featureFlags}
                                    updateFeatureFlags={updateFeatureFlags}
                                    handleSaveFeatureFlags={handleSaveFeatureFlags}
                                />
                            )}

                            {activeSection === "system-health" && (
                                <SystemHealthSection settings={settings} fetchSettings={fetchSettings} />
                            )}

                            {activeSection === "integrations" && <IntegrationsSection />}

                            {activeSection === "api" && <APIAccessSection />}

                            {activeSection === "users" && <UsersManagementTab />}
                        </div>
                    </div>
                </section>
            </div>
        </DashboardLayout>
    );
}

// Helper function for default feature flags
function getDefaultFeatureFlags(): FeatureFlags {
    return {
        changeControlMode: "SINGLE_APPROVER",
        settingsChangeReasonRequired: true,
        auditLogRetentionDays: 365,
        dataRetentionDays: 730,
        quietHoursEnabled: false,
        quietHoursStart: "22:00",
        quietHoursEnd: "06:00",
        notifyKevOnly: false,
        epssAlertThreshold: 0.5,
        aiAssistEnabled: false,
        aiRiskAutofillEnabled: false,
        aiHumanReviewRequired: true,
        aiDataRedactionMode: "STRICT",
        aiModelAllowlist: ["openai/gpt-4o-mini"],
    };
}

// Toggle component
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
    return (
        <label className={cn("relative inline-flex items-center", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
                className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[var(--bg-elevated)] peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all duration-200 peer-checked:bg-blue-500" />
        </label>
    );
}

// Restricted field wrapper
function RestrictedField({ isMainOfficer, children }: { isMainOfficer: boolean; children: React.ReactNode }) {
    return <>{children}</>;
}

interface GeneralSectionProps {
    settings: PlatformSettings | null;
    updateSettings: (updates: Partial<PlatformSettings>) => void;
    isEditingGeneral: boolean;
    setIsEditingGeneral: React.Dispatch<React.SetStateAction<boolean>>;
    handleSave: () => Promise<void>;
    fetchSettings: () => Promise<void>;
    isSaving: boolean;
}

interface FeatureFlagSectionProps {
    featureFlags: FeatureFlags;
    updateFeatureFlags: (updates: Partial<FeatureFlags>) => void;
    handleSaveFeatureFlags: () => void;
}

interface NotificationSectionProps {
    settings: PlatformSettings | null;
    updateSettings: (updates: Partial<PlatformSettings>) => void;
    handleSave: () => Promise<void>;
    isSaving: boolean;
}

interface SecuritySectionProps {
    settings: PlatformSettings | null;
    updateSettings: (updates: Partial<PlatformSettings>) => void;
    handleSave: () => Promise<void>;
    isSaving: boolean;
}

interface SystemHealthSectionProps {
    settings: PlatformSettings | null;
    fetchSettings: () => Promise<void>;
}

// General Section
function GeneralSection({ settings, updateSettings, isEditingGeneral, setIsEditingGeneral, handleSave, fetchSettings, isSaving }: GeneralSectionProps) {
    return (
        <Card title="General Settings" subtitle="Basic platform configuration">
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Organization Name
                    </label>
                    <input
                        type="text"
                        value={settings?.organizationName || ""}
                        onChange={(e) => updateSettings({ organizationName: e.target.value })}
                        className="input bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                        disabled={!isEditingGeneral}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Primary Domain
                    </label>
                    <input
                        type="text"
                        value={settings?.domain || ""}
                        onChange={(e) => updateSettings({ domain: e.target.value })}
                        className="input bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                        disabled={!isEditingGeneral}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Timezone
                    </label>
                    <select
                        className="input bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                        value={settings?.timezone || "UTC"}
                        onChange={(e) => updateSettings({ timezone: e.target.value })}
                    >
                        <option>UTC</option>
                        <option>America/New_York</option>
                        <option>Europe/London</option>
                        <option>Asia/Tokyo</option>
                        <option>Asia/Kathmandu</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Date Format
                    </label>
                    <select
                        className="input bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                        value={settings?.dateFormat || "MMM DD, YYYY"}
                        onChange={(e) => updateSettings({ dateFormat: e.target.value })}
                    >
                        <option>MMM DD, YYYY</option>
                        <option>DD/MM/YYYY</option>
                        <option>YYYY-MM-DD</option>
                    </select>
                </div>
                <div className="pt-4 border-t border-[var(--border-color)] flex gap-3">
                    {!isEditingGeneral ? (
                        <button
                            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--bg-elevated)] hover:scale-105 active:scale-95"
                            onClick={() => setIsEditingGeneral(true)}
                        >
                            <Settings size={16} />
                            Edit Organization Info
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={async () => {
                                    await handleSave();
                                    setIsEditingGeneral(false);
                                }}
                                disabled={isSaving}
                                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:bg-sky-400 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                <Save size={16} />
                                {isSaving ? "Saving..." : "Save Changes"}
                            </button>
                            <button
                                onClick={() => {
                                    setIsEditingGeneral(false);
                                    void fetchSettings();
                                }}
                                disabled={isSaving}
                                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--bg-elevated)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                        </>
                    )}
                </div>
            </div>
        </Card>
    );
}

// Governance Section
function GovernanceSection({ featureFlags, updateFeatureFlags, handleSaveFeatureFlags }: FeatureFlagSectionProps) {
    return (
        <Card title="Governance & Compliance" subtitle="Bank-grade change control, audit, and retention">
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Change Control
                    </label>
                    <select
                        className="input bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                        value={featureFlags.changeControlMode || "SINGLE_APPROVER"}
                        onChange={(e) => updateFeatureFlags({ changeControlMode: e.target.value })}
                    >
                        <option value="SINGLE_APPROVER">Single approver</option>
                        <option value="TWO_PERSON_RULE">Two-person rule (recommended for banks)</option>
                    </select>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]">
                    <div>
                        <h4 className="text-sm font-medium text-[var(--text-primary)]">
                            Require reason for settings changes
                        </h4>
                        <p className="text-xs text-[var(--text-muted)]">
                            Enforce change justification for audit trail
                        </p>
                    </div>
                    <Toggle
                        checked={featureFlags.settingsChangeReasonRequired ?? true}
                        onChange={(checked) => updateFeatureFlags({ settingsChangeReasonRequired: checked })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Audit Log Retention (days)
                    </label>
                    <input
                        type="number"
                        min="30"
                        max="3650"
                        value={featureFlags.auditLogRetentionDays || 365}
                        onChange={(e) => updateFeatureFlags({ auditLogRetentionDays: parseInt(e.target.value) })}
                        className="input w-32 bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1">Min: 30 days, Max: 3650 days</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Vulnerability Data Retention (days)
                    </label>
                    <input
                        type="number"
                        min="30"
                        max="3650"
                        value={featureFlags.dataRetentionDays || 730}
                        onChange={(e) => updateFeatureFlags({ dataRetentionDays: parseInt(e.target.value) })}
                        className="input w-32 bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1">Min: 30 days, Max: 3650 days</p>
                </div>

                <div className="pt-4 border-t border-[var(--border-color)]">
                    <button
                        className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:bg-sky-400 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        onClick={handleSaveFeatureFlags}
                    >
                        <Save size={16} />
                        Save (Feature Flags)
                    </button>
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                        Note: Stored in localStorage (no DB schema changes)
                    </p>
                </div>
            </div>
        </Card>
    );
}

// SOC Routing Section
function SOCRoutingSection({ featureFlags, updateFeatureFlags, handleSaveFeatureFlags }: FeatureFlagSectionProps) {
    return (
        <Card title="SOC Routing" subtitle="Alert thresholds, quiet hours, and escalation">
            <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]">
                    <div>
                        <h4 className="text-sm font-medium text-[var(--text-primary)]">Quiet Hours</h4>
                        <p className="text-xs text-[var(--text-muted)]">
                            Suppress non-critical alerts during specified hours
                        </p>
                    </div>
                    <Toggle
                        checked={featureFlags.quietHoursEnabled || false}
                        onChange={(checked) => updateFeatureFlags({ quietHoursEnabled: checked })}
                    />
                </div>

                {featureFlags.quietHoursEnabled && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                Quiet Hours Start
                            </label>
                            <input
                                type="time"
                                value={featureFlags.quietHoursStart || "22:00"}
                                onChange={(e) => updateFeatureFlags({ quietHoursStart: e.target.value })}
                                className="input bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                                Quiet Hours End
                            </label>
                            <input
                                type="time"
                                value={featureFlags.quietHoursEnd || "06:00"}
                                onChange={(e) => updateFeatureFlags({ quietHoursEnd: e.target.value })}
                                className="input bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                            />
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]">
                    <div>
                        <h4 className="text-sm font-medium text-[var(--text-primary)]">
                            Only alert on KEV when enabled
                        </h4>
                        <p className="text-xs text-[var(--text-muted)]">
                            Limit alerts to CISA Known Exploited Vulnerabilities
                        </p>
                    </div>
                    <Toggle
                        checked={featureFlags.notifyKevOnly || false}
                        onChange={(checked) => updateFeatureFlags({ notifyKevOnly: checked })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        EPSS Alert Threshold (0.0–1.0)
                    </label>
                    <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={featureFlags.epssAlertThreshold || 0.5}
                        onChange={(e) => updateFeatureFlags({ epssAlertThreshold: parseFloat(e.target.value) })}
                        className="input w-32 bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                        Alert when EPSS score exceeds this threshold
                    </p>
                </div>

                <div className="pt-4 border-t border-[var(--border-color)]">
                    <button
                        className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:bg-sky-400 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        onClick={handleSaveFeatureFlags}
                    >
                        <Save size={16} />
                        Save (Feature Flags)
                    </button>
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                        Note: Stored in localStorage (no DB schema changes)
                    </p>
                </div>
            </div>
        </Card>
    );
}

// Notifications Section
function NotificationsSection({ settings, updateSettings, handleSave, isSaving }: NotificationSectionProps) {
    const notifications: Array<{
        id: "notifyCritical" | "notifyExploited" | "notifyCompliance" | "notifyScan" | "notifyWeekly";
        title: string;
        description: string;
    }> = [
            {
                id: "notifyCritical",
                title: "Critical Vulnerability Alerts",
                description: "Get notified when critical vulnerabilities are detected",
            },
            {
                id: "notifyExploited",
                title: "Exploitation Alerts",
                description: "Alert when a vulnerability in your environment is being exploited",
            },
            {
                id: "notifyCompliance",
                title: "Compliance Drift",
                description: "Notify when compliance status changes",
            },
            {
                id: "notifyScan",
                title: "Scan Completion",
                description: "Alert when vulnerability scans complete",
            },
            {
                id: "notifyWeekly",
                title: "Weekly Summary",
                description: "Receive weekly risk summary via email",
            },
        ];

    const [rules, setRules] = useState<NotificationRuleRecord[]>([]);
    const [isLoadingRules, setIsLoadingRules] = useState(false);
    const [rulesError, setRulesError] = useState<string | null>(null);
    const [newRule, setNewRule] = useState({
        name: "",
        channel: "IN_APP" as NotificationRuleRecord["channel"],
        eventType: "VULNERABILITY_CREATED",
        minimumSeverity: "HIGH",
        includeExploited: false,
        includeKev: false,
    });

    const fetchRules = useCallback(async () => {
        try {
            setIsLoadingRules(true);
            setRulesError(null);
            const response = await fetch("/api/notification-rules", { cache: "no-store" });
            const payload = await response.json() as { data?: NotificationRuleRecord[]; error?: string };
            if (!response.ok) {
                throw new Error(payload.error || "Failed to load notification rules");
            }
            setRules(Array.isArray(payload.data) ? payload.data : []);
        } catch (error) {
            setRulesError(error instanceof Error ? error.message : "Failed to load notification rules");
        } finally {
            setIsLoadingRules(false);
        }
    }, []);

    useEffect(() => {
        void fetchRules();
    }, [fetchRules]);

    const createRule = useCallback(async () => {
        try {
            setRulesError(null);
            const response = await fetch("/api/notification-rules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newRule.name,
                    channel: newRule.channel,
                    eventType: newRule.eventType,
                    minimumSeverity: newRule.minimumSeverity || undefined,
                    includeExploited: newRule.includeExploited,
                    includeKev: newRule.includeKev,
                    isActive: true,
                }),
            });
            const payload = await response.json() as { error?: string };
            if (!response.ok) {
                throw new Error(payload.error || "Failed to create notification rule");
            }

            setNewRule({
                name: "",
                channel: "IN_APP",
                eventType: "VULNERABILITY_CREATED",
                minimumSeverity: "HIGH",
                includeExploited: false,
                includeKev: false,
            });
            await fetchRules();
        } catch (error) {
            setRulesError(error instanceof Error ? error.message : "Failed to create notification rule");
        }
    }, [fetchRules, newRule]);

    const toggleRule = useCallback(async (rule: NotificationRuleRecord) => {
        try {
            setRulesError(null);
            const response = await fetch("/api/notification-rules", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: rule.id,
                    isActive: !rule.isActive,
                }),
            });
            const payload = await response.json() as { error?: string };
            if (!response.ok) {
                throw new Error(payload.error || "Failed to update notification rule");
            }
            await fetchRules();
        } catch (error) {
            setRulesError(error instanceof Error ? error.message : "Failed to update notification rule");
        }
    }, [fetchRules]);

    const deleteRule = useCallback(async (id: string) => {
        try {
            setRulesError(null);
            const response = await fetch(`/api/notification-rules?id=${id}`, {
                method: "DELETE",
            });
            const payload = await response.json() as { error?: string };
            if (!response.ok) {
                throw new Error(payload.error || "Failed to delete notification rule");
            }
            await fetchRules();
        } catch (error) {
            setRulesError(error instanceof Error ? error.message : "Failed to delete notification rule");
        }
    }, [fetchRules]);

    return (
        <Card title="Notification Settings" subtitle="Configure alerts and notification routing">
            <div className="space-y-5">
                {notifications.map((notification) => (
                    <div
                        key={notification.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]"
                    >
                        <div>
                            <h4 className="text-sm font-medium text-[var(--text-primary)]">
                                {notification.title}
                            </h4>
                            <p className="text-xs text-[var(--text-muted)]">
                                {notification.description}
                            </p>
                        </div>
                        <Toggle
                            checked={Boolean(settings?.[notification.id])}
                            onChange={(checked) => updateSettings({ [notification.id]: checked })}
                        />
                    </div>
                ))}

                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-4">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">Rule-Based Notification Routing</h4>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Route by event type, severity, and exploit context.
                    </p>
                    {rulesError ? (
                        <p className="mt-2 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-600 dark:text-red-300">
                            {rulesError}
                        </p>
                    ) : null}

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <input
                            className="input bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                            placeholder="Rule name"
                            value={newRule.name}
                            onChange={(e) => setNewRule((prev) => ({ ...prev, name: e.target.value }))}
                        />
                        <div className="input flex items-center text-sm text-[var(--text-muted)] bg-[var(--bg-secondary)] border-[var(--border-color)]">Channel: IN_APP</div>
                        <input
                            className="input bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                            placeholder="Event type (e.g. VULNERABILITY_CREATED)"
                            value={newRule.eventType}
                            onChange={(e) => setNewRule((prev) => ({ ...prev, eventType: e.target.value }))}
                        />
                        <select
                            className="input bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                            value={newRule.minimumSeverity}
                            onChange={(e) => setNewRule((prev) => ({ ...prev, minimumSeverity: e.target.value }))}
                        >
                            <option value="">No minimum severity</option>
                            <option value="CRITICAL">CRITICAL</option>
                            <option value="HIGH">HIGH</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="LOW">LOW</option>
                            <option value="INFORMATIONAL">INFORMATIONAL</option>
                        </select>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4">
                        <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                            <input
                                type="checkbox"
                                checked={newRule.includeExploited}
                                onChange={(e) => setNewRule((prev) => ({ ...prev, includeExploited: e.target.checked }))}
                            />
                            Include exploited vulnerabilities
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                            <input
                                type="checkbox"
                                checked={newRule.includeKev}
                                onChange={(e) => setNewRule((prev) => ({ ...prev, includeKev: e.target.checked }))}
                            />
                            Include CISA KEV only
                        </label>
                        <button
                            className="inline-flex items-center gap-2 rounded-lg border border-sky-300/40 bg-sky-300/10 px-3 py-1.5 text-xs font-semibold text-sky-500 transition hover:bg-sky-300/20 dark:text-sky-100"
                            onClick={() => void createRule()}
                            disabled={!newRule.name.trim()}
                        >
                            <Plus size={14} />
                            Add Rule
                        </button>
                    </div>

                    <div className="mt-4 space-y-2">
                        {isLoadingRules ? (
                            <p className="text-xs text-[var(--text-muted)]">Loading rules...</p>
                        ) : rules.length === 0 ? (
                            <p className="text-xs text-[var(--text-muted)]">No notification rules yet.</p>
                        ) : (
                            rules.map((rule) => (
                                <div
                                    key={rule.id}
                                    className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                                            {rule.name}
                                        </p>
                                        <p className="truncate text-[11px] text-[var(--text-secondary)]">
                                            {rule.channel} • {rule.eventType}
                                            {rule.minimumSeverity ? ` • ${rule.minimumSeverity}+` : ""}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Toggle checked={rule.isActive} onChange={() => void toggleRule(rule)} />
                                        <button
                                            className="inline-flex items-center gap-1 rounded-md border border-red-400/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-500 transition hover:bg-red-500/20 dark:text-red-200"
                                            onClick={() => void deleteRule(rule.id)}
                                        >
                                            <Trash2 size={12} />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-color)]">
                    <button
                        className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:bg-sky-400 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        <Save size={16} />
                        {isSaving ? "Saving..." : "Save Core Notification Preferences"}
                    </button>
                </div>
            </div>
        </Card>
    );
}

// Security Section
function SecuritySection({ settings, updateSettings, handleSave, isSaving }: SecuritySectionProps) {
    return (
        <Card title="Security Settings" subtitle="Authentication and access control">
            <div className="space-y-6">
                <p className="text-sm text-[var(--text-muted)] p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    Bank-grade defaults: require2FA=true, sessionTimeout=15–30 min, passwordPolicy=STRONG
                </p>

                <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h4 className="text-sm font-medium text-[var(--text-primary)]">
                                AI Risk Intelligence
                            </h4>
                            <p className="text-xs text-[var(--text-muted)]">
                                Automatically analyze new vulnerabilities with AI
                            </p>
                        </div>
                        <Toggle
                            checked={settings?.aiRiskAssessmentEnabled !== false}
                            onChange={(checked) => updateSettings({ aiRiskAssessmentEnabled: checked })}
                        />
                    </div>
                </div>

                <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h4 className="text-sm font-medium text-[var(--text-primary)]">
                                Enforce 2FA Organization-wide
                            </h4>
                            <p className="text-xs text-[var(--text-muted)]">
                                When disabled, users can choose whether to use 2FA
                            </p>
                        </div>
                        <Toggle
                            checked={settings?.require2FA === true}
                            onChange={(checked) => updateSettings({ require2FA: checked })}
                        />
                    </div>
                </div>

                <TwoFactorSettingsPanel />

                <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Session Timeout (minutes)
                    </label>
                    <input
                        type="number"
                        value={settings?.sessionTimeout || 30}
                        onChange={(e) => updateSettings({ sessionTimeout: parseInt(e.target.value) })}
                        className="input w-32 bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                        Recommended: 15–30 minutes for banking environments
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Password Policy
                    </label>
                    <select
                        className="input bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                        value={settings?.passwordPolicy || "STRONG"}
                        onChange={(e) => updateSettings({ passwordPolicy: e.target.value })}
                    >
                        <option value="STRONG">Strong (12+ chars, mixed case, numbers, symbols)</option>
                        <option value="MEDIUM">Medium (8+ chars, mixed case, numbers)</option>
                        <option value="BASIC">Basic (8+ chars)</option>
                    </select>
                </div>

                <div className="pt-4 border-t border-[var(--border-color)]">
                    <button
                        className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:bg-sky-400 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        <Save size={16} />
                        {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </Card>
    );
}

// AI Assist Section
function AIAssistSection({ featureFlags, updateFeatureFlags, handleSaveFeatureFlags }: FeatureFlagSectionProps) {
    return (
        <Card title="AI Assist" subtitle="Guardrails for OpenRouter and risk autofill">
            <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]">
                    <div>
                        <h4 className="text-sm font-medium text-[var(--text-primary)]">Enable AI Assist</h4>
                        <p className="text-xs text-[var(--text-muted)]">
                            Master switch for all AI-powered features
                        </p>
                    </div>
                    <Toggle
                        checked={featureFlags.aiAssistEnabled || false}
                        onChange={(checked) => updateFeatureFlags({ aiAssistEnabled: checked })}
                    />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]">
                    <div>
                        <h4 className="text-sm font-medium text-[var(--text-primary)]">
                            Risk Register Autofill
                        </h4>
                        <p className="text-xs text-[var(--text-muted)]">
                            When users enter Threat + CIA impacts, AI suggests remaining fields
                        </p>
                    </div>
                    <Toggle
                        checked={featureFlags.aiRiskAutofillEnabled || false}
                        onChange={(checked) => updateFeatureFlags({ aiRiskAutofillEnabled: checked })}
                    />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]">
                    <div>
                        <h4 className="text-sm font-medium text-[var(--text-primary)]">
                            Require human review
                        </h4>
                        <p className="text-xs text-[var(--text-muted)]">
                            Prevent automatic acceptance of AI-generated content
                        </p>
                    </div>
                    <Toggle
                        checked={featureFlags.aiHumanReviewRequired ?? true}
                        onChange={(checked) => updateFeatureFlags({ aiHumanReviewRequired: checked })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Data Redaction
                    </label>
                    <select
                        className="input bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]"
                        value={featureFlags.aiDataRedactionMode || "STRICT"}
                        onChange={(e) => updateFeatureFlags({ aiDataRedactionMode: e.target.value })}
                    >
                        <option value="STRICT">Strict (no PII, no internal hostnames)</option>
                        <option value="STANDARD">Standard</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Allowed Models
                    </label>
                    <div className="space-y-2">
                        {["openai/gpt-4o-mini", "openai/gpt-4.1-mini", "anthropic/claude-3.5-sonnet", "google/gemini-1.5-pro"].map((model) => (
                            <label key={model} className="flex items-center gap-2 p-2 rounded bg-[var(--bg-tertiary)] cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors">
                                <input
                                    type="checkbox"
                                    checked={(featureFlags.aiModelAllowlist || []).includes(model)}
                                    onChange={(e) => {
                                        const current = featureFlags.aiModelAllowlist || [];
                                        const updated = e.target.checked
                                            ? [...current, model]
                                            : current.filter((m) => m !== model);
                                        updateFeatureFlags({ aiModelAllowlist: updated });
                                    }}
                                    className="rounded border-[var(--border-color)]"
                                />
                                <span className="text-sm text-[var(--text-primary)]">{model}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-color)]">
                    <button
                        className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:bg-sky-400 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        onClick={handleSaveFeatureFlags}
                    >
                        <Save size={16} />
                        Save (Feature Flags)
                    </button>
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                        Note: Stored in localStorage (no DB schema changes)
                    </p>
                </div>
            </div>
        </Card>
    );
}

// System Health Section
function SystemHealthSection({ settings, fetchSettings }: SystemHealthSectionProps) {
    const systemHealth = settings?.systemHealth || {};

    const envVars = [
        { key: "NVD_API_KEY", label: "NVD API Key", configured: systemHealth.nvdApiKeyConfigured },
        { key: "GITHUB_TOKEN", label: "GitHub Token", configured: systemHealth.githubTokenConfigured },
        { key: "OPENROUTER_API_KEY", label: "OpenRouter API Key", configured: systemHealth.openrouterConfigured },
        { key: "NEXTAUTH_SECRET", label: "NextAuth Secret", configured: systemHealth.nextauthSecretConfigured },
        { key: "DATABASE_URL", label: "Database URL", configured: systemHealth.databaseUrlConfigured },
    ];

    return (
        <Card title="System Health" subtitle="Key configuration status (no secrets exposed)">
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {envVars.map((env) => (
                        <div
                            key={env.key}
                            className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)]"
                        >
                            <span className="text-sm text-[var(--text-primary)]">{env.label}</span>
                            {env.configured ? (
                                <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                                    <CheckCircle2 size={14} />
                                    Configured
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs font-medium text-intent-danger">
                                    <XCircle size={14} />
                                    Missing
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                {settings?.serverTimestamp && (
                    <p className="text-xs text-[var(--text-muted)] mt-4">
                        Last checked: {new Date(settings.serverTimestamp).toLocaleString()}
                    </p>
                )}

                <div className="pt-4 border-t border-[var(--border-color)]">
                    <button className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--bg-elevated)] hover:scale-105 active:scale-95" onClick={fetchSettings}>
                        <Activity size={16} />
                        Refresh Status
                    </button>
                </div>
            </div>
        </Card>
    );
}

// Integrations Section
function IntegrationsSection() {
    return (
        <Card title="Integrations" subtitle="Third-party service connections">
            <div className="space-y-4">
                <p className="text-sm text-[var(--text-muted)] p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    Configured via ENV variables. Check System Health for status.
                </p>
                {[
                    { name: "Slack", status: "not_connected", icon: "💬" },
                    { name: "Microsoft Teams", status: "not_connected", icon: "📱" },
                    { name: "Jira", status: "not_connected", icon: "📋" },
                    { name: "ServiceNow", status: "not_connected", icon: "🔧" },
                    { name: "PagerDuty", status: "not_connected", icon: "🚨" },
                ].map((integration) => (
                    <div
                        key={integration.name}
                        className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{integration.icon}</span>
                            <div>
                                <h4 className="text-sm font-medium text-[var(--text-primary)]">
                                    {integration.name}
                                </h4>
                                <p className="text-xs text-[var(--text-muted)]">
                                    Coming soon
                                </p>
                            </div>
                        </div>
                        <button className="btn btn-ghost text-sm py-1.5" disabled>
                            Configure
                        </button>
                    </div>
                ))}
            </div>
        </Card>
    );
}

// API Access Section
function APIAccessSection() {
    return (
        <Card title="API Access" subtitle="Manage API keys and access tokens">
            <div className="space-y-6">
                <p className="text-sm text-[var(--text-muted)] p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    Configured via ENV variables. Check System Health for status.
                </p>
                <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
                    <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">API Keys</h4>
                    <div className="space-y-3">
                        {[
                            { name: "Production API Key", created: "Jan 1, 2024", lastUsed: "Today" },
                            { name: "Development Key", created: "Dec 15, 2023", lastUsed: "3 days ago" },
                        ].map((key) => (
                            <div
                                key={key.name}
                                className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)]"
                            >
                                <div>
                                    <p className="text-sm text-[var(--text-primary)]">{key.name}</p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Created: {key.created} • Last used: {key.lastUsed}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="btn btn-ghost text-xs py-1" disabled>
                                        Reveal
                                    </button>
                                    <button className="btn btn-ghost text-xs py-1 text-intent-danger" disabled>
                                        Revoke
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="btn btn-ghost mt-3" disabled>
                        <Key size={14} />
                        Generate New Key (Coming soon)
                    </button>
                </div>
            </div>
        </Card>
    );
}

// Users Management Tab
function UsersManagementTab() {
    const { showToast } = useUiFeedback();
    const { data: session } = useSession();
    const isMainOfficer = session?.user?.role === MAIN_OFFICER_ROLE;
    interface UserRecord {
        id: string;
        name: string;
        email: string;
        role: "ANALYST" | "IT_OFFICER" | "PENTESTER" | "MAIN_OFFICER";
    }

    const [users, setUsers] = useState<UserRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        if (!isMainOfficer) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const response = await fetch("/api/users");
            const data = await response.json() as UserRecord[];
            if (Array.isArray(data)) setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setIsLoading(false);
        }
    }, [isMainOfficer]);

    useEffect(() => {
        void fetchUsers();
    }, [fetchUsers]);

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            setIsUpdating(userId);
            const response = await fetch("/api/users", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, role: newRole }),
            });

            if (response.ok) {
                setUsers((prev) =>
                    prev.map((user) =>
                        user.id === userId ? { ...user, role: newRole as UserRecord["role"] } : user,
                    ),
                );
            } else {
                const err = await response.json() as { error?: string };
                showToast({
                    title: "Role update failed",
                    description: err.error || "Failed to update role",
                    intent: "error",
                });
            }
        } catch (error) {
            console.error("Failed to update role:", error);
            showToast({
                title: "Role update failed",
                description: "An unexpected error occurred while updating role.",
                intent: "error",
            });
        } finally {
            setIsUpdating(null);
        }
    };

    if (!isMainOfficer) {
        return (
            <Card title="Restricted Access" subtitle="Permissions required">
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <ShieldCheck size={48} className="text-red-600/70 dark:text-red-500/60 mb-4" />
                    <p className="text-[var(--text-secondary)] max-w-md">
                        Only users with the <span className="text-[var(--text-primary)] font-bold">MAIN-OFFICER</span> role can manage user permissions and roles.
                    </p>
                </div>
            </Card>
        );
    }

    return (
        <Card title="User Management" subtitle="Manage permissions and platform access levels">
            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <ShieldLoader size="md" variant="cyber" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-xs uppercase text-[var(--text-muted)] border-b border-[var(--border-color)]">
                                    <th className="px-4 py-3 font-medium">User</th>
                                    <th className="px-4 py-3 font-medium">Current Role</th>
                                    <th className="px-4 py-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {users.map((user) => (
                                    <tr key={user.id} className="text-sm">
                                        <td className="px-4 py-4">
                                            <div>
                                                <p className="font-medium text-[var(--text-primary)]">{user.name}</p>
                                                <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={cn(
                                                "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                                user.role === MAIN_OFFICER_ROLE ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" :
                                                    user.role === 'ANALYST' ? "bg-blue-500/10 text-intent-accent" :
                                                        "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                                            )}>
                                                {formatRoleLabel(user.role)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <select
                                                    className="input py-1 text-xs w-32"
                                                    value={user.role}
                                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                    disabled={isUpdating === user.id}
                                                >
                                                    <option value="ANALYST">ANALYST</option>
                                                    <option value="IT_OFFICER">IT_OFFICER</option>
                                                    <option value="PENTESTER">PENTESTER</option>
                                                    <option value="MAIN_OFFICER">MAIN-OFFICER</option>
                                                </select>
                                                {isUpdating === user.id && (
                                                    <ShieldLoader size="sm" />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Card>
    );
}
