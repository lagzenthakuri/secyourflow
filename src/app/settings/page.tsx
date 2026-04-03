"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
    Settings,
    Bell,
    Shield,
    Database,
    Zap,
    Activity,
    User,
    ShieldCheck,
    FileText,
    Key,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Github,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useRouter } from "next/navigation";
import { useUiFeedback } from "@/hooks/useUiFeedback";

// New Components
import { SettingsSidebar } from "@/components/settings/SettingsSidebar";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { GeneralSection } from "@/components/settings/GeneralSection";
import { GovernanceSection } from "@/components/settings/GovernanceSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { AIAssistSection } from "@/components/settings/AIAssistSection";
import { 
    SystemHealthSection, 
    SOCRoutingSection, 
    SecuritySection, 
    MailSection, 
    UsersManagementTab,
    ZenkinsSection
} from "@/components/settings/SettingsSections";

// Types
import { 
    PlatformSettings, 
    FeatureFlags, 
    SettingsSectionId, 
    SettingsSectionItem 
} from "@/components/settings/types";

// Feature flags storage key
const FEATURE_FLAGS_KEY = "secyourflow.settings.featureFlags.v1";
const MAIN_OFFICER_ROLE = "MAIN_OFFICER";
const ADMIN_ROLE = "SUPER_ADMIN";

const settingsSections: SettingsSectionItem[] = [
    { id: "profile", label: "Profile", description: "Personal details and account preferences", icon: User },
    { id: "general", label: "General", description: "Organization profile and baseline preferences", icon: Settings },
    { id: "governance", label: "Governance", description: "Change control, retention, and audit guardrails", icon: FileText },
    { id: "notifications", label: "Notifications", description: "Alert channels and summary signals", icon: Bell },
    { id: "soc-notifications", label: "SOC Routing", description: "Quiet hours and incident-routing thresholds", icon: Activity },
    { id: "security", label: "Security", description: "Identity, sessions, password and 2FA controls", icon: Shield },
    { id: "ai-assist", label: "AI Assist", description: "Model governance and human-review policies", icon: Zap },
    { id: "mail", label: "Mail Server", description: "SMTP configuration for outbound alerts and reports", icon: Bell },
    { id: "system-health", label: "System Health", description: "Runtime configuration and dependency checks", icon: Activity },
    { id: "users", label: "Users & Roles", description: "Role assignment and access administration", icon: User },
    { id: "zenkins", label: "Zenkins DevOps", description: "CI/CD orchestration and automated updates", icon: Github },
];

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
    "aiProvider",
    "aiModel",
    "aiApiKey",
    "aiBaseUrl",
    "smtpHost",
    "smtpPort",
    "smtpUser",
    "smtpPass",
    "smtpFrom",
    "smtpEncryption",
];

function isTwoFactorRequiredError(error?: string) {
    if (!error) return false;
    return error.toLowerCase().includes("two-factor authentication required");
}

function formatRoleLabel(role?: string) {
    if (!role) return "";
    if (role === MAIN_OFFICER_ROLE) return "MAIN-OFFICER";
    if (role === ADMIN_ROLE) return "ADMIN";
    return role;
}

