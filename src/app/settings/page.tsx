"use client";

import { useState, useEffect, useCallback } from "react";
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
    Users as UsersIcon,
    ShieldCheck,
    FileText,
    Zap,
    Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SecurityLoader } from "@/components/ui/SecurityLoader";
import { useSession } from "next-auth/react";
import { TwoFactorSettingsPanel } from "@/components/settings/TwoFactorSettingsPanel";

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
            type === "success" ? "bg-green-500/20 border border-green-500/50 text-green-400" : "bg-red-500/20 border border-red-500/50 text-red-400"
        )}>
            {type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <span className="text-sm font-medium">{message}</span>
        </div>
    );
}

const settingsSections = [
    { id: "general", label: "General", icon: Settings },
    { id: "governance", label: "Governance", icon: FileText },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "soc-notifications", label: "SOC Routing", icon: Activity },
    { id: "security", label: "Security", icon: Shield },
    { id: "ai-assist", label: "AI Assist", icon: Zap },
    { id: "system-health", label: "System Health", icon: Activity },
    { id: "integrations", label: "Integrations", icon: Database },
    { id: "api", label: "API Access", icon: Key },
    { id: "users", label: "Users & Roles", icon: UsersIcon },
];

export default function SettingsPage() {
    const { data: session } = useSession();
    const [activeSection, setActiveSection] = useState("general");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState<any>(null);
    const [featureFlags, setFeatureFlags] = useState<any>({});
    const [isEditingGeneral, setIsEditingGeneral] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const isMainOfficer = session?.user?.role === 'MAIN_OFFICER';

    // Load feature flags from localStorage
    const loadFeatureFlags = useCallback(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(FEATURE_FLAGS_KEY);
            if (stored) {
                try {
                    return JSON.parse(stored);
                } catch (e) {
                    console.error("Failed to parse feature flags:", e);
                }
            }
        }
        return getDefaultFeatureFlags();
    }, []);

    // Save feature flags to localStorage
    const saveFeatureFlags = useCallback((flags: any) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(flags));
        }
    }, []);

    const fetchSettings = async () => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/settings");
            const data = await response.json();
            setSettings(data);
            setFeatureFlags(loadFeatureFlags());
        } catch (error) {
            console.error("Failed to fetch settings:", error);
            setToast({ message: "Failed to load settings", type: "error" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

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
        try {
            setIsSaving(true);
            const response = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });

            if (response.ok) {
                const data = await response.json();
                setSettings({ ...settings, ...data });
                setHasUnsavedChanges(false);
                setToast({ message: "Settings saved successfully!", type: "success" });
            } else {
                const error = await response.json();
                setToast({ message: error.error || "Failed to save settings", type: "error" });
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

    const updateSettings = (updates: any) => {
        setSettings({ ...settings, ...updates });
        setHasUnsavedChanges(true);
    };

    const updateFeatureFlags = (updates: any) => {
        setFeatureFlags({ ...featureFlags, ...updates });
    };

    // Filter sections based on search
    const filteredSections = settingsSections.filter(section =>
        section.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <SecurityLoader size="lg" icon="shield" variant="cyber" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Settings</h1>
                        <p className="text-[var(--text-secondary)] mt-1">
                            Configure platform settings and preferences
                        </p>
                    </div>
                    {session?.user && (
                        <div className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-bold uppercase",
                            isMainOfficer ? "bg-purple-500/10 text-purple-400 border border-purple-500/30" : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                        )}>
                            {session.user.role}
                        </div>
                    )}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                    <input
                        type="text"
                        placeholder="Search settings..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pl-10 w-full max-w-md"
                    />
                </div>

                {hasUnsavedChanges && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
                        <AlertTriangle size={18} />
                        <span className="text-sm font-medium">You have unsaved changes</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Settings Navigation */}
                    <div className="lg:col-span-3">
                        <div className="card p-2">
                            {filteredSections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-300 ease-in-out",
                                        activeSection === section.id
                                            ? "bg-blue-500/15 text-blue-400"
                                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                                    )}
                                >
                                    <section.icon size={18} />
                                    <span className="text-sm font-medium">{section.label}</span>
                                    <ChevronRight size={16} className="ml-auto opacity-50" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Settings Content */}
                    <div className="lg:col-span-9">
                        {activeSection === "general" && (
                            <GeneralSection
                                settings={settings}
                                updateSettings={updateSettings}
                                isEditingGeneral={isEditingGeneral}
                                setIsEditingGeneral={setIsEditingGeneral}
                                handleSave={handleSave}
                                fetchSettings={fetchSettings}
                                isSaving={isSaving}
                                isMainOfficer={isMainOfficer}
                            />
                        )}

                        {activeSection === "governance" && (
                            <GovernanceSection
                                featureFlags={featureFlags}
                                updateFeatureFlags={updateFeatureFlags}
                                handleSaveFeatureFlags={handleSaveFeatureFlags}
                                isMainOfficer={isMainOfficer}
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
                                isMainOfficer={isMainOfficer}
                            />
                        )}

                        {activeSection === "security" && (
                            <SecuritySection
                                settings={settings}
                                updateSettings={updateSettings}
                                handleSave={handleSave}
                                isSaving={isSaving}
                                isMainOfficer={isMainOfficer}
                            />
                        )}

                        {activeSection === "ai-assist" && (
                            <AIAssistSection
                                featureFlags={featureFlags}
                                updateFeatureFlags={updateFeatureFlags}
                                handleSaveFeatureFlags={handleSaveFeatureFlags}
                                isMainOfficer={isMainOfficer}
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
            </div>
        </DashboardLayout>
    );
}

