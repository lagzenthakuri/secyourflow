import {
    type AiChatResult,
    type AiProbeResult,
    type AiProviderAdapter,
    type AiProviderConfig,
    type AiProviderId,
    DEFAULT_AI_TIMEOUT_MS,
    fetchWithTimeout,
} from "@/lib/ai/types";

export const OLLAMA_DEFAULT_ENDPOINT = "http://127.0.0.1:11434";

function requireApiKey(config: AiProviderConfig, envVar: string): string {
    const key = config.apiKey?.trim();
    if (!key) {
        throw new Error(`${envVar} is not configured`);
    }
    return key;
}

function baseUrl(config: AiProviderConfig, fallback: string): string {
    return (config.endpoint?.trim() || fallback).replace(/\/+$/, "");
}

/**
 * Ollama — runs on the operator's own machine, so scan and vulnerability data
 * never leaves the perimeter. No API key.
 */
const ollama: AiProviderAdapter = {
    id: "OLLAMA",
    label: "Ollama (self-hosted)",
    selfHosted: true,
    defaultModel: "llama3.1",
    defaultEndpoint: OLLAMA_DEFAULT_ENDPOINT,

    async chat(config, request) {
        const url = `${baseUrl(config, OLLAMA_DEFAULT_ENDPOINT)}/api/chat`;

        const response = await fetchWithTimeout(
            url,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: config.model,
                    messages: request.messages,
                    stream: false,
                    ...(request.json && { format: "json" }),
                    options: { temperature: request.temperature ?? 0.2 },
                }),
            },
            request.timeoutMs ?? DEFAULT_AI_TIMEOUT_MS,
        );

        if (!response.ok) {
            throw new Error(`Ollama responded ${response.status}: ${await response.text()}`);
        }

        const data = (await response.json()) as { message?: { content?: string } };
        const content = data.message?.content;
        if (typeof content !== "string") {
            throw new Error("Ollama returned no message content");
        }

        return { content, model: config.model, provider: "OLLAMA" };
    },

    async probe(config) {
        const started = Date.now();
        try {
            const response = await fetchWithTimeout(
                `${baseUrl(config, OLLAMA_DEFAULT_ENDPOINT)}/api/tags`,
                { method: "GET" },
                8_000,
            );

            if (!response.ok) {
                return { reachable: false, error: `Ollama responded ${response.status}` };
            }

            const data = (await response.json()) as { models?: { name?: string }[] };
            return {
                reachable: true,
                latencyMs: Date.now() - started,
                models: (data.models ?? []).map((m) => m.name).filter((n): n is string => Boolean(n)),
            };
        } catch (error) {
            return {
                reachable: false,
                error: error instanceof Error ? error.message : "Unreachable",
            };
        }
    },
};

