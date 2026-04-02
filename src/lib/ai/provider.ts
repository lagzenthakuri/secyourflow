import { prisma } from "@/lib/prisma";
import { AIProvider } from "@prisma/client";

export interface AIResponse {
    content: string;
    raw?: any;
}

export async function askAI(organizationId: string, prompt: string, systemPrompt?: string): Promise<string> {
    const settings = await prisma.setting.findUnique({
        where: { organizationId }
    });

    if (!settings) {
        throw new Error("Organization settings not found");
    }

    const { aiProvider, aiModel, aiApiKey, aiBaseUrl } = settings;

    switch (aiProvider) {
        case "OLLAMA":
            const effectiveBaseUrl = process.env.OLLAMA_HOST || aiBaseUrl || "http://localhost:11434";
            return callOllama(aiModel, prompt, effectiveBaseUrl);
        case "OPENAI":
            return callOpenAI(aiModel, prompt, aiApiKey || "", systemPrompt);
        case "ANTHROPIC":
            return callAnthropic(aiModel, prompt, aiApiKey || "", systemPrompt);
        case "OPENROUTER":
            return callOpenRouter(aiModel, prompt, aiApiKey || "", systemPrompt);
        default:
            throw new Error(`Unsupported AI provider: ${aiProvider}`);
    }
}

async function callOllama(model: string, prompt: string, baseUrl: string): Promise<string> {
    try {
        const response = await fetch(`${baseUrl}/api/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: false,
                format: "json"
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error("[AIProvider] Ollama call failed:", error);
        throw error;
    }
}

async function callOpenAI(model: string, prompt: string, apiKey: string, systemPrompt?: string): Promise<string> {
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: model || "gpt-4o-mini",
                messages: [
                    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("[AIProvider] OpenAI call failed:", error);
        throw error;
    }
}

async function callAnthropic(model: string, prompt: string, apiKey: string, systemPrompt?: string): Promise<string> {
    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: model || "claude-3-haiku-20240307",
                max_tokens: 4096,
                system: systemPrompt,
                messages: [{ role: "user", content: prompt }]
            })
        });

        if (!response.ok) {
            throw new Error(`Anthropic error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.content[0].text;
    } catch (error) {
        console.error("[AIProvider] Anthropic call failed:", error);
        throw error;
    }
}

async function callOpenRouter(model: string, prompt: string, apiKey: string, systemPrompt?: string): Promise<string> {
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://secyourflow.com",
                "X-Title": "SecYourFlow"
            },
            body: JSON.stringify({
                model: model || "google/gemini-2.0-flash-001",
                messages: [
                    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("[AIProvider] OpenRouter call failed:", error);
        throw error;
    }
}