// Helper function for default feature flags
function getDefaultFeatureFlags() {
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
            <div className="w-11 h-6 bg-[var(--bg-elevated)] peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500" />
        </label>
    );
}

// Restricted field wrapper
function RestrictedField({ isMainOfficer, children }: { isMainOfficer: boolean; children: React.ReactNode }) {
    if (!isMainOfficer) {
        return (
            <div className="relative">
                <div className="opacity-50 pointer-events-none">{children}</div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-xs font-medium">
                        MAIN_OFFICER only
                    </div>
                </div>
            </div>
        );
    }
    return <>{children}</>;
}

// General Section
function GeneralSection({ settings, updateSettings, isEditingGeneral, setIsEditingGeneral, handleSave, fetchSettings, isSaving, isMainOfficer }: any) {
    return (
        <Card title="General Settings" subtitle="Basic platform configuration">
            <div className="space-y-6">
                <RestrictedField isMainOfficer={isMainOfficer}>
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Organization Name
                        </label>
                        <input
                            type="text"
                            value={settings?.organizationName || ""}
                            onChange={(e) => updateSettings({ organizationName: e.target.value })}
                            className="input"
                            disabled={!isEditingGeneral || !isMainOfficer}
                        />
                    </div>
                </RestrictedField>
                <RestrictedField isMainOfficer={isMainOfficer}>
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Primary Domain
                        </label>
                        <input
                            type="text"
                            value={settings?.domain || ""}
                            onChange={(e) => updateSettings({ domain: e.target.value })}
                            className="input"
                            disabled={!isEditingGeneral || !isMainOfficer}
                        />
                    </div>
                </RestrictedField>
                <div>
                    <label className="block text-sm font-medium text-white mb-2">
                        Timezone
                    </label>
                    <select
                        className="input"
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
                    <label className="block text-sm font-medium text-white mb-2">
                        Date Format
                    </label>
                    <select
                        className="input"
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
                            className="btn btn-secondary"
                            onClick={() => setIsEditingGeneral(true)}
                        >
                            <Settings size={16} />
                            Edit Organization Info
                        </button>
                    ) : (
                        <>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    handleSave();
                                    setIsEditingGeneral(false);
                                }}
                                disabled={isSaving}
                            >
                                <Save size={16} />
                                {isSaving ? "Saving..." : "Save Changes"}
                            </button>
                            <button
                                className="btn btn-ghost"
                                onClick={() => {
                                    setIsEditingGeneral(false);
                                    fetchSettings();
                                }}
                                disabled={isSaving}
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
function GovernanceSection({ featureFlags, updateFeatureFlags, handleSaveFeatureFlags, isMainOfficer }: any) {
    return (
        <Card title="Governance & Compliance" subtitle="Bank-grade change control, audit, and retention">
            <div className="space-y-6">
                <RestrictedField isMainOfficer={isMainOfficer}>
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Change Control
                        </label>
                        <select
                            className="input"
                            value={featureFlags.changeControlMode || "SINGLE_APPROVER"}
                            onChange={(e) => updateFeatureFlags({ changeControlMode: e.target.value })}
                            disabled={!isMainOfficer}
                        >
                            <option value="SINGLE_APPROVER">Single approver</option>
                            <option value="TWO_PERSON_RULE">Two-person rule (recommended for banks)</option>
                        </select>
                    </div>
                </RestrictedField>

                <RestrictedField isMainOfficer={isMainOfficer}>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]">
                        <div>
                            <h4 className="text-sm font-medium text-white">
                                Require reason for settings changes
                            </h4>
                            <p className="text-xs text-[var(--text-muted)]">
                                Enforce change justification for audit trail
                            </p>
                        </div>
                        <Toggle
                            checked={featureFlags.settingsChangeReasonRequired ?? true}
                            onChange={(checked) => updateFeatureFlags({ settingsChangeReasonRequired: checked })}
                            disabled={!isMainOfficer}
                        />
                    </div>
                </RestrictedField>

                <RestrictedField isMainOfficer={isMainOfficer}>
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Audit Log Retention (days)
                        </label>
                        <input
                            type="number"
                            min="30"
                            max="3650"
                            value={featureFlags.auditLogRetentionDays || 365}
                            onChange={(e) => updateFeatureFlags({ auditLogRetentionDays: parseInt(e.target.value) })}
                            className="input w-32"
                            disabled={!isMainOfficer}
                        />
                        <p className="text-xs text-[var(--text-muted)] mt-1">Min: 30 days, Max: 3650 days</p>
                    </div>
                </RestrictedField>

                <RestrictedField isMainOfficer={isMainOfficer}>
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Vulnerability Data Retention (days)
                        </label>
                        <input
                            type="number"
                            min="30"
                            max="3650"
                            value={featureFlags.dataRetentionDays || 730}
                            onChange={(e) => updateFeatureFlags({ dataRetentionDays: parseInt(e.target.value) })}
                            className="input w-32"
                            disabled={!isMainOfficer}
                        />
                        <p className="text-xs text-[var(--text-muted)] mt-1">Min: 30 days, Max: 3650 days</p>
                    </div>
                </RestrictedField>

                <div className="pt-4 border-t border-[var(--border-color)]">
                    <button
                        className="btn btn-primary"
                        onClick={handleSaveFeatureFlags}
                        disabled={!isMainOfficer}
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
function SOCRoutingSection({ featureFlags, updateFeatureFlags, handleSaveFeatureFlags, isMainOfficer }: any) {
    return (
        <Card title="SOC Routing" subtitle="Alert thresholds, quiet hours, and escalation">
            <div className="space-y-6">
                <RestrictedField isMainOfficer={isMainOfficer}>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]">
                        <div>
                            <h4 className="text-sm font-medium text-white">Quiet Hours</h4>
                            <p className="text-xs text-[var(--text-muted)]">
                                Suppress non-critical alerts during specified hours
                            </p>
                        </div>
                        <Toggle
                            checked={featureFlags.quietHoursEnabled || false}
                            onChange={(checked) => updateFeatureFlags({ quietHoursEnabled: checked })}
                            disabled={!isMainOfficer}
                        />
                    </div>
                </RestrictedField>

                {featureFlags.quietHoursEnabled && (
                    <RestrictedField isMainOfficer={isMainOfficer}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Quiet Hours Start
                                </label>
                                <input
                                    type="time"
                                    value={featureFlags.quietHoursStart || "22:00"}
                                    onChange={(e) => updateFeatureFlags({ quietHoursStart: e.target.value })}
                                    className="input"
                                    disabled={!isMainOfficer}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white mb-2">
                                    Quiet Hours End
                                </label>
                                <input
                                    type="time"
                                    value={featureFlags.quietHoursEnd || "06:00"}
                                    onChange={(e) => updateFeatureFlags({ quietHoursEnd: e.target.value })}
                                    className="input"
                                    disabled={!isMainOfficer}
                                />
                            </div>
                        </div>
                    </RestrictedField>
                )}

                <RestrictedField isMainOfficer={isMainOfficer}>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]">
                        <div>
                            <h4 className="text-sm font-medium text-white">
                                Only alert on KEV when enabled
                            </h4>
                            <p className="text-xs text-[var(--text-muted)]">
                                Limit alerts to CISA Known Exploited Vulnerabilities
                            </p>
                        </div>
                        <Toggle
                            checked={featureFlags.notifyKevOnly || false}
                            onChange={(checked) => updateFeatureFlags({ notifyKevOnly: checked })}
                            disabled={!isMainOfficer}
                        />
                    </div>
                </RestrictedField>

                <RestrictedField isMainOfficer={isMainOfficer}>
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            EPSS Alert Threshold (0.0–1.0)
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            value={featureFlags.epssAlertThreshold || 0.5}
                            onChange={(e) => updateFeatureFlags({ epssAlertThreshold: parseFloat(e.target.value) })}
                            className="input w-32"
                            disabled={!isMainOfficer}
                        />
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                            Alert when EPSS score exceeds this threshold
                        </p>
                    </div>
                </RestrictedField>

                <div className="pt-4 border-t border-[var(--border-color)]">
                    <button
                        className="btn btn-primary"
                        onClick={handleSaveFeatureFlags}
                        disabled={!isMainOfficer}
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
function NotificationsSection({ settings, updateSettings, handleSave, isSaving }: any) {
    return (
        <Card title="Notification Settings" subtitle="Configure alerts and notifications">
            <div className="space-y-4">
                {[
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
                ].map((notification) => (
                    <div
                        key={notification.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]"
                    >
                        <div>
                            <h4 className="text-sm font-medium text-white">
                                {notification.title}
                            </h4>
                            <p className="text-xs text-[var(--text-muted)]">
                                {notification.description}
                            </p>
                        </div>
                        <Toggle
                            checked={settings?.[notification.id] || false}
                            onChange={(checked) => updateSettings({ [notification.id]: checked })}
                        />
                    </div>
                ))}
                <div className="pt-4 border-t border-[var(--border-color)]">
                    <button
                        className="btn btn-primary"
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

// Security Section
function SecuritySection({ settings, updateSettings, handleSave, isSaving, isMainOfficer }: any) {
    return (
        <Card title="Security Settings" subtitle="Authentication and access control">
            <div className="space-y-6">
                <p className="text-sm text-[var(--text-muted)] p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    Bank-grade defaults: require2FA=true, sessionTimeout=15–30 min, passwordPolicy=STRONG
                </p>

                <RestrictedField isMainOfficer={isMainOfficer}>
                    <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h4 className="text-sm font-medium text-white">
                                    AI Risk Intelligence
                                </h4>
                                <p className="text-xs text-[var(--text-muted)]">
                                    Automatically analyze new vulnerabilities with AI
                                </p>
                            </div>
                            <Toggle
                                checked={settings?.aiRiskAssessmentEnabled !== false}
                                onChange={(checked) => updateSettings({ aiRiskAssessmentEnabled: checked })}
                                disabled={!isMainOfficer}
                            />
                        </div>
                    </div>
                </RestrictedField>

                <RestrictedField isMainOfficer={isMainOfficer}>
                    <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h4 className="text-sm font-medium text-white">
                                    Two-Factor Authentication
                                </h4>
                                <p className="text-xs text-[var(--text-muted)]">
                                    Require 2FA for all users
                                </p>
                            </div>
                            <Toggle
                                checked={settings?.require2FA || false}
                                onChange={(checked) => updateSettings({ require2FA: checked })}
                                disabled={!isMainOfficer}
                            />
                        </div>
                    </div>
                </RestrictedField>

                <TwoFactorSettingsPanel />

                <RestrictedField isMainOfficer={isMainOfficer}>
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Session Timeout (minutes)
                        </label>
                        <input
                            type="number"
                            value={settings?.sessionTimeout || 30}
                            onChange={(e) => updateSettings({ sessionTimeout: parseInt(e.target.value) })}
                            className="input w-32"
                            disabled={!isMainOfficer}
                        />
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                            Recommended: 15–30 minutes for banking environments
                        </p>
                    </div>
                </RestrictedField>

                <RestrictedField isMainOfficer={isMainOfficer}>
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Password Policy
                        </label>
                        <select
                            className="input"
                            value={settings?.passwordPolicy || "STRONG"}
                            onChange={(e) => updateSettings({ passwordPolicy: e.target.value })}
                            disabled={!isMainOfficer}
                        >
                            <option value="STRONG">Strong (12+ chars, mixed case, numbers, symbols)</option>
                            <option value="MEDIUM">Medium (8+ chars, mixed case, numbers)</option>
                            <option value="BASIC">Basic (8+ chars)</option>
                        </select>
                    </div>
                </RestrictedField>

                <div className="pt-4 border-t border-[var(--border-color)]">
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={isSaving || !isMainOfficer}
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
function AIAssistSection({ featureFlags, updateFeatureFlags, handleSaveFeatureFlags, isMainOfficer }: any) {
    return (
        <Card title="AI Assist" subtitle="Guardrails for OpenRouter and risk autofill">
            <div className="space-y-6">
                <RestrictedField isMainOfficer={isMainOfficer}>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]">
                        <div>
                            <h4 className="text-sm font-medium text-white">Enable AI Assist</h4>
                            <p className="text-xs text-[var(--text-muted)]">
                                Master switch for all AI-powered features
                            </p>
                        </div>
                        <Toggle
                            checked={featureFlags.aiAssistEnabled || false}
                            onChange={(checked) => updateFeatureFlags({ aiAssistEnabled: checked })}
                            disabled={!isMainOfficer}
                        />
                    </div>
                </RestrictedField>

                <RestrictedField isMainOfficer={isMainOfficer}>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]">
                        <div>
                            <h4 className="text-sm font-medium text-white">
                                Risk Register Autofill
                            </h4>
                            <p className="text-xs text-[var(--text-muted)]">
                                When users enter Threat + CIA impacts, AI suggests remaining fields
                            </p>
                        </div>
                        <Toggle
                            checked={featureFlags.aiRiskAutofillEnabled || false}
                            onChange={(checked) => updateFeatureFlags({ aiRiskAutofillEnabled: checked })}
                            disabled={!isMainOfficer}
                        />
                    </div>
                </RestrictedField>

                <RestrictedField isMainOfficer={isMainOfficer}>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)]">
                        <div>
                            <h4 className="text-sm font-medium text-white">
                                Require human review before saving AI suggestions
                            </h4>
                            <p className="text-xs text-[var(--text-muted)]">
                                Prevent automatic acceptance of AI-generated content
                            </p>
                        </div>
                        <Toggle
                            checked={featureFlags.aiHumanReviewRequired ?? true}
                            onChange={(checked) => updateFeatureFlags({ aiHumanReviewRequired: checked })}
                            disabled={!isMainOfficer}
                        />
                    </div>
                </RestrictedField>

                <RestrictedField isMainOfficer={isMainOfficer}>
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Data Redaction
                        </label>
                        <select
                            className="input"
                            value={featureFlags.aiDataRedactionMode || "STRICT"}
                            onChange={(e) => updateFeatureFlags({ aiDataRedactionMode: e.target.value })}
                            disabled={!isMainOfficer}
                        >
                            <option value="STRICT">Strict (no PII, no internal hostnames)</option>
                            <option value="STANDARD">Standard</option>
                        </select>
                    </div>
                </RestrictedField>

                <RestrictedField isMainOfficer={isMainOfficer}>
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Allowed Models (allowlist)
                        </label>
                        <div className="space-y-2">
                            {["openai/gpt-4o-mini", "openai/gpt-4.1-mini", "anthropic/claude-3.5-sonnet", "google/gemini-1.5-pro"].map((model) => (
                                <label key={model} className="flex items-center gap-2 p-2 rounded bg-[var(--bg-tertiary)]">
                                    <input
                                        type="checkbox"
                                        checked={(featureFlags.aiModelAllowlist || []).includes(model)}
                                        onChange={(e) => {
                                            const current = featureFlags.aiModelAllowlist || [];
                                            const updated = e.target.checked
                                                ? [...current, model]
                                                : current.filter((m: string) => m !== model);
                                            updateFeatureFlags({ aiModelAllowlist: updated });
                                        }}
                                        disabled={!isMainOfficer}
                                        className="rounded"
                                    />
                                    <span className="text-sm text-white">{model}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </RestrictedField>

                <div className="pt-4 border-t border-[var(--border-color)]">
                    <button
                        className="btn btn-primary"
                        onClick={handleSaveFeatureFlags}
                        disabled={!isMainOfficer}
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
function SystemHealthSection({ settings, fetchSettings }: any) {
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
                            <span className="text-sm text-white">{env.label}</span>
                            {env.configured ? (
                                <span className="flex items-center gap-1 text-xs font-medium text-green-400">
                                    <CheckCircle2 size={14} />
                                    Configured
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs font-medium text-red-400">
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
                    <button className="btn btn-secondary" onClick={fetchSettings}>
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
                                <h4 className="text-sm font-medium text-white">
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
                    <h4 className="text-sm font-medium text-white mb-3">API Keys</h4>
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
                                    <p className="text-sm text-white">{key.name}</p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Created: {key.created} • Last used: {key.lastUsed}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="btn btn-ghost text-xs py-1" disabled>
                                        Reveal
                                    </button>
                                    <button className="btn btn-ghost text-xs py-1 text-red-400" disabled>
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
    const { data: session } = useSession();
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/users");
            const data = await response.json();
            if (Array.isArray(data)) setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            setIsUpdating(userId);
            const response = await fetch("/api/users", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, role: newRole }),
            });

            if (response.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            } else {
                const err = await response.json();
                alert(err.error || "Failed to update role");
            }
        } catch (error) {
            console.error("Failed to update role:", error);
        } finally {
            setIsUpdating(null);
        }
    };

    if (session?.user?.role !== 'MAIN_OFFICER') {
        return (
            <Card title="Restricted Access" subtitle="Permissions required">
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <ShieldCheck size={48} className="text-red-500/50 mb-4" />
                    <p className="text-[var(--text-secondary)] max-w-md">
                        Only users with the <span className="text-white font-bold">MAIN_OFFICER</span> role can manage user permissions and roles.
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
                        <SecurityLoader size="md" icon="shield" variant="cyber" />
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
                                                <p className="font-medium text-white">{user.name}</p>
                                                <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={cn(
                                                "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                                                user.role === 'MAIN_OFFICER' ? "bg-purple-500/10 text-purple-400" :
                                                    user.role === 'ANALYST' ? "bg-blue-500/10 text-blue-400" :
                                                        "bg-gray-500/10 text-gray-400"
                                            )}>
                                                {user.role}
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
                                                    <option value="MAIN_OFFICER">MAIN_OFFICER</option>
                                                </select>
                                                {isUpdating === user.id && (
                                                    <SecurityLoader size="xs" icon="shield" />
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
