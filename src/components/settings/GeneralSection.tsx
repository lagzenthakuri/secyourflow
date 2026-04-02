"use client";

import { Save, Settings, Globe, Clock, Calendar } from "lucide-react";
import { SettingsCard, FormField, SectionHeader } from "./common";
import { PlatformSettings } from "./types";
import { cn } from "@/lib/utils";

interface GeneralSectionProps {
    settings: PlatformSettings | null;
    updateSettings: (updates: Partial<PlatformSettings>) => void;
    isEditingGeneral: boolean;
    setIsEditingGeneral: React.Dispatch<React.SetStateAction<boolean>>;
    handleSave: () => Promise<void>;
    fetchSettings: () => Promise<void>;
    isSaving: boolean;
}

export function GeneralSection({ 
    settings, 
    updateSettings, 
    isEditingGeneral, 
    setIsEditingGeneral, 
    handleSave, 
    fetchSettings, 
    isSaving 
}: GeneralSectionProps) {
    return (
        <div className="space-y-6">
            <SectionHeader 
                title="Organization Settings" 
                subtitle="Baseline platform configuration and branding"
                badge={settings?.organizationName || "Platform"}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SettingsCard>
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]">
                            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                                <Globe size={18} />
                            </div>
                            <h4 className="text-sm font-bold">Branding & Identity</h4>
                        </div>
                        
                        <FormField label="Organization Name" description="Used for reports and outbound emails">
                            <input
                                type="text"
                                value={settings?.organizationName || ""}
                                onChange={(e) => updateSettings({ organizationName: e.target.value })}
                                className={cn(
                                    "w-full px-3 py-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm transition-all outline-none",
                                    isEditingGeneral ? "focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" : "bg-[var(--bg-tertiary)] cursor-not-allowed opacity-70"
                                )}
                                disabled={!isEditingGeneral}
                                placeholder="Enter organization name"
                            />
                        </FormField>

                        <FormField label="Primary Domain" description="Authenticated domain used for SSRF/URL validation">
                            <input
                                type="text"
                                value={settings?.domain || ""}
                                onChange={(e) => updateSettings({ domain: e.target.value })}
                                className={cn(
                                    "w-full px-3 py-2 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm transition-all outline-none font-mono",
                                    isEditingGeneral ? "focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" : "bg-[var(--bg-tertiary)] cursor-not-allowed opacity-70"
                                )}
                                disabled={!isEditingGeneral}
                                placeholder="example.com"
                            />
                        </FormField>
                    </div>
                </SettingsCard>

                <SettingsCard>
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]">
                            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                <Clock size={18} />
                            </div>
                            <h4 className="text-sm font-bold">Localization</h4>
                        </div>

                        <FormField label="Preferred Timezone" description="Affects scan scheduling and audit timestamps">
                            <div className="relative w-full">
                                <select
                                    className="w-full px-3 py-2 pl-9 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm transition-all focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none appearance-none"
                                    value={settings?.timezone || "UTC"}
                                    onChange={(e) => updateSettings({ timezone: e.target.value })}
                                >
                                    <option value="UTC">UTC (Universal Time)</option>
                                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                                    <option value="Asia/Kathmandu">Asia/Kathmandu (NPT)</option>
                                </select>
                                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            </div>
                        </FormField>

                        <FormField label="Date Format" description="Display format for platform-wide timestamps">
                            <div className="relative w-full">
                                <select
                                    className="w-full px-3 py-2 pl-9 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm transition-all focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none appearance-none"
                                    value={settings?.dateFormat || "MMM DD, YYYY"}
                                    onChange={(e) => updateSettings({ dateFormat: e.target.value })}
                                >
                                    <option value="MMM DD, YYYY">Dec 31, 2024</option>
                                    <option value="DD/MM/YYYY">31/12/2024</option>
                                    <option value="YYYY-MM-DD">2024-12-31</option>
                                </select>
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            </div>
                        </FormField>
                    </div>
                </SettingsCard>
            </div>

            <SettingsCard>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                            <Settings size={18} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold">Persistence & Sync</h4>
                            <p className="text-[11px] text-muted-foreground">Changes applied here affect all organization users</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        {!isEditingGeneral ? (
                            <button
                                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-5 py-2 text-sm font-bold text-[var(--text-primary)] transition-all duration-300 hover:bg-[var(--bg-elevated)] hover:shadow-lg hover:shadow-black/5 transform active:scale-95"
                                onClick={() => setIsEditingGeneral(true)}
                            >
                                <Settings size={16} />
                                Unlock Edits
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={async () => {
                                        await handleSave();
                                        setIsEditingGeneral(false);
                                    }}
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2 text-sm font-bold text-white transition-all duration-300 hover:bg-sky-500 hover:shadow-lg hover:shadow-sky-500/20 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Save size={16} />
                                    {isSaving ? "Saving..." : "Save Configuration"}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditingGeneral(false);
                                        void fetchSettings();
                                    }}
                                    disabled={isSaving}
                                    className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors transform active:scale-95 disabled:opacity-50"
                                >
                                    Discard Changes
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </SettingsCard>
        </div>
    );
}
