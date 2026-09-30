"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card as ForgeCard,
  CardContent as ForgeCardContent,
  CardDescription as ForgeCardDescription,
  CardHeader as ForgeCardHeader,
  CardTitle as ForgeCardTitle,
} from "@repo/design-system/components/ui/card";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Select as ForgeSelect,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Switch } from "@repo/design-system/components/ui/switch";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  CheckCircle2,
  ChevronRight,
  Database,
  FileText,
  Plus,
  Save,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Trash2,
  Users as UsersIcon,
  XCircle,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AiProviderSettingsPanel } from "@/components/settings/AiProviderSettingsPanel";
import { TwoFactorSettingsPanel } from "@/components/settings/TwoFactorSettingsPanel";
import { ShieldLoader } from "@/components/ui/ShieldLoader";
import { TimePickerField } from "@/components/ui/TimePickerField";
import { useUiFeedback } from "@/hooks/useUiFeedback";
import { cn } from "@/lib/utils";

// Feature flags storage key
const FEATURE_FLAGS_KEY = "secyourflow.settings.featureFlags.v1";

// Toast notification component (simple, no external deps)
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={cn(
        "slide-in-from-top fixed top-4 right-4 z-50 flex animate-in items-center gap-2 rounded-lg px-4 py-3 shadow-lg",
        type === "success"
          ? "border border-green-500/50 bg-green-500/20 text-emerald-700 dark:text-emerald-300"
          : "border border-red-500/50 bg-red-500/20 text-intent-danger"
      )}
    >
      {type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
      <span className="font-medium text-sm">{message}</span>
    </div>
  );
}

interface SettingSystemHealth {
  databaseUrlConfigured?: boolean;
  githubTokenConfigured?: boolean;
  nextauthSecretConfigured?: boolean;
  nvdApiKeyConfigured?: boolean;
  openrouterConfigured?: boolean;
}

interface PlatformSettings {
  aiRiskAssessmentEnabled?: boolean;
  dateFormat?: string;
  domain?: string;
  notifyCompliance?: boolean;
  notifyCritical?: boolean;
  notifyExploited?: boolean;
  notifyScan?: boolean;
  notifyWeekly?: boolean;
  organizationName?: string;
  passwordPolicy?: string;
  require2FA?: boolean;
  serverTimestamp?: string;
  sessionTimeout?: number;
  systemHealth?: SettingSystemHealth;
  timezone?: string;
  [key: string]: unknown;
}

interface FeatureFlags {
  aiAssistEnabled: boolean;
  aiDataRedactionMode: string;
  aiHumanReviewRequired: boolean;
  aiModelAllowlist: string[];
  aiRiskAutofillEnabled: boolean;
  auditLogRetentionDays: number;
  changeControlMode: string;
  dataRetentionDays: number;
  epssAlertThreshold: number;
  notifyKevOnly: boolean;
  quietHoursEnabled: boolean;
  quietHoursEnd: string;
  quietHoursStart: string;
  settingsChangeReasonRequired: boolean;
  [key: string]: unknown;
}

interface NotificationRuleRecord {
  channel: "IN_APP";
  eventType: string;
  id: string;
  includeExploited: boolean;
  includeKev: boolean;
  isActive: boolean;
  minimumSeverity?:
    | "CRITICAL"
    | "HIGH"
    | "MEDIUM"
    | "LOW"
    | "INFORMATIONAL"
    | null;
  name: string;
  recipients: string[];
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
  description: string;
  icon: LucideIcon;
  id: SettingsSectionId;
  label: string;
  mainOfficerOnly?: boolean;
}

const settingsSections: SettingsSectionItem[] = [
  {
    id: "general",
    label: "General",
    description: "Organization profile and baseline preferences",
    icon: Settings,
  },
  {
    id: "governance",
    label: "Governance",
    description: "Change control, retention, and audit guardrails",
    icon: FileText,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Alert channels and summary signals",
    icon: Bell,
  },
  {
    id: "soc-notifications",
    label: "SOC Routing",
    description: "Quiet hours and incident-routing thresholds",
    icon: Activity,
  },
  {
    id: "security",
    label: "Security",
    description: "Identity, sessions, password and 2FA controls",
    icon: Shield,
  },
  {
    id: "ai-assist",
    label: "AI Assist",
    description: "Model governance and human-review policies",
    icon: Zap,
  },
  {
    id: "system-health",
    label: "System Health",
    description: "Runtime configuration and dependency checks",
    icon: Activity,
  },
  {
    id: "integrations",
    label: "Integrations",
    description: "Third-party connectors and workflow links",
    icon: Database,
  },
  {
    id: "users",
    label: "Users & Roles",
    description: "Role assignment and access administration",
    icon: UsersIcon,
    mainOfficerOnly: true,
  },
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
  if (!error) {
    return false;
  }
  return error.toLowerCase().includes("two-factor authentication required");
}

