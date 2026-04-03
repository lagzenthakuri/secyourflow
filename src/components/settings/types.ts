import { LucideIcon } from "lucide-react";

export interface SettingSystemHealth {
    nvdApiKeyConfigured?: boolean;
    githubTokenConfigured?: boolean;
    openrouterConfigured?: boolean;
    nextauthSecretConfigured?: boolean;
    databaseUrlConfigured?: boolean;
    smtpConfigured?: boolean;
    systemSmtpConfigured?: boolean;
}

export interface PlatformSettings {
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
    aiProvider?: "OLLAMA" | "OPENAI" | "ANTHROPIC" | "OPENROUTER";
    aiModel?: string;
    aiApiKey?: string;
    aiBaseUrl?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    smtpFrom?: string;
    smtpEncryption?: string;
    systemHealth?: SettingSystemHealth;
    serverTimestamp?: string;
    [key: string]: unknown;
}

export interface FeatureFlags {
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

export interface NotificationRuleRecord {
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

export type SettingsSectionId =
    | "general"
    | "governance"
    | "notifications"
    | "soc-notifications"
    | "security"
    | "ai-assist"
    | "mail"
    | "system-health"
    | "integrations"
    | "api"
    | "users"
    | "zenkins"
    | "profile";

export interface SettingsSectionItem {
    id: SettingsSectionId;
    label: string;
    description: string;
    icon: LucideIcon;
    mainOfficerOnly?: boolean;
}
