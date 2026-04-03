"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Activity, Clock, ShieldAlert, Zap, Search, AlertTriangle, GitBranch, Github, Terminal, CheckCircle2, AlertCircle, ArrowUpCircle, RefreshCw } from "lucide-react";
import { SettingsCard, FormField, SectionHeader, Toggle } from "./common";
import { FeatureFlags, PlatformSettings } from "./types";
import { cn } from "@/lib/utils";

interface FeatureFlagSectionProps {
    featureFlags: FeatureFlags;
    updateFeatureFlags: (updates: Partial<FeatureFlags>) => void;
    handleSaveFeatureFlags: () => void;
}

export function SOCRoutingSection({ featureFlags, updateFeatureFlags, handleSaveFeatureFlags }: FeatureFlagSectionProps) {
    return (
        <div className="space-y-8 pb-10">
            <SectionHeader 
                title="SOC Orchestration" 
                subtitle="Alert thresholds, quiet hours, and escalation rules for high-availability environments"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SettingsCard>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                                    <Clock size={18} />
                                </div>
                                <h4 className="text-sm font-bold">Quiet Hours Suppressors</h4>
                            </div>
                            <Toggle
                                checked={featureFlags.quietHoursEnabled || false}
                                onChange={(checked) => updateFeatureFlags({ quietHoursEnabled: checked })}
                            />
                        </div>

                        <div className={cn(
                            "space-y-4 transition-all duration-500 overflow-hidden",
                            featureFlags.quietHoursEnabled ? "max-h-[500px] opacity-100 mt-4" : "max-h-0 opacity-0 pointer-events-none"
                        )}>
                            <p className="text-[11px] text-muted-foreground italic mb-4">
                                Non-critical alerts are suppressed during this window. <br/>Critical risk signals bypass this buffer.
                            </p>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Window Start">
                                    <input
                                        type="time"
                                        value={featureFlags.quietHoursStart || "22:00"}
                                        onChange={(e) => updateFeatureFlags({ quietHoursStart: e.target.value })}
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm transition-all focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none font-mono"
                                    />
                                </FormField>
                                <FormField label="Window End">
                                    <input
                                        type="time"
                                        value={featureFlags.quietHoursEnd || "06:00"}
                                        onChange={(e) => updateFeatureFlags({ quietHoursEnd: e.target.value })}
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm transition-all focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none font-mono"
                                    />
                                </FormField>
                            </div>
                        </div>

                        {!featureFlags.quietHoursEnabled && (
                            <div className="bg-[var(--bg-tertiary)] p-4 rounded-2xl border border-dashed border-[var(--border-color)] text-center">
                                <p className="text-[11px] text-muted-foreground">SOC is currently operating in 24/7 high-fidelity mode</p>
                            </div>
                        )}
                    </div>
                </SettingsCard>

                <SettingsCard>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <ShieldAlert size={18} />
                                </div>
                                <h4 className="text-sm font-bold">Signal Isolation</h4>
                            </div>
                            <Toggle
                                checked={featureFlags.notifyKevOnly || false}
                                onChange={(checked) => updateFeatureFlags({ notifyKevOnly: checked })}
                            />
                        </div>

                        <div className="space-y-6">
                            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                                <h5 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">CISA KEV Filter</h5>
                                <p className="text-[11px] text-amber-800/70 dark:text-amber-400/70 leading-relaxed italic">
                                    When enabled, only vulnerabilities cataloged in CISAs Known Exploited Vulnerabilities list will trigger outbound alerts.
                                </p>
                            </div>

                            <FormField label="EPSS Alert Threshold" description="Signal dispatch threshold (0.01 - 1.00)">
                                <div className="flex items-center gap-4 w-full">
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={featureFlags.epssAlertThreshold || 0.5}
                                        onChange={(e) => updateFeatureFlags({ epssAlertThreshold: parseFloat(e.target.value) })}
                                        className="flex-1 h-1.5 bg-sky-500/20 rounded-full appearance-none cursor-pointer accent-sky-600"
                                    />
                                    <div className="w-16 px-2 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-sky-600 dark:text-sky-400 text-center shadow-sm">
                                        {((featureFlags.epssAlertThreshold || 0.5) * 100).toFixed(0)}%
                                    </div>
                                </div>
                            </FormField>
                        </div>
                    </div>
                </SettingsCard>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleSaveFeatureFlags}
                    className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:bg-sky-500 hover:shadow-lg hover:shadow-sky-500/20 transform active:scale-95 disabled:opacity-50 border border-sky-500/20"
                >
                    <Save size={16} />
                    Commit SOC Policy
                </button>
            </div>
        </div>
    );
}