/** Shared implementation for the OpenAI-compatible chat completions shape. */
function openAiCompatible(options: {
    id: AiProviderId;
    label: string;
    apiKeyEnvVar: string;
    defaultModel: string;
    defaultEndpoint: string;
    extraHeaders?: Record<string, string>;
}): AiProviderAdapter {
    return {
        id: options.id,
        label: options.label,
        selfHosted: false,
        apiKeyEnvVar: options.apiKeyEnvVar,
        defaultModel: options.defaultModel,
        defaultEndpoint: options.defaultEndpoint,

        async chat(config, request): Promise<AiChatResult> {
            const key = requireApiKey(config, options.apiKeyEnvVar);

            const response = await fetchWithTimeout(
                `${baseUrl(config, options.defaultEndpoint)}/chat/completions`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${key}`,
                        "Content-Type": "application/json",
                        ...options.extraHeaders,
                    },
                    body: JSON.stringify({
                        model: config.model,
                        messages: request.messages,
                        temperature: request.temperature ?? 0.2,
                        ...(request.json && { response_format: { type: "json_object" } }),
                    }),
                },
                request.timeoutMs ?? DEFAULT_AI_TIMEOUT_MS,
            );

            if (!response.ok) {
                throw new Error(`${options.label} responded ${response.status}: ${await response.text()}`);
            }

            const data = (await response.json()) as {
                choices?: { message?: { content?: string } }[];
            };
            const content = data.choices?.[0]?.message?.content;
            if (typeof content !== "string") {
                throw new Error(`${options.label} returned no message content`);
            }

            return { content, model: config.model, provider: options.id };
        },

        async probe(config): Promise<AiProbeResult> {
            const started = Date.now();
            try {
                const key = requireApiKey(config, options.apiKeyEnvVar);
                const response = await fetchWithTimeout(
                    `${baseUrl(config, options.defaultEndpoint)}/models`,
                    { method: "GET", headers: { Authorization: `Bearer ${key}` } },
                    8_000,
                );

                if (!response.ok) {
                    return { reachable: false, error: `Responded ${response.status}` };
                }

                const data = (await response.json()) as { data?: { id?: string }[] };
                return {
                    reachable: true,
                    latencyMs: Date.now() - started,
                    models: (data.data ?? []).map((m) => m.id).filter((id): id is string => Boolean(id)),
                };
            } catch (error) {
                return {
                    reachable: false,
                    error: error instanceof Error ? error.message : "Unreachable",
                };
            }
        },
    };
}

const openrouter = openAiCompatible({
    id: "OPENROUTER",
    label: "OpenRouter",
    apiKeyEnvVar: "OPENROUTER_API_KEY",
    defaultModel: "google/gemini-2.0-flash-001",
    defaultEndpoint: "https://openrouter.ai/api/v1",
    extraHeaders: { "X-Title": "SecYourFlow" },
});

const openai = openAiCompatible({
    id: "OPENAI",
    label: "OpenAI",
    apiKeyEnvVar: "OPENAI_API_KEY",
    defaultModel: "gpt-4o-mini",
    defaultEndpoint: "https://api.openai.com/v1",
});

/** Anthropic uses its own message shape rather than the OpenAI one. */
const anthropic: AiProviderAdapter = {
    id: "ANTHROPIC",
    label: "Anthropic",
    selfHosted: false,
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    defaultModel: "claude-sonnet-5",
    defaultEndpoint: "https://api.anthropic.com/v1",

    async chat(config, request) {
        const key = requireApiKey(config, "ANTHROPIC_API_KEY");

        const system = request.messages
            .filter((message) => message.role === "system")
            .map((message) => message.content)
            .join("\n\n");
        const user = request.messages.filter((message) => message.role === "user");

        const response = await fetchWithTimeout(
            `${baseUrl(config, "https://api.anthropic.com/v1")}/messages`,
            {
                method: "POST",
                headers: {
                    "x-api-key": key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: config.model,
                    max_tokens: 4096,
                    temperature: request.temperature ?? 0.2,
                    ...(system && { system }),
                    messages: user.map((message) => ({ role: "user", content: message.content })),
                }),
            },
            request.timeoutMs ?? DEFAULT_AI_TIMEOUT_MS,
        );

        if (!response.ok) {
            throw new Error(`Anthropic responded ${response.status}: ${await response.text()}`);
        }

        const data = (await response.json()) as { content?: { type?: string; text?: string }[] };
        const content = data.content?.find((block) => block.type === "text")?.text;
        if (typeof content !== "string") {
            throw new Error("Anthropic returned no text content");
        }

        return { content, model: config.model, provider: "ANTHROPIC" };
    },

    async probe(config) {
        const started = Date.now();
        try {
            const key = requireApiKey(config, "ANTHROPIC_API_KEY");
            const response = await fetchWithTimeout(
                `${baseUrl(config, "https://api.anthropic.com/v1")}/models`,
                { method: "GET", headers: { "x-api-key": key, "anthropic-version": "2023-06-01" } },
                8_000,
            );

            if (!response.ok) {
                return { reachable: false, error: `Responded ${response.status}` };
            }

            const data = (await response.json()) as { data?: { id?: string }[] };
            return {
                reachable: true,
                latencyMs: Date.now() - started,
                models: (data.data ?? []).map((m) => m.id).filter((id): id is string => Boolean(id)),
            };
        } catch (error) {
            return {
                reachable: false,
                error: error instanceof Error ? error.message : "Unreachable",
            };
        }
    },
};

export const AI_ADAPTERS: Record<Exclude<AiProviderId, "DISABLED">, AiProviderAdapter> = {
    OLLAMA: ollama,
    OPENROUTER: openrouter,
    OPENAI: openai,
    ANTHROPIC: anthropic,
};

export function getAdapter(provider: AiProviderId): AiProviderAdapter | null {
    if (provider === "DISABLED") return null;
    return AI_ADAPTERS[provider] ?? null;
}

/** API keys stay in the environment; only the provider choice is persisted. */
export function apiKeyForProvider(provider: AiProviderId): string | null {
    const adapter = getAdapter(provider);
    if (!adapter?.apiKeyEnvVar) return null;
    return process.env[adapter.apiKeyEnvVar]?.trim() || null;
}
