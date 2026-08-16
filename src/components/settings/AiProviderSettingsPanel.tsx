"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, CheckCircle2, HardDrive, Loader2, Cloud, Save, Zap, AlertTriangle } from "lucide-react";

interface ProviderOption {
    id: string;
    label: string;
    selfHosted: boolean;
    defaultModel: string;
    defaultEndpoint?: string;
    apiKeyEnvVar?: string;
    configured: boolean;
}

interface ProbeResult {
    reachable: boolean;
    models?: string[];
    error?: string;
    latencyMs?: number;
}

const DISABLED_OPTION: ProviderOption = {
    id: "DISABLED",
    label: "Disabled (deterministic scoring only)",
    selfHosted: true,
    defaultModel: "",
    configured: true,
};

export function AiProviderSettingsPanel() {
    const [providers, setProviders] = useState<ProviderOption[]>([]);
    const [provider, setProvider] = useState("OLLAMA");
    const [model, setModel] = useState("");
    const [endpoint, setEndpoint] = useState("");
    const [enabled, setEnabled] = useState(true);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [probe, setProbe] = useState<ProbeResult | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const selected = providers.find((entry) => entry.id === provider);

    const load = useCallback(async () => {
        try {
            const response = await fetch("/api/ai/providers", { cache: "no-store" });
            if (!response.ok) {
                throw new Error("Failed to load AI providers");
            }

            const payload = await response.json();
            setProviders(payload.data.providers ?? []);
            setProvider(payload.data.current?.provider ?? "OLLAMA");
            setModel(payload.data.current?.model ?? "");
            setEndpoint(payload.data.current?.endpoint ?? "");
            setEnabled(payload.data.current?.enabled ?? true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load AI providers");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const testConnection = useCallback(async () => {
        setIsTesting(true);
        setProbe(null);
        setError(null);

        try {
            const response = await fetch("/api/ai/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider,
                    model: model || undefined,
                    endpoint: endpoint || null,
                }),
            });

            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload?.error ?? "Connection test failed");
            }

            setProbe(payload.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Connection test failed");
        } finally {
            setIsTesting(false);
        }
    }, [provider, model, endpoint]);

    const save = useCallback(async () => {
        setIsSaving(true);
        setNotice(null);
        setError(null);

        try {
            const response = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    aiProvider: provider,
                    aiModel: model || null,
                    aiEndpoint: endpoint || null,
                    aiRiskAssessmentEnabled: enabled,
                }),
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.error ?? "Failed to save AI settings");
            }

            setNotice("AI provider settings saved.");
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save AI settings");
        } finally {
            setIsSaving(false);
        }
    }, [provider, model, endpoint, enabled, load]);

    if (isLoading) {
        return (
            <div className="card p-6 flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                <Loader2 size={16} className="animate-spin" />
                Loading AI provider settings…
            </div>
        );
    }

    const options = [...providers, DISABLED_OPTION];

    return (
        <div className="card p-6 space-y-5">
            <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center shrink-0">
                    <Bot className="w-6 h-6 text-violet-500 dark:text-violet-300" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">AI Analysis Provider</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                        Used for risk assessment and remediation guidance. A self-hosted provider keeps
                        vulnerability data inside your own perimeter.
                    </p>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
                    {error}
                </div>
            )}
            {notice && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                    {notice}
                </div>
            )}

            {/* Provider choice */}
            <div className="grid gap-3 sm:grid-cols-2">
                {options.map((option) => {
                    const isActive = option.id === provider;
                    const unavailable = !option.configured && option.id !== "DISABLED";

                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                                setProvider(option.id);
                                setProbe(null);
                                setModel(option.id === provider ? model : "");
                                setEndpoint("");
                            }}
                            className={`rounded-xl border p-3 text-left transition-colors ${
                                isActive
                                    ? "border-violet-400/60 bg-violet-400/10"
                                    : "border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]"
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                                    {option.selfHosted ? <HardDrive size={14} /> : <Cloud size={14} />}
                                    {option.label}
                                </span>
                                {isActive && <CheckCircle2 size={15} className="text-violet-500 shrink-0" />}
                            </div>

                            {option.defaultModel && (
                                <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                                    Default model: {option.defaultModel}
                                </p>
                            )}

                            {unavailable && (
                                <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                                    <AlertTriangle size={11} />
                                    Set {option.apiKeyEnvVar} to use this
                                </p>
                            )}
                            {option.selfHosted && option.id !== "DISABLED" && (
                                <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                                    Data stays on your infrastructure
                                </p>
                            )}
                        </button>
                    );
                })}
            </div>

            {provider !== "DISABLED" && (
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                            Model
                        </span>
                        <input
                            value={model}
                            onChange={(event) => setModel(event.target.value)}
                            placeholder={selected?.defaultModel ?? ""}
                            list="ai-model-suggestions"
                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                        />
                        <datalist id="ai-model-suggestions">
                            {(probe?.models ?? []).map((name) => (
                                <option key={name} value={name} />
                            ))}
                        </datalist>
                        <span className="mt-1 block text-[11px] text-[var(--text-muted)]">
                            Leave blank to use {selected?.defaultModel ?? "the provider default"}.
                        </span>
                    </label>

                    <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">
                            Endpoint
                        </span>
                        <input
                            value={endpoint}
                            onChange={(event) => setEndpoint(event.target.value)}
                            placeholder={selected?.defaultEndpoint ?? ""}
                            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                        />
                        <span className="mt-1 block text-[11px] text-[var(--text-muted)]">
                            {selected?.selfHosted
                                ? "Point this at your Ollama server if it is not on localhost."
                                : "Leave blank unless you use a proxy or gateway."}
                        </span>
                    </label>
                </div>
            )}

            {/* Probe result */}
            {probe && (
                <div
                    className={`rounded-lg border px-3 py-2 text-sm ${
                        probe.reachable
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300"
                    }`}
                >
                    {probe.reachable ? (
                        <>
                            Connected in {probe.latencyMs}ms.
                            {probe.models?.length
                                ? ` ${probe.models.length} model${probe.models.length === 1 ? "" : "s"} available: ${probe.models.slice(0, 5).join(", ")}`
                                : " No model list returned."}
                        </>
                    ) : (
                        <>Not reachable: {probe.error}</>
                    )}
                </div>
            )}

            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => setEnabled(event.target.checked)}
                />
                Use AI for risk assessment (deterministic scoring is always used as a fallback)
            </label>

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => void testConnection()}
                    disabled={isTesting || provider === "DISABLED"}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-60"
                >
                    {isTesting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    Test connection
                </button>
                <button
                    type="button"
                    onClick={() => void save()}
                    disabled={isSaving}
                    className="btn btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
                >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save
                </button>
            </div>
        </div>
    );
}