export function SecuritySection({ settings, updateSettings, handleSave, isSaving }: { settings: PlatformSettings | null, updateSettings: (updates: Partial<PlatformSettings>) => void, handleSave: () => Promise<void>, isSaving: boolean }) {
    return (
        <div className="space-y-8 pb-10">
            <SectionHeader 
                title="Identity & Access" 
                subtitle="Enterprise-grade authentication controls and credential hygiene"
                badge={settings?.require2FA ? "ENFORCED" : "HYBRID"}
            />

            <SettingsCard>
                <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]">
                        <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                            <Zap size={18} />
                        </div>
                        <h4 className="text-sm font-bold">Authentication Guardrails</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] group hover:border-sky-500/30 transition-all duration-300">
                           <div className="space-y-0.5">
                                <h4 className="text-sm font-bold text-[var(--text-primary)]">Enforce Global 2FA</h4>
                                <p className="text-[11px] text-muted-foreground italic">Mandatory MFA for all organization logins</p>
                            </div>
                            <Toggle
                                checked={settings?.require2FA === true}
                                onChange={(checked) => updateSettings({ require2FA: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] group hover:border-sky-500/30 transition-all duration-300">
                             <div className="space-y-0.5">
                                <h4 className="text-sm font-bold text-[var(--text-primary)]">AI Risk Assessment</h4>
                                <p className="text-[11px] text-muted-foreground italic">Background analysis of login anomalies</p>
                            </div>
                            <Toggle
                                checked={settings?.aiRiskAssessmentEnabled !== false}
                                onChange={(checked) => updateSettings({ aiRiskAssessmentEnabled: checked })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        <FormField label="Session Lifespan" description="Recommended: 15–30 min for banking">
                            <div className="flex items-center gap-3 w-full">
                                <input
                                    type="number"
                                    value={settings?.sessionTimeout || 30}
                                    onChange={(e) => updateSettings({ sessionTimeout: parseInt(e.target.value) })}
                                    className="w-32 px-3 py-2.5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm font-bold outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                                />
                                <span className="text-xs font-bold text-muted-foreground uppercase">Minutes</span>
                            </div>
                        </FormField>

                        <FormField label="Complexity Baseline" description="Minimum required password strength">
                             <select
                                className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm transition-all focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                                value={settings?.passwordPolicy || "STRONG"}
                                onChange={(e) => updateSettings({ passwordPolicy: e.target.value })}
                            >
                                <option value="STRONG">Strong (12+ Characters & Symbols)</option>
                                <option value="MEDIUM">Medium (8+ Characters & Numbers)</option>
                                <option value="BASIC">Basic (Minimum required)</option>
                            </select>
                        </FormField>
                    </div>
                </div>
            </SettingsCard>

            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:bg-sky-500 hover:shadow-lg hover:shadow-sky-500/20 transform active:scale-95 disabled:opacity-50 border border-sky-500/20"
                >
                    <Save size={16} />
                    Update Security Policy
                </button>
            </div>
        </div>
    );
}

export function SystemHealthSection({ settings, fetchSettings }: { settings: PlatformSettings | null, fetchSettings: () => Promise<void> }) {
    const systemHealth = settings?.systemHealth || {} as any;

    const envVars = [
        { key: "NVD_API_KEY", label: "NVD API Key", configured: !!systemHealth.nvdApiKeyConfigured },
        { key: "GITHUB_TOKEN", label: "GitHub Token", configured: !!systemHealth.githubTokenConfigured },
        { key: "OPENROUTER_API_KEY", label: "OpenRouter API Key", configured: !!systemHealth.openrouterConfigured },
        { key: "NEXTAUTH_SECRET", label: "NextAuth Secret", configured: !!systemHealth.nextauthSecretConfigured },
        { key: "DATABASE_URL", label: "Database URL", configured: !!systemHealth.databaseUrlConfigured },
        { key: "ORG_SMTP", label: "Organization SMTP", configured: !!systemHealth.smtpConfigured },
        { key: "SYSTEM_SMTP", label: "System SMTP", configured: !!systemHealth.systemSmtpConfigured },
        { key: "OLLAMA_HOST", label: "Ollama Identity", configured: !!systemHealth.ollamaConfigured },
    ];

    return (
        <div className="space-y-6 pb-10">
            <SectionHeader 
                title="Telemetry & Runtime" 
                subtitle="Status of core dependencies and system orchestrators"
                badge={envVars.every(v => v.configured) ? "ALL SYSTEMS GO" : "ACTION REQUIRED"}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {envVars.map((env, index) => (
                    <div
                        key={env.key}
                        className={cn(
                            "p-4 rounded-2xl border transition-all duration-500 hover:shadow-md animate-in fade-in slide-in-from-bottom-4",
                            env.configured 
                                ? "bg-green-500/5 border-green-500/20" 
                                : "bg-red-500/5 border-red-500/20"
                        )}
                        style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'backwards' }}
                    >
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">{env.label}</p>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-mono truncate max-w-[120px] text-[var(--text-primary)]">{env.key}</span>
                            {env.configured ? (
                                <Activity size={14} className="text-green-500 animate-pulse" />
                            ) : (
                                <ShieldAlert size={14} className="text-red-500" />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <SettingsCard>
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">Last Telemetry Check</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            {settings?.serverTimestamp 
                                ? new Date(settings.serverTimestamp).toLocaleString() 
                                : "Verification in progress..."}
                        </p>
                    </div>
                    <button 
                        className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2 text-xs font-bold transition-all hover:bg-[var(--bg-elevated)] transform active:scale-95" 
                        onClick={fetchSettings}
                    >
                        <Activity size={14} />
                        Run Diagnostics
                    </button>
                </div>
            </SettingsCard>
        </div>
    );
}

export function MailSection({ settings, updateSettings, handleSave, isSaving }: { settings: PlatformSettings | null, updateSettings: (updates: Partial<PlatformSettings>) => void, handleSave: () => Promise<void>, isSaving: boolean }) {
    return (
        <div className="space-y-8 pb-10">
            <SectionHeader 
                title="Relay & SMTP" 
                subtitle="Outbound communication infrastructure for organization-level alerting"
                badge={settings?.smtpHost ? "ISOLATED" : "MANAGED"}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <SettingsCard>
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]">
                            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                                <Search size={18} />
                            </div>
                            <h4 className="text-sm font-bold">Server Identity</h4>
                        </div>
                        
                        <FormField label="Host Address">
                            <input
                                type="text"
                                className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm transition-all outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                                placeholder="smtp.bank-gateway.host"
                                value={settings?.smtpHost || ""}
                                onChange={(e) => updateSettings({ smtpHost: e.target.value })}
                            />
                        </FormField>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Network Port">
                                <input
                                    type="number"
                                    className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm font-mono outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                                    placeholder="587"
                                    value={settings?.smtpPort || ""}
                                    onChange={(e) => updateSettings({ smtpPort: parseInt(e.target.value) || 587 })}
                                />
                            </FormField>
                            <FormField label="Encryption">
                                <select
                                    className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm transition-all focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                                    value={settings?.smtpEncryption || "TLS"}
                                    onChange={(e) => updateSettings({ smtpEncryption: e.target.value })}
                                >
                                    <option value="TLS">STARTTLS</option>
                                    <option value="SSL">SSL/TLS</option>
                                    <option value="NONE">None (Plaintext)</option>
                                </select>
                            </FormField>
                        </div>
                    </div>
                </SettingsCard>

                <SettingsCard>
                    <div className="space-y-6">
                         <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]">
                            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                                <ShieldAlert size={18} />
                            </div>
                            <h4 className="text-sm font-bold">Authentication</h4>
                        </div>

                        <FormField label="Service Identity">
                            <input
                                type="text"
                                className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm transition-all outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                                placeholder="soc-alerts@bank.int"
                                value={settings?.smtpUser || ""}
                                onChange={(e) => updateSettings({ smtpUser: e.target.value })}
                            />
                        </FormField>

                        <FormField label="Access Key">
                            <input
                                type="password"
                                className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm transition-all outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                                placeholder="••••••••••••••••"
                                value={settings?.smtpPass || ""}
                                onChange={(e) => updateSettings({ smtpPass: e.target.value })}
                            />
                        </FormField>
                    </div>
                </SettingsCard>

                <div className="space-y-4">
                    <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-4">
                        <AlertTriangle className="text-amber-600" size={24} />
                        <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400 leading-snug">Firewall Exceptions Required</h4>
                        <p className="text-[11px] text-amber-800/70 dark:text-amber-400/70 leading-relaxed italic">
                            By overriding organization SMTP, SecYourFlow will attempt direct relay through your gateway. 
                            Ensure egress is allowed for platform-ip on port {settings?.smtpPort || 587}.
                        </p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-all transform active:scale-95 disabled:opacity-50 border border-sky-400/20 shadow-lg shadow-sky-500/10"
                    >
                        {isSaving ? "Syncing Logic..." : "Commit SMTP Strategy"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function UsersManagementTab({ isAuthorized, formatRoleLabel, MAIN_OFFICER_ROLE, ADMIN_ROLE }: { isAuthorized: boolean, formatRoleLabel: (role: any) => string, MAIN_OFFICER_ROLE: string, ADMIN_ROLE: string }) {
    interface UserRecord {
        id: string;
        name: string;
        email: string;
        role: "ANALYST" | "IT_OFFICER" | "PENTESTER" | "MAIN_OFFICER" | "SUPER_ADMIN";
    }

    const [users, setUsers] = useState<UserRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        if (!isAuthorized) {
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
    }, [isAuthorized]);

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
                setUsers((prev: any[]) =>
                    prev.map((user: any) =>
                        user.id === userId ? { ...user, role: newRole } : user,
                    ),
                );
            }
        } finally {
            setIsUpdating(null);
        }
    };

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shadow-inner border border-red-500/10 animate-pulse">
                    <ShieldAlert size={40} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">Elevated Privileges Required</h3>
                    <p className="text-sm text-muted-foreground max-w-sm italic">
                        Access to the User Governance Matrix is restricted to systems identified with <span className="text-red-500 font-bold">ADMIN</span> or <span className="text-red-500 font-bold">MAIN-OFFICER</span> credentials.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            <SectionHeader 
                title="Governance Matrix" 
                subtitle="Assign identities and platform authority levels for organization members"
                badge={`${users.length} INDENTITIES`}
            />

            <SettingsCard noPadding>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] uppercase tracking-widest text-muted-foreground/60 bg-[var(--bg-secondary)]/50">
                                <th className="pl-6 pr-4 py-4 font-bold border-b border-[var(--border-color)]">Platform Identity</th>
                                <th className="px-4 py-4 font-bold border-b border-[var(--border-color)] text-center">Auth Role</th>
                                <th className="pl-4 pr-6 py-4 font-bold border-b border-[var(--border-color)] text-right">Access Controls</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)] bg-[var(--bg-card)]">
                            {users.map((user) => (
                                <tr key={user.id} className="group hover:bg-[var(--bg-secondary)]/30 transition-all duration-300">
                                    <td className="pl-6 pr-4 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold shadow-sm">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-[var(--text-primary)] leading-none">{user.name}</p>
                                                <p className="text-[11px] text-muted-foreground mt-1 font-mono">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-5">
                                         <div className="flex justify-center">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border",
                                                user.role === MAIN_OFFICER_ROLE || user.role === ADMIN_ROLE 
                                                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]" :
                                                user.role === 'ANALYST' 
                                                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20" :
                                                "bg-[var(--bg-tertiary)] text-muted-foreground border-[var(--border-color)]"
                                            )}>
                                                {formatRoleLabel(user.role)}
                                            </span>
                                         </div>
                                    </td>
                                    <td className="pl-4 pr-6 py-5">
                                        <div className="flex items-center justify-end gap-3">
                                            <select
                                                className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-2 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-sky-500/20 transition-all cursor-pointer"
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                disabled={isUpdating === user.id || user.role === 'SUPER_ADMIN'}
                                            >
                                                <option value="ANALYST">ANALYST</option>
                                                <option value="IT_OFFICER">IT_OFFICER</option>
                                                <option value="PENTESTER">PENTESTER</option>
                                                <option value="SUPER_ADMIN">ADMIN</option>
                                                <option value="MAIN_OFFICER">MAIN-OFFICER</option>
                                            </select>
                                            {isUpdating === user.id && <Activity size={14} className="text-sky-500 animate-spin" />}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </SettingsCard>
        </div>
    );
}

