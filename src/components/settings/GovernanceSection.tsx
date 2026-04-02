"use client";

import { Save, FileText, ShieldAlert, History, Database } from "lucide-react";
import { SettingsCard, FormField, SectionHeader, Toggle } from "./common";
import { FeatureFlags } from "./types";
import { cn } from "@/lib/utils";

interface GovernanceSectionProps {
    featureFlags: FeatureFlags;
    updateFeatureFlags: (updates: Partial<FeatureFlags>) => void;
    handleSaveFeatureFlags: () => void;
}

export function GovernanceSection({ featureFlags, updateFeatureFlags, handleSaveFeatureFlags }: GovernanceSectionProps) {
    return (
        <div className="space-y-6">
            <SectionHeader 
                title="Governance & Compliance" 
                subtitle="Bank-grade change control, audit, and data retention rules"
                badge={featureFlags.changeControlMode === "TWO_PERSON_RULE" ? "COMPLIANT" : "STANDARD"}
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3 space-y-6">
                    <SettingsCard>
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]">
                                <div className="p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                                    <ShieldAlert size={18} />
                                </div>
                                <h4 className="text-sm font-bold">Change Control Protocol</h4>
                            </div>

                            <FormField label="Operational Policy" description="Required for SOX/SOC2 compliance in banking environments">
                                <select
                                    className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm transition-all focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                                    value={featureFlags.changeControlMode || "SINGLE_APPROVER"}
                                    onChange={(e) => updateFeatureFlags({ changeControlMode: e.target.value })}
                                >
                                    <option value="SINGLE_APPROVER">Single Approver (Standard)</option>
                                    <option value="TWO_PERSON_RULE">Two-Person Rule (M-of-N Approval Required)</option>
                                </select>
                            </FormField>

                            <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] group hover:border-sky-500/30 transition-all duration-300">
                                <div className="space-y-0.5">
                                    <h4 className="text-sm font-bold text-[var(--text-primary)]">Enforce Audit Justification</h4>
                                    <p className="text-[11px] text-muted-foreground italic">Require reason for every mutation in settings</p>
                                </div>
                                <Toggle
                                    checked={featureFlags.settingsChangeReasonRequired ?? true}
                                    onChange={(checked) => updateFeatureFlags({ settingsChangeReasonRequired: checked })}
                                />
                            </div>
                        </div>
                    </SettingsCard>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <SettingsCard>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                        <History size={18} />
                                    </div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Audit Retention</h4>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <input
                                        type="number"
                                        min="30"
                                        max="3650"
                                        value={featureFlags.auditLogRetentionDays || 365}
                                        onChange={(e) => updateFeatureFlags({ auditLogRetentionDays: parseInt(e.target.value) })}
                                        className="w-24 px-3 py-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm font-bold text-center outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                    />
                                    <span className="text-xs text-muted-foreground font-semibold">Days</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground font-medium italic">Standard: 365 days</p>
                            </div>
                        </SettingsCard>

                        <SettingsCard>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                                        <Database size={18} />
                                    </div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Data Retention</h4>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <input
                                        type="number"
                                        min="30"
                                        max="3650"
                                        value={featureFlags.dataRetentionDays || 730}
                                        onChange={(e) => updateFeatureFlags({ dataRetentionDays: parseInt(e.target.value) })}
                                        className="w-24 px-3 py-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm font-bold text-center outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                    />
                                    <span className="text-xs text-muted-foreground font-semibold">Days</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground font-medium italic">Standard: 730 days</p>
                            </div>
                        </SettingsCard>
                    </div>
                </div>

                <div className="md:col-span-1 space-y-4">
                    <div className="p-5 rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-500/20 space-y-4">
                        <FileText size={24} className="opacity-80" />
                        <h4 className="text-sm font-bold leading-snug">Save feature flags to system registry</h4>
                        <button
                            onClick={handleSaveFeatureFlags}
                            className="w-full py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-xs font-bold uppercase tracking-wider transition-all transform active:scale-95 border border-white/20"
                        >
                            Sync Changes
                        </button>
                        <p className="text-[10px] text-white/60 font-semibold italic text-center">Currently stored in local secure-context</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
