/**
 * Provider-agnostic chat interface for the analysis features.
 *
 * The platform must be able to run entirely on-premise — a CISO assessing
 * their own vulnerabilities should not be forced to ship that data to a
 * third-party API. Ollama is therefore a first-class provider, not an
 * afterthought, and is the default when it is reachable.
 */

export const AI_PROVIDERS = ["OLLAMA", "OPENROUTER", "OPENAI", "ANTHROPIC", "DISABLED"] as const;

export type AiProviderId = (typeof AI_PROVIDERS)[number];

export interface AiMessage {
    role: "system" | "user";
    content: string;
}

export interface AiChatRequest {
    messages: AiMessage[];
    /** Ask the provider for strict JSON where it supports it. */
    json?: boolean;
    temperature?: number;
    /** Hard ceiling on wall-clock time for a single call. */
    timeoutMs?: number;
}

export interface AiChatResult {
    content: string;
    model: string;
    provider: AiProviderId;
}

export interface AiProviderConfig {
    provider: AiProviderId;
    model: string;
    /** Base URL. Only meaningful for self-hosted providers such as Ollama. */
    endpoint?: string | null;
    apiKey?: string | null;
}

export interface AiProviderAdapter {
    id: AiProviderId;
    label: string;
    /** True when this provider runs inside the caller's own perimeter. */
    selfHosted: boolean;
    /** Where the key comes from, for surfacing setup instructions. */
    apiKeyEnvVar?: string;
    defaultModel: string;
    defaultEndpoint?: string;
    chat(config: AiProviderConfig, request: AiChatRequest): Promise<AiChatResult>;
    /** Cheap reachability probe used by the settings UI. */
    probe(config: AiProviderConfig): Promise<AiProbeResult>;
}

export interface AiProbeResult {
    reachable: boolean;
    /** Models the provider reports, when it can enumerate them. */
    models?: string[];
    error?: string;
    latencyMs?: number;
}

export const DEFAULT_AI_TIMEOUT_MS = 60_000;

/** Shared fetch wrapper so every provider honours the same timeout budget. */
export async function fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs = DEFAULT_AI_TIMEOUT_MS,
): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Models sometimes wrap JSON in prose or a fenced block even when asked not
 * to. Smaller local models do this often enough that stripping it is required
 * rather than defensive.
 */
export function extractJsonObject(raw: string): string | null {
    const trimmed = raw.trim();

    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1].trim() : trimmed;

    if (candidate.startsWith("{") && candidate.endsWith("}")) {
        return candidate;
    }

    // Fall back to the outermost brace pair.
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end > start) {
        return candidate.slice(start, end + 1);
    }

    return null;
}