export function ZenkinsSection() {
    const [status, setStatus] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch("/api/admin/zenkins/status", { cache: "no-store" });
            const data = await response.json();
            if (response.ok) {
                setStatus(data);
                setError(null);
            } else {
                setError(data.error || "Failed to reach DevOps orchestrator");
            }
        } catch (err) {
            setError("Network connection to CI/CD engine failed");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchStatus();
        
        // Automated background polling every 60 seconds for CI/CD updates
        const interval = setInterval(() => {
            void fetchStatus();
        }, 60000);
        
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const handleApplyUpdate = async () => {
        if (!confirm("Are you sure you want to apply system updates? This may trigger a temporary service interruption.")) return;
        
        try {
            setIsUpdating(true);
            const response = await fetch("/api/admin/zenkins/update", { method: "POST" });
            const data = await response.json();
            if (response.ok) {
                alert("Update applied successfully! System is refreshing.");
                await fetchStatus();
            } else {
                alert("Update failed: " + (data.error || "Unknown error"));
            }
        } catch (err) {
            alert("Update failed due to network error.");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="space-y-8 pb-10">
            <SectionHeader 
                title="Zenkins DevOps" 
                subtitle="CI/CD Orchestration and automated deployment management"
                badge={status?.updateRequired ? "UPDATE REQUIRED" : "ALL SYSTEMS GO"}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SettingsCard>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    status?.updateRequired ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-green-500/10 text-green-600 dark:text-green-400"
                                )}>
                                    <Github size={18} />
                                </div>
                                <h4 className="text-sm font-bold">Remote Repository Branch</h4>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                                <GitBranch size={12} className="text-sky-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{status?.branch || "main"}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Local Build Commit</p>
                                    <p className="text-sm font-mono font-bold text-sky-600 dark:text-sky-400 mt-1">{status?.localHash || "Fetching..."}</p>
                                </div>
                                <CheckCircle2 size={16} className="text-green-500" />
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Remote Origin Commit</p>
                                    <p className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400 mt-1">{status?.remoteHash || "Fetching..."}</p>
                                </div>
                                {status?.updateRequired ? (
                                    <ArrowUpCircle size={16} className="text-amber-500 animate-bounce" />
                                ) : (
                                    <CheckCircle2 size={16} className="text-green-500" />
                                )}
                            </div>
                        </div>

                        {status?.updateRequired && (
                            <div className={cn(
                                "p-4 rounded-2xl border flex items-start gap-4",
                                status?.requiresRestart ? "bg-red-500/5 border-red-500/20" : "bg-sky-500/5 border-sky-500/20"
                            )}>
                                <div className={cn(
                                    "p-2 rounded-xl mt-1",
                                    status?.requiresRestart ? "bg-red-500/20 text-red-600" : "bg-sky-500/20 text-sky-600"
                                )}>
                                    <Terminal size={16} />
                                </div>
                                <div>
                                    <h5 className={cn("text-xs font-bold uppercase tracking-wider mb-1", status?.requiresRestart ? "text-red-700 dark:text-red-400" : "text-sky-700 dark:text-sky-400")}>
                                        {status?.requiresRestart ? "System Restart Required" : "Update Available"}
                                    </h5>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                                        {status?.requiresRestart 
                                            ? "Critical configuration changes detected (Dockerfile/Compose). A container restart is recommended after pulling."
                                            : "Platform logic updates available. Git pull will be executed silently to update the application."}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </SettingsCard>

                <div className="space-y-6">
                    <SettingsCard>
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-[var(--border-color)] pb-3">DevOps Actions</h4>
                            
                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={handleApplyUpdate}
                                    disabled={!status?.updateRequired || isUpdating || isLoading}
                                    className={cn(
                                        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 transform active:scale-[0.98]",
                                        status?.updateRequired 
                                            ? "bg-sky-600 text-white border-sky-500 shadow-lg shadow-sky-500/10 hover:bg-sky-500" 
                                            : "bg-[var(--bg-tertiary)] border-[var(--border-color)] opacity-50 grayscale cursor-not-allowed"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <RefreshCw size={18} className={cn(isUpdating && "animate-spin")} />
                                        <div className="text-left">
                                            <p className="text-sm font-bold">Apply System Update</p>
                                            <p className="text-[10px] opacity-80 font-medium">Automatic Git Pull & Hot Reload</p>
                                        </div>
                                    </div>
                                    <ArrowUpCircle size={16} className={status?.updateRequired ? "animate-pulse" : ""} />
                                </button>

                                <button
                                    onClick={() => void fetchStatus()}
                                    disabled={isLoading || isUpdating}
                                    className="w-full flex items-center gap-3 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] transition-all duration-300"
                                >
                                    <Activity size={18} className={cn(isLoading && "animate-pulse")} />
                                    <div className="text-left">
                                        <p className="text-sm font-bold">Sync Orchestrator</p>
                                        <p className="text-[10px] text-muted-foreground font-medium">Check for remote upstream commits</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </SettingsCard>

                    {error && (
                        <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 flex items-center gap-3">
                            <AlertCircle className="text-red-500" size={16} />
                            <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}
                    
                    {!status?.updateRequired && !isLoading && !error && (
                        <div className="p-6 rounded-2xl bg-green-500/5 border border-dashed border-green-500/20 text-center space-y-3">
                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mx-auto border border-green-500/10">
                                <CheckCircle2 size={20} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-widest leading-none">System Stable</p>
                                <p className="text-[11px] text-green-800/70 dark:text-green-400/70 italic">Synchronized with latest bank branch head</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
