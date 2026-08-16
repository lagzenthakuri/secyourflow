import { prisma } from "@/lib/prisma";
import { AI_ADAPTERS, apiKeyForProvider, getAdapter } from "@/lib/ai/providers";
import {
    type AiChatRequest,
    type AiChatResult,
    type AiProviderConfig,
    type AiProviderId,
    AI_PROVIDERS,
    extractJsonObject,
} from "@/lib/ai/types";

export * from "@/lib/ai/types";
export { AI_ADAPTERS, getAdapter, apiKeyForProvider, OLLAMA_DEFAULT_ENDPOINT } from "@/lib/ai/providers";

function isAiProviderId(value: string): value is AiProviderId {
    return (AI_PROVIDERS as readonly string[]).includes(value);
}

/**
 * Resolves the provider for an organization from its saved settings, falling
 * back to environment defaults. Returns null when analysis is switched off or
 * the selected provider has no usable credentials.
 */
export async function resolveAiConfig(organizationId: string): Promise<AiProviderConfig | null> {
    const settings = await prisma.setting.findUnique({
        where: { organizationId },
        select: {
            aiRiskAssessmentEnabled: true,
            aiProvider: true,
            aiModel: true,
            aiEndpoint: true,
        },
    });

    if (settings && !settings.aiRiskAssessmentEnabled) {
        return null;
    }

    const configured = settings?.aiProvider;
    const provider: AiProviderId =
        configured && isAiProviderId(configured)
            ? configured
            : (process.env.AI_PROVIDER && isAiProviderId(process.env.AI_PROVIDER)
                  ? process.env.AI_PROVIDER
                  : "OLLAMA");

    const adapter = getAdapter(provider);
    if (!adapter) {
        return null;
    }

    const apiKey = apiKeyForProvider(provider);
    if (adapter.apiKeyEnvVar && !apiKey) {
        // A hosted provider without its key cannot run; the caller falls back.
        return null;
    }

    return {
        provider,
        model: settings?.aiModel?.trim() || adapter.defaultModel,
        endpoint: settings?.aiEndpoint?.trim() || adapter.defaultEndpoint || null,
        apiKey,
    };
}

/** Sends a chat request using the organization's configured provider. */
export async function aiChat(
    organizationId: string,
    request: AiChatRequest,
): Promise<AiChatResult | null> {
    const config = await resolveAiConfig(organizationId);
    if (!config) {
        return null;
    }

    const adapter = getAdapter(config.provider);
    if (!adapter) {
        return null;
    }

    // A self-hosted model on modest hardware is far slower than a hosted API,
    // especially on long analysis prompts, so it gets a much larger budget.
    const defaultTimeout = adapter.selfHosted
        ? Number(process.env.AI_TIMEOUT_SELF_HOSTED_MS ?? 300_000)
        : Number(process.env.AI_TIMEOUT_MS ?? 60_000);

    return adapter.chat(config, { timeoutMs: defaultTimeout, ...request });
}

/**
 * Chat helper that insists on a JSON object, tolerating models that wrap it in
 * prose or a code fence. Returns null rather than throwing so analysis
 * pipelines can fall back to their deterministic path.
 */
export async function aiChatJson<T>(
    organizationId: string,
    request: AiChatRequest,
): Promise<{ value: T; model: string; provider: AiProviderId } | null> {
    try {
        const result = await aiChat(organizationId, { ...request, json: true });
        if (!result) {
            return null;
        }

        const json = extractJsonObject(result.content);
        if (!json) {
            console.warn(`[AI] ${result.provider}/${result.model} returned no parsable JSON object`);
            return null;
        }

        return { value: JSON.parse(json) as T, model: result.model, provider: result.provider };
    } catch (error) {
        console.error("[AI] chat request failed:", error instanceof Error ? error.message : error);
        return null;
    }
}

export interface AiProviderStatus {
    id: AiProviderId;
    label: string;
    selfHosted: boolean;
    defaultModel: string;
    defaultEndpoint?: string;
    apiKeyEnvVar?: string;
    /** True when the provider has whatever credentials it needs. */
    configured: boolean;
}

/** Describes every provider for the settings UI, without contacting them. */
export function listAiProviders(): AiProviderStatus[] {
    return Object.values(AI_ADAPTERS).map((adapter) => ({
        id: adapter.id,
        label: adapter.label,
        selfHosted: adapter.selfHosted,
        defaultModel: adapter.defaultModel,
        defaultEndpoint: adapter.defaultEndpoint,
        apiKeyEnvVar: adapter.apiKeyEnvVar,
        configured: adapter.apiKeyEnvVar ? Boolean(apiKeyForProvider(adapter.id)) : true,
    }));
}
