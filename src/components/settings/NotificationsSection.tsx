"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, Bell, Plus, Trash2, ListFilter, Activity, AlertTriangle, ShieldCheck } from "lucide-react";
import { SettingsCard, FormField, SectionHeader, Toggle } from "./common";
import { PlatformSettings, NotificationRuleRecord } from "./types";
import { cn } from "@/lib/utils";

interface NotificationSectionProps {
    settings: PlatformSettings | null;
    updateSettings: (updates: Partial<PlatformSettings>) => void;
    handleSave: () => Promise<void>;
    isSaving: boolean;
}

export function NotificationsSection({ settings, updateSettings, handleSave, isSaving }: NotificationSectionProps) {
    const defaultNotifyOptions: Array<{
        id: "notifyCritical" | "notifyExploited" | "notifyCompliance" | "notifyScan" | "notifyWeekly";
        title: string;
        description: string;
        icon: any;
    }> = [
        {
            id: "notifyCritical",
            title: "Critical Vulnerabilities",
            description: "Instant alert on CVSS 9.0+ detection",
            icon: ShieldCheck
        },
        {
            id: "notifyExploited",
            title: "Live Exploitation",
            description: "Alert on CISA KEV or identified POCs",
            icon: AlertTriangle
        },
        {
            id: "notifyCompliance",
            title: "Compliance Drift",
            description: "Signal change in organization-wide status",
            icon: Activity
        },
        {
            id: "notifyScan",
            title: "Scan Completion",
            description: "Finalized report available notification",
            icon: ListFilter
        },
        {
            id: "notifyWeekly",
            title: "Risk Dashboard Digest",
            description: "Aggregated weekly summary report",
            icon: Bell
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
            if (!response.ok) throw new Error(payload.error || "Failed to create rule");

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
            setRulesError(error instanceof Error ? error.message : "Failed to create rule");
        }
    }, [fetchRules, newRule]);

    const toggleRule = useCallback(async (rule: NotificationRuleRecord) => {
        try {
            const response = await fetch("/api/notification-rules", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: rule.id, isActive: !rule.isActive }),
            });
            if (!response.ok) throw new Error("Failed to update rule");
            await fetchRules();
        } catch (error) {
            setRulesError("Failed to update rule");
        }
    }, [fetchRules]);

    const deleteRule = useCallback(async (id: string) => {
        try {
            const response = await fetch(`/api/notification-rules?id=${id}`, { method: "DELETE" });
            if (!response.ok) throw new Error("Failed to delete rule");
            await fetchRules();
        } catch (error) {
            setRulesError("Failed to delete rule");
        }
    }, [fetchRules]);

    return (
        <div className="space-y-8 pb-10">
            <SectionHeader 
                title="Routing & Alerts" 
                subtitle="Configure how risk signals are dispatched across your SOC"
                badge={`${defaultNotifyOptions.filter(o => settings?.[o.id]).length} ACTIVE`}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {defaultNotifyOptions.map((option) => (
                    <div
                        key={option.id}
                        className={cn(
                            "p-4 rounded-2xl border transition-all duration-300 group cursor-pointer",
                            settings?.[option.id] 
                                ? "bg-sky-500/5 border-sky-500/20 shadow-sm" 
                                : "bg-[var(--bg-tertiary)] border-[var(--border-color)] hover:bg-[var(--bg-elevated)]"
                        )}
                        onClick={() => updateSettings({ [option.id]: !settings?.[option.id] })}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={cn(
                                "p-2 rounded-xl transition-all duration-300",
                                settings?.[option.id] ? "bg-sky-500/20 text-sky-600 dark:text-sky-400" : "bg-[var(--bg-secondary)] text-muted-foreground group-hover:bg-sky-500/10 group-hover:text-sky-500"
                            )}>
                                <option.icon size={20} />
                            </div>
                            <Toggle
                                checked={Boolean(settings?.[option.id])}
                                onChange={(checked) => updateSettings({ [option.id]: checked })}
                            />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-[var(--text-primary)]">{option.title}</h4>
                            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{option.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="space-y-6">
                <SectionHeader 
                    title="Audit Routing Rules" 
                    subtitle="Advanced dispatch logic based on event context"
                />

                <SettingsCard>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-dashed border-[var(--border-color)]">
                            <div className="md:col-span-1">
                                <FormField label="Rule Label">
                                    <input
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm transition-all focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                                        placeholder="Critical Alert Routing"
                                        value={newRule.name}
                                        onChange={(e) => setNewRule((prev) => ({ ...prev, name: e.target.value }))}
                                    />
                                </FormField>
                            </div>
                            <div className="md:col-span-1">
                                <FormField label="Signal Trigger">
                                    <select
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm transition-all focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                                        value={newRule.eventType}
                                        onChange={(e) => setNewRule((prev) => ({ ...prev, eventType: e.target.value }))}
                                    >
                                        <option value="VULNERABILITY_CREATED">Vulnerability Discovered</option>
                                        <option value="VULNERABILITY_UPDATED">Vulnerability Updated</option>
                                        <option value="SCAN_COMPLETED">Scan Finalized</option>
                                    </select>
                                </FormField>
                            </div>
                            <div className="md:col-span-1">
                                <FormField label="Min Severity">
                                    <select
                                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm transition-all focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                                        value={newRule.minimumSeverity || ""}
                                        onChange={(e) => setNewRule((prev) => ({ ...prev, minimumSeverity: e.target.value }))}
                                    >
                                        <option value="">Any Severity</option>
                                        <option value="CRITICAL">Critical Only</option>
                                        <option value="HIGH">High+</option>
                                        <option value="MEDIUM">Medium+</option>
                                    </select>
                                </FormField>
                            </div>
                            <div className="md:col-span-1 flex items-end">
                                <button
                                    onClick={() => void createRule()}
                                    disabled={!newRule.name.trim()}
                                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all transform active:scale-95 disabled:opacity-50 border border-sky-500/20 flex items-center justify-center gap-2"
                                >
                                    <Plus size={14} />
                                    Add Logic
                                </button>
                            </div>
                        </div>

                        {rulesError && (
                            <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                                <AlertTriangle size={14} />
                                {rulesError}
                            </div>
                        )}

                        <div className="space-y-3">
                            {isLoadingRules ? (
                                <p className="text-center py-6 text-xs text-muted-foreground italic">Syncing rules...</p>
                            ) : rules.length === 0 ? (
                                <div className="text-center py-8 bg-[var(--bg-secondary)] rounded-2xl border-2 border-dashed border-[var(--border-color)]">
                                    <p className="text-xs text-muted-foreground">No custom routing rules defined</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {rules.map((rule) => (
                                        <div
                                            key={rule.id}
                                            className="flex flex-col p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-sky-500/30 transition-all duration-300 group"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        rule.isActive ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-muted-foreground/30"
                                                    )} />
                                                    <p className="text-xs font-bold text-[var(--text-primary)]">{rule.name}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Toggle checked={rule.isActive} onChange={() => void toggleRule(rule)} />
                                                    <button
                                                        className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                                        onClick={() => void deleteRule(rule.id)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">
                                                <span>{rule.eventType.replace('_', ' ')}</span>
                                                <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                                                <span className={cn(
                                                    rule.minimumSeverity === 'CRITICAL' ? 'text-red-500' : 
                                                    rule.minimumSeverity === 'HIGH' ? 'text-amber-500' : 'text-sky-500'
                                                )}>
                                                    {rule.minimumSeverity || 'All'} +
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </SettingsCard>
            </div>

            <div className="sticky bottom-6 flex justify-center">
                <button
                    className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-8 py-3 text-sm font-bold text-white transition-all duration-300 hover:bg-sky-500 hover:shadow-[0_8px_20px_rgba(14,165,233,0.3)] transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group shadow-xl border border-sky-400/20"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    <Save size={18} className="group-hover:rotate-12 transition-transform" />
                    {isSaving ? "Saving Cloud Preferences..." : "Commit Global Notification Strategy"}
                </button>
            </div>
        </div>
    );
}