export default function SettingsPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [activeSection, setActiveSection] = useState<SettingsSectionId>("profile");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState<PlatformSettings | null>(null);
    const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(getDefaultFeatureFlags());
    const [isEditingGeneral, setIsEditingGeneral] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const isMainOfficer = session?.user?.role === MAIN_OFFICER_ROLE;
    const isAdmin = session?.user?.role === ADMIN_ROLE;
    const canManageUsers = isMainOfficer || isAdmin;

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
                const errorMessage = typeof (data as any).error === "string" ? (data as any).error : "Failed to load settings";
                if (response.status === 401) {
                    router.replace("/login");
                    return;
                }
                if (response.status === 403 && isTwoFactorRequiredError(errorMessage)) {
                    setToast({ message: "Two-factor verification required", type: "error" });
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
            setToast({ message: "Failed to load settings", type: "error" });
        } finally {
            setIsLoading(false);
        }
    }, [loadFeatureFlags, router]);

    useEffect(() => {
        void fetchSettings();
    }, [fetchSettings]);

    const handleSave = async () => {
        if (!settings) return;
        try {
            setIsSaving(true);
            const payload: Partial<PlatformSettings> = {};
            for (const field of COMMON_SAVE_FIELDS) if (settings[field] !== undefined) payload[field] = settings[field];
            if (isMainOfficer) {
                for (const field of MAIN_OFFICER_ONLY_SAVE_FIELDS) if (settings[field] !== undefined) payload[field] = settings[field];
                if (settings.organizationName !== undefined) payload.organizationName = settings.organizationName;
                if (settings.domain !== undefined) payload.domain = settings.domain;
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
                setToast({ message: "Settings finalized successfully!", type: "success" });
            } else {
                const error = await response.json() as { error?: string };
                setToast({ message: error.error || "Failed to save settings", type: "error" });
            }
        } catch (error) {
            setToast({ message: "System error while saving", type: "error" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveFeatureFlags = () => {
        saveFeatureFlags(featureFlags);
        setToast({ message: "Feature flags updated!", type: "success" });
    };

    const updateSettings = (updates: Partial<PlatformSettings>) => {
        setSettings((prev) => ({ ...(prev ?? {}), ...updates }));
        setHasUnsavedChanges(true);
    };

    const updateFeatureFlags = (updates: Partial<FeatureFlags>) => {
        setFeatureFlags((prev) => ({ ...prev, ...updates }));
    };

    const filteredSections = useMemo(
        () => settingsSections.filter((section) =>
            `${section.label} ${section.description}`.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
        [searchQuery],
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
            {toast && (
                <div className={cn(
                    "fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-10 transition-all cursor-pointer",
                    toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
                )} onClick={() => setToast(null)}>
                    {toast.type === "success" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                    <span className="text-sm font-bold uppercase tracking-wider">{toast.message}</span>
                </div>
            )}
            
            <div className="space-y-8 max-w-7xl mx-auto">
                <PageHeader
                    title="Control Center"
                    description="Advanced workspace configuration for organization governance and risk orchestration."
                    badge={
                        <div className="flex items-center gap-2">
                            <Settings size={13} className="text-sky-500" />
                            <span className="text-sky-600 dark:text-sky-400 font-bold tracking-tighter">SEC-LEVEL-1</span>
                        </div>
                    }
                    actions={
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm",
                                isMainOfficer ? "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400" : "bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400"
                            )}>
                                <Shield size={12} />
                                {formatRoleLabel(session?.user?.role)}
                            </div>
                            <button
                                onClick={() => void fetchSettings()}
                                className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] transition-all transform active:scale-95 group shadow-sm"
                            >
                                <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                            </button>
                        </div>
                    }
                    stats={[
                        { label: "SOC Signals", value: String([settings?.notifyCritical, settings?.notifyExploited, settings?.notifyCompliance].filter(Boolean).length), icon: Bell },
                        { label: "Policy", value: String(settings?.passwordPolicy || "STRONG"), icon: Key },
                        { label: "Auth Guard", value: settings?.require2FA ? "ENFORCED" : "HYBRID", icon: ShieldCheck },
                        { label: "Inference", value: String(settings?.aiProvider || "OLLAMA"), icon: Zap },
                    ]}
                />

                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    <SettingsSidebar 
                        sections={filteredSections}
                        activeSection={activeSection}
                        setActiveSection={setActiveSection}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                    />

                    <main className="flex-1 w-full min-w-0">
                        <div className="min-h-[500px] animate-in fade-in duration-500">
                             {activeSection === "profile" && <ProfileSection setToast={setToast} />}
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
                                    settings={settings}
                                    updateSettings={updateSettings}
                                    handleSave={handleSave}
                                    isSaving={isSaving}
                                    featureFlags={featureFlags}
                                    updateFeatureFlags={updateFeatureFlags}
                                    handleSaveFeatureFlags={handleSaveFeatureFlags}
                                />
                            )}
                             {activeSection === "mail" && (
                                <MailSection
                                    settings={settings}
                                    updateSettings={updateSettings}
                                    handleSave={handleSave}
                                    isSaving={isSaving}
                                />
                            )}
                             {activeSection === "system-health" && (
                                <SystemHealthSection settings={settings} fetchSettings={fetchSettings} />
                            )}
                             {activeSection === "users" && (
                                <UsersManagementTab 
                                    isAuthorized={canManageUsers} 
                                    formatRoleLabel={formatRoleLabel} 
                                    MAIN_OFFICER_ROLE={MAIN_OFFICER_ROLE} 
                                    ADMIN_ROLE={ADMIN_ROLE}
                                />
                            )}
                             {activeSection === "zenkins" && <ZenkinsSection />}
                        </div>
                    </main>
                </div>
            </div>
        </DashboardLayout>
    );
}

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
