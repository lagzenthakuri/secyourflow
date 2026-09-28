import { afterEach, describe, expect, it, vi } from "vitest";
import { AI_ADAPTERS } from "@/lib/ai/providers";
import type { AiProviderConfig } from "@/lib/ai/types";

/**
 * These tests pin the exact request bodies each provider receives. The bug they
 * exist to prevent was silent: a rejected parameter made every Anthropic call
 * throw, the error was swallowed into a null, and the risk engine quietly
 * substituted a canned fallback that the UI rendered as a real AI assessment.
 */

function mockFetch(responseBody: unknown, ok = true) {
  const fetchMock = vi.fn(async () =>
    ({
      ok,
      status: ok ? 200 : 400,
      json: async () => responseBody,
      text: async () => JSON.stringify(responseBody),
    }) as unknown as Response,
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

type FetchCall = [string, RequestInit];

function callsOf(fetchMock: { mock: { calls: unknown[] } }): FetchCall[] {
  return fetchMock.mock.calls as unknown as FetchCall[];
}

function bodyOf(fetchMock: { mock: { calls: unknown[] } }): Record<string, unknown> {
  return JSON.parse(callsOf(fetchMock)[0][1].body as string);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const anthropicConfig: AiProviderConfig = {
  provider: "ANTHROPIC",
  model: "claude-opus-5",
  apiKey: "test-key",
};

describe("Anthropic adapter", () => {
  it("never sends sampling parameters", async () => {
    // Removed on the Claude 5 family; sending any of them returns HTTP 400.
    const fetchMock = mockFetch({ content: [{ type: "text", text: "{}" }] });

    await AI_ADAPTERS.ANTHROPIC.chat(anthropicConfig, {
      messages: [{ role: "user", content: "hello" }],
      temperature: 0.2,
    });

    const body = bodyOf(fetchMock);
    expect(body).not.toHaveProperty("temperature");
    expect(body).not.toHaveProperty("top_p");
    expect(body).not.toHaveProperty("top_k");
  });

  it("sends the required headers and hoists system messages", async () => {
    const fetchMock = mockFetch({ content: [{ type: "text", text: "ok" }] });

    await AI_ADAPTERS.ANTHROPIC.chat(anthropicConfig, {
      messages: [
        { role: "system", content: "be terse" },
        { role: "user", content: "hello" },
      ],
    });

    const [url, init] = callsOf(fetchMock)[0];
    const headers = init.headers as Record<string, string>;

    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(headers["x-api-key"]).toBe("test-key");
    expect(headers["anthropic-version"]).toBe("2023-06-01");

    const body = bodyOf(fetchMock);
    expect(body.system).toBe("be terse");
    expect(body.messages).toEqual([{ role: "user", content: "hello" }]);
  });

  it("reports a policy refusal as a refusal, not a malformed response", async () => {
    // A decline is HTTP 200 with no text block.
    mockFetch({ stop_reason: "refusal", stop_details: { category: "cyber" }, content: [] });

    await expect(
      AI_ADAPTERS.ANTHROPIC.chat(anthropicConfig, { messages: [{ role: "user", content: "x" }] }),
    ).rejects.toThrow(/declined/i);
  });

  it("defaults to a current model id", () => {
    expect(AI_ADAPTERS.ANTHROPIC.defaultModel).toBe("claude-opus-5");
  });

  it("refuses to call out without a key", async () => {
    const fetchMock = mockFetch({});
    await expect(
      AI_ADAPTERS.ANTHROPIC.chat(
        { ...anthropicConfig, apiKey: null },
        { messages: [{ role: "user", content: "x" }] },
      ),
    ).rejects.toThrow(/ANTHROPIC_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("OpenAI-compatible adapters", () => {
  it("do send temperature and JSON mode", async () => {
    // The opposite of Anthropic: these providers accept both.
    const fetchMock = mockFetch({ choices: [{ message: { content: "{}" } }] });

    await AI_ADAPTERS.OPENAI.chat(
      { provider: "OPENAI", model: "gpt-4o-mini", apiKey: "k" },
      { messages: [{ role: "user", content: "hi" }], json: true },
    );

    const body = bodyOf(fetchMock);
    expect(body.temperature).toBe(0.2);
    expect(body.response_format).toEqual({ type: "json_object" });
  });
});

describe("Ollama adapter", () => {
  it("asks for JSON format and stays on the configured endpoint", async () => {
    const fetchMock = mockFetch({ message: { content: "{}" } });

    await AI_ADAPTERS.OLLAMA.chat(
      { provider: "OLLAMA", model: "llama3.1", endpoint: "http://127.0.0.1:11434" },
      { messages: [{ role: "user", content: "hi" }], json: true },
    );

    expect(callsOf(fetchMock)[0][0]).toBe("http://127.0.0.1:11434/api/chat");
    expect(bodyOf(fetchMock).format).toBe("json");
  });
});
