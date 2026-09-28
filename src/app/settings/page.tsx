"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { ReactNode } from "react";
import {
    Settings,
    Bell,
    Shield,
    Database,
    ChevronRight,
    Save,
    Search,
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
import { useRouter } from "next/navigation";
import { TwoFactorSettingsPanel } from "@/components/settings/TwoFactorSettingsPanel";
import { AiProviderSettingsPanel } from "@/components/settings/AiProviderSettingsPanel";
import { useUiFeedback } from "@/hooks/useUiFeedback";
import { Button } from "@repo/design-system/components/ui/button";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Input } from "@repo/design-system/components/ui/input";
import {
    Card as ForgeCard,
    CardContent as ForgeCardContent,
    CardDescription as ForgeCardDescription,
    CardHeader as ForgeCardHeader,
    CardTitle as ForgeCardTitle,
} from "@repo/design-system/components/ui/card";
import { Switch } from "@repo/design-system/components/ui/switch";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import {
    Select as ForgeSelect,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@repo/design-system/components/ui/select";

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
            type === "success" ? "bg-green-500/20 border border-green-500/50 text-emerald-700 dark:text-emerald-300" : "bg-red-500/20 border border-red-500/50 text-intent-danger"
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
    { id: "users", label: "Users & Roles", description: "Role assignment and access administration", icon: UsersIcon, mainOfficerOnly: true },
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

function SettingsPanel({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
    return (
        <ForgeCard className="gap-0 overflow-hidden">
            <ForgeCardHeader className="gap-2 border-b px-5 pt-4 pb-3 md:px-6 [&.border-b]:pb-3">
                <ForgeCardTitle className="text-base">{title}</ForgeCardTitle>
                {subtitle ? <ForgeCardDescription>{subtitle}</ForgeCardDescription> : null}
            </ForgeCardHeader>
            <ForgeCardContent className="flex flex-col gap-4 px-5 pt-4 pb-5 md:px-6 md:pb-6">{children}</ForgeCardContent>
        </ForgeCard>
    );
}

function SettingsSelect({
    id,
    value,
    onChange,
    options,
    className,
    disabled,
}: {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    className?: string;
    disabled?: boolean;
}) {
    const selected = value || "__none";
    return (
        <ForgeSelect value={selected} onValueChange={(next) => onChange(next === "__none" ? "" : next)} disabled={disabled}>
            <SelectTrigger id={id} className={cn("w-full", className)}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    {options.map((option) => (
                        <SelectItem key={option.value || "__none"} value={option.value || "__none"}>{option.label}</SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </ForgeSelect>
    );
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
        () => settingsSections.filter((section) => !section.mainOfficerOnly || isMainOfficer),
        [isMainOfficer],
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
            <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 md:p-5 xl:p-6">
                <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Settings</h1>
                            <Badge variant="outline" className="font-normal">{formatRoleLabel(session?.user?.role)}</Badge>
                            {hasUnsavedChanges ? <Badge variant="secondary">Unsaved changes</Badge> : null}
                        </div>
                        <p className="max-w-2xl text-sm text-muted-foreground">Manage organization preferences, security controls, notifications, and integrations.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={fetchSettings} disabled={isSaving}>
                        <Activity className="mr-2 size-4" />Refresh settings
                    </Button>
                </header>

                <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:gap-5">
                    <aside className="lg:sticky lg:top-20">
                        <ForgeCard className="gap-0">
                            <ForgeCardHeader className="space-y-3 p-4">
                                <div>
                                    <ForgeCardTitle className="text-base">Workspace settings</ForgeCardTitle>
                                    <ForgeCardDescription className="mt-1">Find a section to manage</ForgeCardDescription>
                                </div>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                    <Input aria-label="Search settings" placeholder="Search settings…" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" />
                                </div>
                            </ForgeCardHeader>
                            <ForgeCardContent className="space-y-1 px-2 pb-3">
                                {filteredSections.map((section) => {
                                    const active = activeSection === section.id;
                                    return (
                                        <Button key={section.id} type="button" variant={active ? "secondary" : "ghost"} className={cn("h-auto w-full justify-start gap-3 px-3 py-2.5 text-left", active && "bg-accent text-accent-foreground")} aria-current={active ? "page" : undefined} onClick={() => setActiveSection(section.id)}>
                                            <section.icon className="size-4 shrink-0" aria-hidden="true" />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium">{section.label}</span>
                                                <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">{section.description}</span>
                                            </span>
                                            {section.mainOfficerOnly ? <Badge variant="outline" className="px-1.5 py-0 text-[10px]">Officer</Badge> : null}
                                            {active ? <ChevronRight className="size-4 shrink-0" aria-hidden="true" /> : null}
                                        </Button>
                                    );
                                })}
                                {filteredSections.length === 0 ? <p className="px-3 py-5 text-center text-sm text-muted-foreground">No settings sections match your search.</p> : null}
                            </ForgeCardContent>
                        </ForgeCard>
                    </aside>

                    <div className="min-w-0">
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
    return <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label="Toggle setting" />;
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
        <SettingsPanel title="General Settings" subtitle="Basic platform configuration">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Organization Name
                    </label>
                    <Input
                        type="text"
                        value={settings?.organizationName || ""}
                        onChange={(e) => updateSettings({ organizationName: e.target.value })}
                        className="input bg-background border-border text-foreground"
                        disabled={!isEditingGeneral}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Primary Domain
                    </label>
                    <Input
                        type="text"
                        value={settings?.domain || ""}
                        onChange={(e) => updateSettings({ domain: e.target.value })}
                        className="input bg-background border-border text-foreground"
                        disabled={!isEditingGeneral}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Timezone
                    </label>
                    <SettingsSelect
                        value={settings?.timezone || "UTC"}
                        onChange={(timezone) => updateSettings({ timezone })}
                        options={["UTC", "America/New_York", "Europe/London", "Asia/Tokyo", "Asia/Kathmandu"].map((timezone) => ({ value: timezone, label: timezone }))}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Date Format
                    </label>
                    <SettingsSelect
                        value={settings?.dateFormat || "MMM DD, YYYY"}
                        onChange={(dateFormat) => updateSettings({ dateFormat })}
                        options={["MMM DD, YYYY", "DD/MM/YYYY", "YYYY-MM-DD"].map((dateFormat) => ({ value: dateFormat, label: dateFormat }))}
                    />
                </div>
                <div className="pt-4 border-t border-border flex gap-3">
                    {!isEditingGeneral ? (
                        <Button
                            variant="outline"
                            onClick={() => setIsEditingGeneral(true)}
                        >
                            <Settings size={16} />
                            Edit Organization Info
                        </Button>
                    ) : (
                        <>
                            <Button
                                onClick={async () => {
                                    await handleSave();
                                    setIsEditingGeneral(false);
                                }}
                                disabled={isSaving}
                                variant="default" className="text-primary-foreground"
                            >
                                <Save size={16} />
                                {isSaving ? "Saving..." : "Save Changes"}
                            </Button>
                            <Button
                                onClick={() => {
                                    setIsEditingGeneral(false);
                                    void fetchSettings();
                                }}
                                disabled={isSaving}
                                variant="outline"
                            >
                                Cancel
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </SettingsPanel>
    );
}

// Governance Section
function GovernanceSection({ featureFlags, updateFeatureFlags, handleSaveFeatureFlags }: FeatureFlagSectionProps) {
    return (
        <SettingsPanel title="Governance & Compliance" subtitle="Bank-grade change control, audit, and retention">
            <div className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Change Control
                    </label>
                    <SettingsSelect
                        value={featureFlags.changeControlMode || "SINGLE_APPROVER"}
                        onChange={(changeControlMode) => updateFeatureFlags({ changeControlMode })}
                        options={[{ value: "SINGLE_APPROVER", label: "Single approver" }, { value: "TWO_PERSON_RULE", label: "Two-person rule" }]}
                    />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                        <h4 className="text-sm font-medium text-foreground">
                            Require reason for settings changes
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Enforce change justification for audit trail
                        </p>
                    </div>
                    <Toggle
                        checked={featureFlags.settingsChangeReasonRequired ?? true}
                        onChange={(checked) => updateFeatureFlags({ settingsChangeReasonRequired: checked })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Audit Log Retention (days)
                    </label>
                    <Input
                        type="number"
                        min="30"
                        max="3650"
                        value={featureFlags.auditLogRetentionDays || 365}
                        onChange={(e) => updateFeatureFlags({ auditLogRetentionDays: parseInt(e.target.value) })}
                        className="input w-32 bg-background border-border text-foreground"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Min: 30 days, Max: 3650 days</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Vulnerability Data Retention (days)
                    </label>
                    <Input
                        type="number"
                        min="30"
                        max="3650"
                        value={featureFlags.dataRetentionDays || 730}
                        onChange={(e) => updateFeatureFlags({ dataRetentionDays: parseInt(e.target.value) })}
                        className="input w-32 bg-background border-border text-foreground"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Min: 30 days, Max: 3650 days</p>
                </div>

                <div className="pt-4 border-t border-border">
                    <Button
                        variant="default" className="text-primary-foreground"
                        onClick={handleSaveFeatureFlags}
                    >
                        <Save size={16} />
                        Save (Feature Flags)
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                        Note: Stored in localStorage (no DB schema changes)
                    </p>
                </div>
            </div>
        </SettingsPanel>
    );
}

// SOC Routing Section
function SOCRoutingSection({ featureFlags, updateFeatureFlags, handleSaveFeatureFlags }: FeatureFlagSectionProps) {
    return (
        <SettingsPanel title="SOC Routing" subtitle="Alert thresholds, quiet hours, and escalation">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                        <h4 className="text-sm font-medium text-foreground">Quiet Hours</h4>
                        <p className="text-xs text-muted-foreground">
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
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Quiet Hours Start
                            </label>
                            <Input
                                type="time"
                                value={featureFlags.quietHoursStart || "22:00"}
                                onChange={(e) => updateFeatureFlags({ quietHoursStart: e.target.value })}
                                className="input bg-background border-border text-foreground"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Quiet Hours End
                            </label>
                            <Input
                                type="time"
                                value={featureFlags.quietHoursEnd || "06:00"}
                                onChange={(e) => updateFeatureFlags({ quietHoursEnd: e.target.value })}
                                className="input bg-background border-border text-foreground"
                            />
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                        <h4 className="text-sm font-medium text-foreground">
                            Only alert on KEV when enabled
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Limit alerts to CISA Known Exploited Vulnerabilities
                        </p>
                    </div>
                    <Toggle
                        checked={featureFlags.notifyKevOnly || false}
                        onChange={(checked) => updateFeatureFlags({ notifyKevOnly: checked })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        EPSS Alert Threshold (0.0–1.0)
                    </label>
                    <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.01"
                        value={featureFlags.epssAlertThreshold || 0.5}
                        onChange={(e) => updateFeatureFlags({ epssAlertThreshold: parseFloat(e.target.value) })}
                        className="input w-32 bg-background border-border text-foreground"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Alert when EPSS score exceeds this threshold
                    </p>
                </div>

                <div className="pt-4 border-t border-border">
                    <Button
                        variant="default" className="text-primary-foreground"
                        onClick={handleSaveFeatureFlags}
                    >
                        <Save size={16} />
                        Save (Feature Flags)
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                        Note: Stored in localStorage (no DB schema changes)
                    </p>
                </div>
            </div>
        </SettingsPanel>
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
        <SettingsPanel title="Notification Settings" subtitle="Configure alerts and notification routing">
            <div className="flex flex-col gap-4">
                {notifications.map((notification) => (
                    <div
                        key={notification.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                        <div>
                            <h4 className="text-sm font-medium text-foreground">
                                {notification.title}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                {notification.description}
                            </p>
                        </div>
                        <Toggle
                            checked={Boolean(settings?.[notification.id])}
                            onChange={(checked) => updateSettings({ [notification.id]: checked })}
                        />
                    </div>
                ))}

                <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <h4 className="text-sm font-semibold text-foreground">Rule-Based Notification Routing</h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Route by event type, severity, and exploit context.
                    </p>
                    {rulesError ? (
                        <p className="mt-2 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-destructive">
                            {rulesError}
                        </p>
                    ) : null}

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <Input
                            className="input bg-background border-border text-foreground"
                            placeholder="Rule name"
                            value={newRule.name}
                            onChange={(e) => setNewRule((prev) => ({ ...prev, name: e.target.value }))}
                        />
                        <div className="input flex items-center text-sm text-muted-foreground bg-background border-border">Channel: IN_APP</div>
                        <Input
                            className="input bg-background border-border text-foreground"
                            placeholder="Event type (e.g. VULNERABILITY_CREATED)"
                            value={newRule.eventType}
                            onChange={(e) => setNewRule((prev) => ({ ...prev, eventType: e.target.value }))}
                        />
                        <SettingsSelect
                            value={newRule.minimumSeverity}
                            onChange={(minimumSeverity) => setNewRule((prev) => ({ ...prev, minimumSeverity }))}
                            options={[{ value: "", label: "No minimum severity" }, ...["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"].map((value) => ({ value, label: value }))]}
                        />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4">
                        <label className="inline-flex items-center gap-2 text-xs text-foreground/80">
                            <Checkbox checked={newRule.includeExploited} onCheckedChange={(checked) => setNewRule((prev) => ({ ...prev, includeExploited: checked === true }))} />
                            Include exploited vulnerabilities
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs text-foreground/80">
                            <Checkbox checked={newRule.includeKev} onCheckedChange={(checked) => setNewRule((prev) => ({ ...prev, includeKev: checked === true }))} />
                            Include CISA KEV only
                        </label>
                        <Button
                            variant="outline" size="sm"
                            onClick={() => void createRule()}
                            disabled={!newRule.name.trim()}
                        >
                            <Plus size={14} />
                            Add Rule
                        </Button>
                    </div>

                    <div className="mt-3 flex flex-col gap-2">
                        {isLoadingRules ? (
                            <p className="text-xs text-muted-foreground">Loading rules...</p>
                        ) : rules.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No notification rules yet.</p>
                        ) : (
                            rules.map((rule) => (
                                <div
                                    key={rule.id}
                                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-semibold text-foreground">
                                            {rule.name}
                                        </p>
                                        <p className="truncate text-[11px] text-foreground/80">
                                            {rule.channel} • {rule.eventType}
                                            {rule.minimumSeverity ? ` • ${rule.minimumSeverity}+` : ""}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Toggle checked={rule.isActive} onChange={() => void toggleRule(rule)} />
                                        <Button
                                            variant="destructive" size="sm"
                                            onClick={() => void deleteRule(rule.id)}
                                        >
                                            <Trash2 size={12} />
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="pt-4 border-t border-border">
                    <Button
                        variant="default" className="text-primary-foreground"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        <Save size={16} />
                        {isSaving ? "Saving..." : "Save Core Notification Preferences"}
                    </Button>
                </div>
            </div>
        </SettingsPanel>
    );
}

// Security Section
function SecuritySection({ settings, updateSettings, handleSave, isSaving }: SecuritySectionProps) {
    return (
        <SettingsPanel title="Security Settings" subtitle="Authentication and access control">
            <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted border border-border">
                    Bank-grade defaults: require2FA=true, sessionTimeout=15–30 min, passwordPolicy=STRONG
                </p>

                <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h4 className="text-sm font-medium text-foreground">
                                AI Risk Intelligence
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                Automatically analyze new vulnerabilities with AI
                            </p>
                        </div>
                        <Toggle
                            checked={settings?.aiRiskAssessmentEnabled !== false}
                            onChange={(checked) => updateSettings({ aiRiskAssessmentEnabled: checked })}
                        />
                    </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h4 className="text-sm font-medium text-foreground">
                                Enforce 2FA Organization-wide
                            </h4>
                            <p className="text-xs text-muted-foreground">
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

                <AiProviderSettingsPanel />

                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Session Timeout (minutes)
                    </label>
                    <Input
                        type="number"
                        value={settings?.sessionTimeout || 30}
                        onChange={(e) => updateSettings({ sessionTimeout: parseInt(e.target.value) })}
                        className="input w-32 bg-background border-border text-foreground"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Recommended: 15–30 minutes for banking environments
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Password Policy
                    </label>
                    <SettingsSelect
                        value={settings?.passwordPolicy || "STRONG"}
                        onChange={(passwordPolicy) => updateSettings({ passwordPolicy })}
                        options={[{ value: "STRONG", label: "Strong (12+ characters)" }, { value: "MEDIUM", label: "Medium (8+ characters)" }, { value: "BASIC", label: "Basic (8+ characters)" }]}
                    />
                </div>

                <div className="pt-4 border-t border-border">
                    <Button
                        variant="default" className="text-primary-foreground"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        <Save size={16} />
                        {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>
        </SettingsPanel>
    );
}

// AI Assist Section
function AIAssistSection({ featureFlags, updateFeatureFlags, handleSaveFeatureFlags }: FeatureFlagSectionProps) {
    return (
        <SettingsPanel title="AI Assist" subtitle="Guardrails for OpenRouter and risk autofill">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                        <h4 className="text-sm font-medium text-foreground">Enable AI Assist</h4>
                        <p className="text-xs text-muted-foreground">
                            Master switch for all AI-powered features
                        </p>
                    </div>
                    <Toggle
                        checked={featureFlags.aiAssistEnabled || false}
                        onChange={(checked) => updateFeatureFlags({ aiAssistEnabled: checked })}
                    />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                        <h4 className="text-sm font-medium text-foreground">
                            Risk Register Autofill
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            When users enter Threat + CIA impacts, AI suggests remaining fields
                        </p>
                    </div>
                    <Toggle
                        checked={featureFlags.aiRiskAutofillEnabled || false}
                        onChange={(checked) => updateFeatureFlags({ aiRiskAutofillEnabled: checked })}
                    />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                        <h4 className="text-sm font-medium text-foreground">
                            Require human review
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Prevent automatic acceptance of AI-generated content
                        </p>
                    </div>
                    <Toggle
                        checked={featureFlags.aiHumanReviewRequired ?? true}
                        onChange={(checked) => updateFeatureFlags({ aiHumanReviewRequired: checked })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Data Redaction
                    </label>
                    <SettingsSelect
                        value={featureFlags.aiDataRedactionMode || "STRICT"}
                        onChange={(aiDataRedactionMode) => updateFeatureFlags({ aiDataRedactionMode })}
                        options={[{ value: "STRICT", label: "Strict (no PII or internal hostnames)" }, { value: "STANDARD", label: "Standard" }]}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Allowed Models
                    </label>
                    <div className="flex flex-col gap-2">
                        {["openai/gpt-4o-mini", "openai/gpt-4.1-mini", "anthropic/claude-3.5-sonnet", "google/gemini-1.5-pro"].map((model) => (
                            <label key={model} className="flex items-center gap-2 p-2 rounded bg-muted/50 cursor-pointer hover:bg-accent transition-colors">
                                <Checkbox
                                    checked={(featureFlags.aiModelAllowlist || []).includes(model)}
                                    onCheckedChange={(checked) => {
                                        const current = featureFlags.aiModelAllowlist || [];
                                        const updated = checked === true
                                            ? [...current, model]
                                            : current.filter((m) => m !== model);
                                        updateFeatureFlags({ aiModelAllowlist: updated });
                                    }}
                                />
                                <span className="text-sm text-foreground">{model}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t border-border">
                    <Button
                        variant="default" className="text-primary-foreground"
                        onClick={handleSaveFeatureFlags}
                    >
                        <Save size={16} />
                        Save (Feature Flags)
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                        Note: Stored in localStorage (no DB schema changes)
                    </p>
                </div>
            </div>
        </SettingsPanel>
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
        <SettingsPanel title="System Health" subtitle="Key configuration status (no secrets exposed)">
            <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {envVars.map((env) => (
                        <div
                            key={env.key}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                            <span className="text-sm text-foreground">{env.label}</span>
                            {env.configured ? (
                                <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
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
                    <p className="text-xs text-muted-foreground mt-4">
                        Last checked: {new Date(settings.serverTimestamp).toLocaleString()}
                    </p>
                )}

                <div className="pt-4 border-t border-border">
                    <Button variant="outline" onClick={fetchSettings}>
                        <Activity size={16} />
                        Refresh Status
                    </Button>
                </div>
            </div>
        </SettingsPanel>
    );
}

// Integrations Section
function IntegrationsSection() {
    return (
        <SettingsPanel title="Integrations" subtitle="Third-party service connections">
            <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted border border-border">
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
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{integration.icon}</span>
                            <div>
                                <h4 className="text-sm font-medium text-foreground">
                                    {integration.name}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    Coming soon
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" disabled>
                            Configure
                        </Button>
                    </div>
                ))}
            </div>
        </SettingsPanel>
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
            <SettingsPanel title="Restricted Access" subtitle="Permissions required">
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <ShieldCheck size={48} className="text-destructive mb-4" />
                    <p className="text-foreground/80 max-w-md">
                        Only users with the <span className="text-foreground font-bold">MAIN-OFFICER</span> role can manage user permissions and roles.
                    </p>
                </div>
            </SettingsPanel>
        );
    }

    return (
        <SettingsPanel title="User Management" subtitle="Manage permissions and platform access levels">
            <div className="flex flex-col gap-3">
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <ShieldLoader size="md" variant="cyber" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-xs uppercase text-muted-foreground border-b border-border">
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
                                                <p className="font-medium text-foreground">{user.name}</p>
                                                <p className="text-xs text-muted-foreground">{user.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={cn(
                                                "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                                user.role === MAIN_OFFICER_ROLE ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" :
                                                    user.role === 'ANALYST' ? "bg-muted text-intent-accent" :
                                                        "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                                            )}>
                                                {formatRoleLabel(user.role)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <SettingsSelect
                                                    className="w-36"
                                                    value={user.role}
                                                    onChange={(role) => handleRoleChange(user.id, role)}
                                                    disabled={isUpdating === user.id}
                                                    options={[{ value: "ANALYST", label: "Analyst" }, { value: "IT_OFFICER", label: "IT Officer" }, { value: "PENTESTER", label: "Pentester" }, { value: "MAIN_OFFICER", label: "Main Officer" }]}
                                                />
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
        </SettingsPanel>
    );
}