function formatRoleLabel(role?: string) {
  if (!role) {
    return "";
  }
  if (role === MAIN_OFFICER_ROLE) {
    return "MAIN-OFFICER";
  }
  return role;
}

function SettingsPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <ForgeCard className="gap-0 overflow-hidden">
      <ForgeCardHeader className="gap-2 border-b px-5 pt-4 pb-3 md:px-6 [&.border-b]:pb-3">
        <ForgeCardTitle className="text-base">{title}</ForgeCardTitle>
        {subtitle ? (
          <ForgeCardDescription>{subtitle}</ForgeCardDescription>
        ) : null}
      </ForgeCardHeader>
      <ForgeCardContent className="flex flex-col gap-4 px-5 pt-4 pb-5 md:px-6 md:pb-6">
        {children}
      </ForgeCardContent>
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
    <ForgeSelect
      disabled={disabled}
      onValueChange={(next) => onChange(next === "__none" ? "" : next)}
      value={selected}
    >
      <SelectTrigger className={cn("w-full", className)} id={id}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem
              key={option.value || "__none"}
              value={option.value || "__none"}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </ForgeSelect>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("general");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(
    getDefaultFeatureFlags()
  );
  const [isEditingGeneral, setIsEditingGeneral] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const isMainOfficer = session?.user?.role === MAIN_OFFICER_ROLE;

  // Load feature flags from localStorage.
  const loadFeatureFlags = useCallback(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(FEATURE_FLAGS_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Partial<FeatureFlags>;
          return {
            ...getDefaultFeatureFlags(),
            ...parsed,
            aiModelAllowlist: Array.isArray(parsed.aiModelAllowlist)
              ? parsed.aiModelAllowlist.filter(
                  (value): value is string => typeof value === "string"
                )
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
    if (typeof window !== "undefined") {
      localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(flags));
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/settings", { cache: "no-store" });
      const data = (await response.json()) as
        | PlatformSettings
        | { error?: string };
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
          setToast({
            message: "Please complete two-factor verification to continue",
            type: "error",
          });
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
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
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
        const data = (await response.json()) as PlatformSettings;
        setSettings((prev) => ({ ...(prev ?? {}), ...data }));
        setHasUnsavedChanges(false);
        setToast({ message: "Settings saved successfully!", type: "success" });
      } else {
        const error = (await response.json()) as { error?: string };
        const errorMessage = error.error || "Failed to save settings";
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (response.status === 403 && isTwoFactorRequiredError(errorMessage)) {
          setToast({
            message: "Please complete two-factor verification to continue",
            type: "error",
          });
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
    () =>
      settingsSections.filter(
        (section) => !section.mainOfficerOnly || isMainOfficer
      ),
    [isMainOfficer]
  );

  const filteredSections = useMemo(
    () =>
      accessibleSections.filter((section) =>
        `${section.label} ${section.description}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ),
    [accessibleSections, searchQuery]
  );

  useEffect(() => {
    if (filteredSections.length === 0) {
      return;
    }
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
      {toast && (
        <Toast
          message={toast.message}
          onClose={() => setToast(null)}
          type={toast.type}
        />
      )}
      <div className="mx-auto w-full max-w-[1600px] space-y-4 p-4 md:p-5 xl:p-6">
        <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
                Settings
              </h1>
              <Badge className="font-normal" variant="outline">
                {formatRoleLabel(session?.user?.role)}
              </Badge>
              {hasUnsavedChanges ? (
                <Badge variant="secondary">Unsaved changes</Badge>
              ) : null}
            </div>
            <p className="max-w-2xl text-muted-foreground text-sm">
              Manage organization preferences, security controls, notifications,
              and integrations.
            </p>
          </div>
          <Button
            disabled={isSaving}
            onClick={fetchSettings}
            type="button"
            variant="outline"
          >
            <Activity className="mr-2 size-4" />
            Refresh settings
          </Button>
        </header>

        <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:gap-5">
          <aside className="lg:sticky lg:top-20">
            <ForgeCard className="gap-0">
              <ForgeCardHeader className="space-y-3 p-4">
                <div>
                  <ForgeCardTitle className="text-base">
                    Workspace settings
                  </ForgeCardTitle>
                  <ForgeCardDescription className="mt-1">
                    Find a section to manage
                  </ForgeCardDescription>
                </div>
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    aria-label="Search settings"
                    className="pl-9"
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search settings…"
                    value={searchQuery}
                  />
                </div>
              </ForgeCardHeader>
              <ForgeCardContent className="space-y-1 px-2 pb-3">
                {filteredSections.map((section) => {
                  const active = activeSection === section.id;
                  return (
                    <Button
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "h-auto w-full justify-start gap-3 px-3 py-2.5 text-left",
                        active && "bg-accent text-accent-foreground"
                      )}
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      type="button"
                      variant={active ? "secondary" : "ghost"}
                    >
                      <section.icon
                        aria-hidden="true"
                        className="size-4 shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-sm">
                          {section.label}
                        </span>
                        <span className="mt-0.5 block truncate font-normal text-muted-foreground text-xs">
                          {section.description}
                        </span>
                      </span>
                      {section.mainOfficerOnly ? (
                        <Badge
                          className="px-1.5 py-0 text-[10px]"
                          variant="outline"
                        >
                          Officer
                        </Badge>
                      ) : null}
                      {active ? (
                        <ChevronRight
                          aria-hidden="true"
                          className="size-4 shrink-0"
                        />
                      ) : null}
                    </Button>
                  );
                })}
                {filteredSections.length === 0 ? (
                  <p className="px-3 py-5 text-center text-muted-foreground text-sm">
                    No settings sections match your search.
                  </p>
                ) : null}
              </ForgeCardContent>
            </ForgeCard>
          </aside>

          <div className="min-w-0">
            <div
              className="fade-in slide-in-from-bottom-3 animate-in duration-500"
              style={{
                animationDelay: "450ms",
                animationFillMode: "backwards",
              }}
            >
              {activeSection === "general" && (
                <GeneralSection
                  fetchSettings={fetchSettings}
                  handleSave={handleSave}
                  isEditingGeneral={isEditingGeneral}
                  isSaving={isSaving}
                  setIsEditingGeneral={setIsEditingGeneral}
                  settings={settings}
                  updateSettings={updateSettings}
                />
              )}

              {activeSection === "governance" && (
                <GovernanceSection
                  featureFlags={featureFlags}
                  handleSaveFeatureFlags={handleSaveFeatureFlags}
                  updateFeatureFlags={updateFeatureFlags}
                />
              )}

              {activeSection === "notifications" && (
                <NotificationsSection
                  handleSave={handleSave}
                  isSaving={isSaving}
                  settings={settings}
                  updateSettings={updateSettings}
                />
              )}

              {activeSection === "soc-notifications" && (
                <SOCRoutingSection
                  featureFlags={featureFlags}
                  handleSaveFeatureFlags={handleSaveFeatureFlags}
                  updateFeatureFlags={updateFeatureFlags}
                />
              )}

              {activeSection === "security" && (
                <SecuritySection
                  handleSave={handleSave}
                  isSaving={isSaving}
                  settings={settings}
                  updateSettings={updateSettings}
                />
              )}

              {activeSection === "ai-assist" && (
                <AIAssistSection
                  featureFlags={featureFlags}
                  handleSaveFeatureFlags={handleSaveFeatureFlags}
                  updateFeatureFlags={updateFeatureFlags}
                />
              )}

              {activeSection === "system-health" && (
                <SystemHealthSection
                  fetchSettings={fetchSettings}
                  settings={settings}
                />
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
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Switch
      aria-label="Toggle setting"
      checked={checked}
      disabled={disabled}
      onCheckedChange={onChange}
    />
  );
}

interface GeneralSectionProps {
  fetchSettings: () => Promise<void>;
  handleSave: () => Promise<void>;
  isEditingGeneral: boolean;
  isSaving: boolean;
  setIsEditingGeneral: React.Dispatch<React.SetStateAction<boolean>>;
  settings: PlatformSettings | null;
  updateSettings: (updates: Partial<PlatformSettings>) => void;
}

interface FeatureFlagSectionProps {
  featureFlags: FeatureFlags;
  handleSaveFeatureFlags: () => void;
  updateFeatureFlags: (updates: Partial<FeatureFlags>) => void;
}

interface NotificationSectionProps {
  handleSave: () => Promise<void>;
  isSaving: boolean;
  settings: PlatformSettings | null;
  updateSettings: (updates: Partial<PlatformSettings>) => void;
}

interface SecuritySectionProps {
  handleSave: () => Promise<void>;
  isSaving: boolean;
  settings: PlatformSettings | null;
  updateSettings: (updates: Partial<PlatformSettings>) => void;
}

interface SystemHealthSectionProps {
  fetchSettings: () => Promise<void>;
  settings: PlatformSettings | null;
}

// General Section
function GeneralSection({
  settings,
  updateSettings,
  isEditingGeneral,
  setIsEditingGeneral,
  handleSave,
  fetchSettings,
  isSaving,
}: GeneralSectionProps) {
  return (
    <SettingsPanel
      subtitle="Basic platform configuration"
      title="General Settings"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-2 block font-medium text-foreground text-sm">
            Organization Name
          </label>
          <Input
            className="input border-border bg-background text-foreground"
            disabled={!isEditingGeneral}
            onChange={(e) =>
              updateSettings({ organizationName: e.target.value })
            }
            type="text"
            value={settings?.organizationName || ""}
          />
        </div>
        <div>
          <label className="mb-2 block font-medium text-foreground text-sm">
            Primary Domain
          </label>
          <Input
            className="input border-border bg-background text-foreground"
            disabled={!isEditingGeneral}
            onChange={(e) => updateSettings({ domain: e.target.value })}
            type="text"
            value={settings?.domain || ""}
          />
        </div>
        <div>
          <label className="mb-2 block font-medium text-foreground text-sm">
            Timezone
          </label>
          <SettingsSelect
            onChange={(timezone) => updateSettings({ timezone })}
            options={[
              "UTC",
              "America/New_York",
              "Europe/London",
              "Asia/Tokyo",
              "Asia/Kathmandu",
            ].map((timezone) => ({ value: timezone, label: timezone }))}
            value={settings?.timezone || "UTC"}
          />
        </div>
        <div>
          <label className="mb-2 block font-medium text-foreground text-sm">
            Date Format
          </label>
          <SettingsSelect
            onChange={(dateFormat) => updateSettings({ dateFormat })}
            options={["MMM DD, YYYY", "DD/MM/YYYY", "YYYY-MM-DD"].map(
              (dateFormat) => ({ value: dateFormat, label: dateFormat })
            )}
            value={settings?.dateFormat || "MMM DD, YYYY"}
          />
        </div>
        <div className="flex gap-3 border-border border-t pt-4">
          {isEditingGeneral ? (
            <>
              <Button
                className="text-primary-foreground"
                disabled={isSaving}
                onClick={async () => {
                  await handleSave();
                  setIsEditingGeneral(false);
                }}
                variant="default"
              >
                <Save size={16} />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                disabled={isSaving}
                onClick={() => {
                  setIsEditingGeneral(false);
                  void fetchSettings();
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditingGeneral(true)} variant="outline">
              <Settings size={16} />
              Edit Organization Info
            </Button>
          )}
        </div>
      </div>
    </SettingsPanel>
  );
}

// Governance Section
function GovernanceSection({
  featureFlags,
  updateFeatureFlags,
  handleSaveFeatureFlags,
}: FeatureFlagSectionProps) {
  return (
    <SettingsPanel
      subtitle="Bank-grade change control, audit, and retention"
      title="Governance & Compliance"
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-2 block font-medium text-foreground text-sm">
            Change Control
          </label>
          <SettingsSelect
            onChange={(changeControlMode) =>
              updateFeatureFlags({ changeControlMode })
            }
            options={[
              { value: "SINGLE_APPROVER", label: "Single approver" },
              { value: "TWO_PERSON_RULE", label: "Two-person rule" },
            ]}
            value={featureFlags.changeControlMode || "SINGLE_APPROVER"}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
          <div>
            <h4 className="font-medium text-foreground text-sm">
              Require reason for settings changes
            </h4>
            <p className="text-muted-foreground text-xs">
              Enforce change justification for audit trail
            </p>
          </div>
          <Toggle
            checked={featureFlags.settingsChangeReasonRequired ?? true}
            onChange={(checked) =>
              updateFeatureFlags({ settingsChangeReasonRequired: checked })
            }
          />
        </div>

        <div>
          <label className="mb-2 block font-medium text-foreground text-sm">
            Audit Log Retention (days)
          </label>
          <Input
            className="input w-32 border-border bg-background text-foreground"
            max="3650"
            min="30"
            onChange={(e) =>
              updateFeatureFlags({
                auditLogRetentionDays: Number.parseInt(e.target.value, 10),
              })
            }
            type="number"
            value={featureFlags.auditLogRetentionDays || 365}
          />
          <p className="mt-1 text-muted-foreground text-xs">
            Min: 30 days, Max: 3650 days
          </p>
        </div>

        <div>
          <label className="mb-2 block font-medium text-foreground text-sm">
            Vulnerability Data Retention (days)
          </label>
          <Input
            className="input w-32 border-border bg-background text-foreground"
            max="3650"
            min="30"
            onChange={(e) =>
              updateFeatureFlags({
                dataRetentionDays: Number.parseInt(e.target.value, 10),
              })
            }
            type="number"
            value={featureFlags.dataRetentionDays || 730}
          />
          <p className="mt-1 text-muted-foreground text-xs">
            Min: 30 days, Max: 3650 days
          </p>
        </div>

        <div className="border-border border-t pt-4">
          <Button
            className="text-primary-foreground"
            onClick={handleSaveFeatureFlags}
            variant="default"
          >
            <Save size={16} />
            Save (Feature Flags)
          </Button>
          <p className="mt-2 text-muted-foreground text-xs">
            Note: Stored in localStorage (no DB schema changes)
          </p>
        </div>
      </div>
    </SettingsPanel>
  );
}

// SOC Routing Section
function SOCRoutingSection({
  featureFlags,
  updateFeatureFlags,
  handleSaveFeatureFlags,
}: FeatureFlagSectionProps) {
  return (
    <SettingsPanel
      subtitle="Alert thresholds, quiet hours, and escalation"
      title="SOC Routing"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
          <div>
            <h4 className="font-medium text-foreground text-sm">Quiet Hours</h4>
            <p className="text-muted-foreground text-xs">
              Suppress non-critical alerts during specified hours
            </p>
          </div>
          <Toggle
            checked={featureFlags.quietHoursEnabled}
            onChange={(checked) =>
              updateFeatureFlags({ quietHoursEnabled: checked })
            }
          />
        </div>

        {featureFlags.quietHoursEnabled && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block font-medium text-foreground text-sm">
                Quiet Hours Start
              </label>
              <TimePickerField
                label="Quiet hours start"
                onChange={(quietHoursStart) =>
                  updateFeatureFlags({ quietHoursStart })
                }
                value={featureFlags.quietHoursStart || "22:00"}
              />
            </div>
            <div>
              <label className="mb-2 block font-medium text-foreground text-sm">
                Quiet Hours End
              </label>
              <TimePickerField
                label="Quiet hours end"
                onChange={(quietHoursEnd) =>
                  updateFeatureFlags({ quietHoursEnd })
                }
                value={featureFlags.quietHoursEnd || "06:00"}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
          <div>
            <h4 className="font-medium text-foreground text-sm">
              Only alert on KEV when enabled
            </h4>
            <p className="text-muted-foreground text-xs">
              Limit alerts to CISA Known Exploited Vulnerabilities
            </p>
          </div>
          <Toggle
            checked={featureFlags.notifyKevOnly}
            onChange={(checked) =>
              updateFeatureFlags({ notifyKevOnly: checked })
            }
          />
        </div>

        <div>
          <label className="mb-2 block font-medium text-foreground text-sm">
            EPSS Alert Threshold (0.0–1.0)
          </label>
          <Input
            className="input w-32 border-border bg-background text-foreground"
            max="1"
            min="0"
            onChange={(e) =>
              updateFeatureFlags({
                epssAlertThreshold: Number.parseFloat(e.target.value),
              })
            }
            step="0.01"
            type="number"
            value={featureFlags.epssAlertThreshold || 0.5}
          />
          <p className="mt-1 text-muted-foreground text-xs">
            Alert when EPSS score exceeds this threshold
          </p>
        </div>

        <div className="border-border border-t pt-4">
          <Button
            className="text-primary-foreground"
            onClick={handleSaveFeatureFlags}
            variant="default"
          >
            <Save size={16} />
            Save (Feature Flags)
          </Button>
          <p className="mt-2 text-muted-foreground text-xs">
            Note: Stored in localStorage (no DB schema changes)
          </p>
        </div>
      </div>
    </SettingsPanel>
  );
}

// Notifications Section
function NotificationsSection({
  settings,
  updateSettings,
  handleSave,
  isSaving,
}: NotificationSectionProps) {
  const notifications: Array<{
    id:
      | "notifyCritical"
      | "notifyExploited"
      | "notifyCompliance"
      | "notifyScan"
      | "notifyWeekly";
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
      description:
        "Alert when a vulnerability in your environment is being exploited",
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
      const response = await fetch("/api/notification-rules", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: NotificationRuleRecord[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load notification rules");
      }
      setRules(Array.isArray(payload.data) ? payload.data : []);
    } catch (error) {
      setRulesError(
        error instanceof Error
          ? error.message
          : "Failed to load notification rules"
      );
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
      const payload = (await response.json()) as { error?: string };
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
      setRulesError(
        error instanceof Error
          ? error.message
          : "Failed to create notification rule"
      );
    }
  }, [fetchRules, newRule]);

  const toggleRule = useCallback(
    async (rule: NotificationRuleRecord) => {
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
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(
            payload.error || "Failed to update notification rule"
          );
        }
        await fetchRules();
      } catch (error) {
        setRulesError(
          error instanceof Error
            ? error.message
            : "Failed to update notification rule"
        );
      }
    },
    [fetchRules]
  );

  const deleteRule = useCallback(
    async (id: string) => {
      try {
        setRulesError(null);
        const response = await fetch(`/api/notification-rules?id=${id}`, {
          method: "DELETE",
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(
            payload.error || "Failed to delete notification rule"
          );
        }
        await fetchRules();
      } catch (error) {
        setRulesError(
          error instanceof Error
            ? error.message
            : "Failed to delete notification rule"
        );
      }
    },
    [fetchRules]
  );

  return (
    <SettingsPanel
      subtitle="Configure alerts and notification routing"
      title="Notification Settings"
    >
      <div className="flex flex-col gap-4">
        {notifications.map((notification) => (
          <div
            className="flex items-center justify-between rounded-lg bg-muted/50 p-4"
            key={notification.id}
          >
            <div>
              <h4 className="font-medium text-foreground text-sm">
                {notification.title}
              </h4>
              <p className="text-muted-foreground text-xs">
                {notification.description}
              </p>
            </div>
            <Toggle
              checked={Boolean(settings?.[notification.id])}
              onChange={(checked) =>
                updateSettings({ [notification.id]: checked })
              }
            />
          </div>
        ))}

        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <h4 className="font-semibold text-foreground text-sm">
            Rule-Based Notification Routing
          </h4>
          <p className="mt-1 text-muted-foreground text-xs">
            Route by event type, severity, and exploit context.
          </p>
          {rulesError ? (
            <p className="mt-2 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-destructive text-xs">
              {rulesError}
            </p>
          ) : null}

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Input
              className="input border-border bg-background text-foreground"
              onChange={(e) =>
                setNewRule((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Rule name"
              value={newRule.name}
            />
            <div className="input flex items-center border-border bg-background text-muted-foreground text-sm">
              Channel: IN_APP
            </div>
            <Input
              className="input border-border bg-background text-foreground"
              onChange={(e) =>
                setNewRule((prev) => ({ ...prev, eventType: e.target.value }))
              }
              placeholder="Event type (e.g. VULNERABILITY_CREATED)"
              value={newRule.eventType}
            />
            <SettingsSelect
              onChange={(minimumSeverity) =>
                setNewRule((prev) => ({ ...prev, minimumSeverity }))
              }
              options={[
                { value: "", label: "No minimum severity" },
                ...["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL"].map(
                  (value) => ({ value, label: value })
                ),
              ]}
              value={newRule.minimumSeverity}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-foreground/80 text-xs">
              <Checkbox
                checked={newRule.includeExploited}
                onCheckedChange={(checked) =>
                  setNewRule((prev) => ({
                    ...prev,
                    includeExploited: checked === true,
                  }))
                }
              />
              Include exploited vulnerabilities
            </label>
            <label className="inline-flex items-center gap-2 text-foreground/80 text-xs">
              <Checkbox
                checked={newRule.includeKev}
                onCheckedChange={(checked) =>
                  setNewRule((prev) => ({
                    ...prev,
                    includeKev: checked === true,
                  }))
                }
              />
              Include CISA KEV only
            </label>
            <Button
              disabled={!newRule.name.trim()}
              onClick={() => void createRule()}
              size="sm"
              variant="outline"
            >
              <Plus size={14} />
              Add Rule
            </Button>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {isLoadingRules ? (
              <p className="text-muted-foreground text-xs">Loading rules...</p>
            ) : rules.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                No notification rules yet.
              </p>
            ) : (
              rules.map((rule) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
                  key={rule.id}
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground text-xs">
                      {rule.name}
                    </p>
                    <p className="truncate text-[11px] text-foreground/80">
                      {rule.channel} • {rule.eventType}
                      {rule.minimumSeverity
                        ? ` • ${rule.minimumSeverity}+`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Toggle
                      checked={rule.isActive}
                      onChange={() => void toggleRule(rule)}
                    />
                    <Button
                      onClick={() => void deleteRule(rule.id)}
                      size="sm"
                      variant="destructive"
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

        <div className="border-border border-t pt-4">
          <Button
            className="text-primary-foreground"
            disabled={isSaving}
            onClick={handleSave}
            variant="default"
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
function SecuritySection({
  settings,
  updateSettings,
  handleSave,
  isSaving,
}: SecuritySectionProps) {
  return (
    <SettingsPanel
      subtitle="Authentication and access control"
      title="Security Settings"
    >
      <div className="flex flex-col gap-4">
        <p className="rounded-lg border border-border bg-muted p-3 text-muted-foreground text-sm">
          Bank-grade defaults: require2FA=true, sessionTimeout=15–30 min,
          passwordPolicy=STRONG
        </p>

        <div className="rounded-lg bg-muted/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h4 className="font-medium text-foreground text-sm">
                AI Risk Intelligence
              </h4>
              <p className="text-muted-foreground text-xs">
                Automatically analyze new vulnerabilities with AI
              </p>
            </div>
            <Toggle
              checked={settings?.aiRiskAssessmentEnabled !== false}
              onChange={(checked) =>
                updateSettings({ aiRiskAssessmentEnabled: checked })
              }
            />
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h4 className="font-medium text-foreground text-sm">
                Enforce 2FA Organization-wide
              </h4>
              <p className="text-muted-foreground text-xs">
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
          <label className="mb-2 block font-medium text-foreground text-sm">
            Session Timeout (minutes)
          </label>
          <Input
            className="input w-32 border-border bg-background text-foreground"
            onChange={(e) =>
              updateSettings({
                sessionTimeout: Number.parseInt(e.target.value, 10),
              })
            }
            type="number"
            value={settings?.sessionTimeout || 30}
          />
          <p className="mt-1 text-muted-foreground text-xs">
            Recommended: 15–30 minutes for banking environments
          </p>
        </div>

        <div>
          <label className="mb-2 block font-medium text-foreground text-sm">
            Password Policy
          </label>
          <SettingsSelect
            onChange={(passwordPolicy) => updateSettings({ passwordPolicy })}
            options={[
              { value: "STRONG", label: "Strong (12+ characters)" },
              { value: "MEDIUM", label: "Medium (8+ characters)" },
              { value: "BASIC", label: "Basic (8+ characters)" },
            ]}
            value={settings?.passwordPolicy || "STRONG"}
          />
        </div>

        <div className="border-border border-t pt-4">
          <Button
            className="text-primary-foreground"
            disabled={isSaving}
            onClick={handleSave}
            variant="default"
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
function AIAssistSection({
  featureFlags,
  updateFeatureFlags,
  handleSaveFeatureFlags,
}: FeatureFlagSectionProps) {
  return (
    <SettingsPanel
      subtitle="Guardrails for OpenRouter and risk autofill"
      title="AI Assist"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
          <div>
            <h4 className="font-medium text-foreground text-sm">
              Enable AI Assist
            </h4>
            <p className="text-muted-foreground text-xs">
              Master switch for all AI-powered features
            </p>
          </div>
          <Toggle
            checked={featureFlags.aiAssistEnabled}
            onChange={(checked) =>
              updateFeatureFlags({ aiAssistEnabled: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
          <div>
            <h4 className="font-medium text-foreground text-sm">
              Risk Register Autofill
            </h4>
            <p className="text-muted-foreground text-xs">
              When users enter Threat + CIA impacts, AI suggests remaining
              fields
            </p>
          </div>
          <Toggle
            checked={featureFlags.aiRiskAutofillEnabled}
            onChange={(checked) =>
              updateFeatureFlags({ aiRiskAutofillEnabled: checked })
            }
          />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
          <div>
            <h4 className="font-medium text-foreground text-sm">
              Require human review
            </h4>
            <p className="text-muted-foreground text-xs">
              Prevent automatic acceptance of AI-generated content
            </p>
          </div>
          <Toggle
            checked={featureFlags.aiHumanReviewRequired ?? true}
            onChange={(checked) =>
              updateFeatureFlags({ aiHumanReviewRequired: checked })
            }
          />
        </div>

        <div>
          <label className="mb-2 block font-medium text-foreground text-sm">
            Data Redaction
          </label>
          <SettingsSelect
            onChange={(aiDataRedactionMode) =>
              updateFeatureFlags({ aiDataRedactionMode })
            }
            options={[
              {
                value: "STRICT",
                label: "Strict (no PII or internal hostnames)",
              },
              { value: "STANDARD", label: "Standard" },
            ]}
            value={featureFlags.aiDataRedactionMode || "STRICT"}
          />
        </div>

        <div>
          <label className="mb-2 block font-medium text-foreground text-sm">
            Allowed Models
          </label>
          <div className="flex flex-col gap-2">
            {[
              "openai/gpt-4o-mini",
              "openai/gpt-4.1-mini",
              "anthropic/claude-3.5-sonnet",
              "google/gemini-1.5-pro",
            ].map((model) => (
              <label
                className="flex cursor-pointer items-center gap-2 rounded bg-muted/50 p-2 transition-colors hover:bg-accent"
                key={model}
              >
                <Checkbox
                  checked={(featureFlags.aiModelAllowlist || []).includes(
                    model
                  )}
                  onCheckedChange={(checked) => {
                    const current = featureFlags.aiModelAllowlist || [];
                    const updated =
                      checked === true
                        ? [...current, model]
                        : current.filter((m) => m !== model);
                    updateFeatureFlags({ aiModelAllowlist: updated });
                  }}
                />
                <span className="text-foreground text-sm">{model}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="border-border border-t pt-4">
          <Button
            className="text-primary-foreground"
            onClick={handleSaveFeatureFlags}
            variant="default"
          >
            <Save size={16} />
            Save (Feature Flags)
          </Button>
          <p className="mt-2 text-muted-foreground text-xs">
            Note: Stored in localStorage (no DB schema changes)
          </p>
        </div>
      </div>
    </SettingsPanel>
  );
}

// System Health Section
function SystemHealthSection({
  settings,
  fetchSettings,
}: SystemHealthSectionProps) {
  const systemHealth = settings?.systemHealth || {};

  const envVars = [
    {
      key: "NVD_API_KEY",
      label: "NVD API Key",
      configured: systemHealth.nvdApiKeyConfigured,
    },
    {
      key: "GITHUB_TOKEN",
      label: "GitHub Token",
      configured: systemHealth.githubTokenConfigured,
    },
    {
      key: "OPENROUTER_API_KEY",
      label: "OpenRouter API Key",
      configured: systemHealth.openrouterConfigured,
    },
    {
      key: "NEXTAUTH_SECRET",
      label: "NextAuth Secret",
      configured: systemHealth.nextauthSecretConfigured,
    },
    {
      key: "DATABASE_URL",
      label: "Database URL",
      configured: systemHealth.databaseUrlConfigured,
    },
  ];

  return (
    <SettingsPanel
      subtitle="Key configuration status (no secrets exposed)"
      title="System Health"
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {envVars.map((env) => (
            <div
              className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
              key={env.key}
            >
              <span className="text-foreground text-sm">{env.label}</span>
              {env.configured ? (
                <span className="flex items-center gap-1 font-medium text-emerald-700 text-xs dark:text-emerald-300">
                  <CheckCircle2 size={14} />
                  Configured
                </span>
              ) : (
                <span className="flex items-center gap-1 font-medium text-intent-danger text-xs">
                  <XCircle size={14} />
                  Missing
                </span>
              )}
            </div>
          ))}
        </div>

        {settings?.serverTimestamp && (
          <p className="mt-4 text-muted-foreground text-xs">
            Last checked: {new Date(settings.serverTimestamp).toLocaleString()}
          </p>
        )}

        <div className="border-border border-t pt-4">
          <Button onClick={fetchSettings} variant="outline">
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
    <SettingsPanel
      subtitle="Third-party service connections"
      title="Integrations"
    >
      <div className="flex flex-col gap-3">
        <p className="rounded-lg border border-border bg-muted p-3 text-muted-foreground text-sm">
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
            className="flex items-center justify-between rounded-lg bg-muted/50 p-4"
            key={integration.name}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{integration.icon}</span>
              <div>
                <h4 className="font-medium text-foreground text-sm">
                  {integration.name}
                </h4>
                <p className="text-muted-foreground text-xs">Coming soon</p>
              </div>
            </div>
            <Button disabled size="sm" variant="outline">
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
    email: string;
    id: string;
    name: string;
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
      const data = (await response.json()) as UserRecord[];
      if (Array.isArray(data)) {
        setUsers(data);
      }
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
            user.id === userId
              ? { ...user, role: newRole as UserRecord["role"] }
              : user
          )
        );
      } else {
        const err = (await response.json()) as { error?: string };
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
      <SettingsPanel subtitle="Permissions required" title="Restricted Access">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <ShieldCheck className="mb-4 text-destructive" size={48} />
          <p className="max-w-md text-foreground/80">
            Only users with the{" "}
            <span className="font-bold text-foreground">MAIN-OFFICER</span> role
            can manage user permissions and roles.
          </p>
        </div>
      </SettingsPanel>
    );
  }

  return (
    <SettingsPanel
      subtitle="Manage permissions and platform access levels"
      title="User Management"
    >
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <ShieldLoader size="md" variant="cyber" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-border border-b text-muted-foreground text-xs uppercase">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Current Role</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {users.map((user) => (
                  <tr className="text-sm" key={user.id}>
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-foreground">
                          {user.name}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {user.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 font-bold text-[10px] uppercase",
                          user.role === MAIN_OFFICER_ROLE
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                            : user.role === "ANALYST"
                              ? "bg-muted text-intent-accent"
                              : "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                        )}
                      >
                        {formatRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <SettingsSelect
                          className="w-36"
                          disabled={isUpdating === user.id}
                          onChange={(role) => handleRoleChange(user.id, role)}
                          options={[
                            { value: "ANALYST", label: "Analyst" },
                            { value: "IT_OFFICER", label: "IT Officer" },
                            { value: "PENTESTER", label: "Pentester" },
                            { value: "MAIN_OFFICER", label: "Main Officer" },
                          ]}
                          value={user.role}
                        />
                        {isUpdating === user.id && <ShieldLoader size="sm" />}
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
