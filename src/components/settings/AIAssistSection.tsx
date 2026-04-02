"use client";

import { Save, Zap, ShieldCheck, Cpu, Database, Eye, EyeOff } from "lucide-react";
import { SettingsCard, FormField, SectionHeader, Toggle } from "./common";
import { PlatformSettings, FeatureFlags } from "./types";
import { cn } from "@/lib/utils";

interface AIAssistSectionProps {
    settings: PlatformSettings | null;
    updateSettings: (updates: Partial<PlatformSettings>) => void;
    handleSave: () => Promise<void>;
    isSaving: boolean;
    featureFlags: FeatureFlags;
    updateFeatureFlags: (updates: Partial<FeatureFlags>) => void;
    handleSaveFeatureFlags: () => void;
}

export function AIAssistSection({
    settings,
    updateSettings,
    handleSave,
    isSaving,
    featureFlags,
    updateFeatureFlags,
    handleSaveFeatureFlags,
}: AIAssistSectionProps) {
    const aiProvider = settings?.aiProvider || "OLLAMA";

    return (
        <div className="space-y-8 pb-10">
            <SectionHeader 
                title="AI Neural Core" 
                subtitle="Configure large language models and neural analytical engines for risk inference"
                badge={aiProvider}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SettingsCard>
                    <div className="space-y-6">
                         <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]">
                            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                                <Cpu size={18} />
                            </div>
                            <h4 className="text-sm font-bold">Inference Engine</h4>
                        </div>

                        <FormField label="Neural Architecture" description="Backend used for token processing and inference">
                            <select
                                className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm transition-all focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none"
                                value={aiProvider}
                                onChange={(e) => updateSettings({ aiProvider: e.target.value as any })}
                            >
                                <option value="OLLAMA">Ollama (Private-Cloud / Isolated)</option>
                                <option value="OPENAI">OpenAI (Commercial SaaS)</option>
                                <option value="ANTHROPIC">Anthropic (Claude Nexus)</option>
                                <option value="OPENROUTER">OpenRouter (Federated API Gateway)</option>
                            </select>
                        </FormField>

                        <FormField label="Model Identifier" description="Specific model weight or version to deploy">
                            <div className="relative w-full">
                                <input
                                    type="text"
                                    className="w-full px-3 py-2.5 pl-9 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm transition-all outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-mono"
                                    placeholder={aiProvider === "OLLAMA" ? "llama3:latest" : "gpt-4o-mini"}
                                    value={settings?.aiModel || ""}
                                    onChange={(e) => updateSettings({ aiModel: e.target.value })}
                                />
                                <Database size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            </div>
                        </FormField>

                        {aiProvider === "OLLAMA" ? (
                             <FormField label="Inference Gateway URL" description="Direct endpoint for your private Ollama instance">
                                <input
                                    type="text"
                                    className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm transition-all outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-mono"
                                    placeholder="http://localhost:11434"
                                    value={settings?.aiBaseUrl || ""}
                                    onChange={(e) => updateSettings({ aiBaseUrl: e.target.value })}
                                />
                            </FormField>
                        ) : (
                            <FormField label="Secure API Key" description="Encrypted credentials for cloud inference">
                                <div className="relative w-full">
                                    <input
                                        type="password"
                                        className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)] text-sm transition-all outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-mono"
                                        placeholder="••••••••••••••••••••••••••••••••"
                                        value={settings?.aiApiKey || ""}
                                        onChange={(e) => updateSettings({ aiApiKey: e.target.value })}
                                    />
                                </div>
                            </FormField>
                        )}

                        <div className="pt-4 flex justify-start">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:bg-sky-500 hover:shadow-lg hover:shadow-sky-500/20 transform active:scale-95 disabled:opacity-50 border border-sky-400/20 shadow-sm"
                            >
                                <Save size={16} />
                                {isSaving ? "Initializing Core..." : "Lock Engine Config"}
                            </button>
                        </div>
                    </div>
                </SettingsCard>

                <div className="space-y-6">
                    <SettingsCard>
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]">
                                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                                    <Zap size={18} />
                                </div>
                                <h4 className="text-sm font-bold">Autonomous Signals</h4>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] group hover:border-sky-500/30 transition-all duration-300">
                                    <div className="space-y-0.5">
                                        <h4 className="text-sm font-bold text-[var(--text-primary)]">In-Browser Assistance</h4>
                                        <p className="text-[11px] text-muted-foreground italic">Deploy neural-overlay for SOC analyst UI</p>
                                    </div>
                                    <Toggle
                                        checked={featureFlags.aiAssistEnabled || false}
                                        onChange={(checked) => updateFeatureFlags({ aiAssistEnabled: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] group hover:border-sky-500/30 transition-all duration-300">
                                    <div className="space-y-0.5">
                                        <h4 className="text-sm font-bold text-[var(--text-primary)]">Neural Risk Inference</h4>
                                        <p className="text-[11px] text-muted-foreground italic">Analyze new vulnerability clusters automatically</p>
                                    </div>
                                    <Toggle
                                        checked={settings?.aiRiskAssessmentEnabled !== false}
                                        onChange={(checked) => updateSettings({ aiRiskAssessmentEnabled: checked })}
                                    />
                                </div>
                            </div>
                        </div>
                    </SettingsCard>

                    <SettingsCard>
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-color)]">
                                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <ShieldCheck size={18} />
                                </div>
                                <h4 className="text-sm font-bold">Safety Guardrails</h4>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 group hover:border-amber-500/40 transition-all duration-300">
                                <div className="space-y-0.5">
                                    <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400">Human-Loop Mandate</h4>
                                    <p className="text-[11px] text-amber-800/60 dark:text-amber-400/60 italic leading-relaxed">
                                        All AI conclusions require Analyst verification before persistence.
                                    </p>
                                </div>
                                <Toggle
                                    checked={featureFlags.aiHumanReviewRequired ?? true}
                                    onChange={(checked) => updateFeatureFlags({ aiHumanReviewRequired: checked })}
                                />
                            </div>

                            <div className="flex justify-end pt-2">
                                 <button
                                    onClick={handleSaveFeatureFlags}
                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all transform active:scale-95 shadow-md border border-amber-400/20"
                                >
                                    Commit Safety Policy
                                </button>
                            </div>
                        </div>
                    </SettingsCard>
                </div>
            </div>
        </div>
    );
}
