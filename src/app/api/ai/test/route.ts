import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { AI_PROVIDERS, apiKeyForProvider, getAdapter } from "@/lib/ai";
import { assertSafeOutboundUrl } from "@/lib/security/outbound-url";

const testSchema = z.object({
    provider: z.enum(AI_PROVIDERS),
    model: z.string().max(200).optional(),
    endpoint: z.url().max(2000).nullable().optional(),
});

/**
 * Probes a provider for reachability and, where possible, its model list.
 * Used by the settings UI so an operator can confirm a local Ollama before
 * committing to it.
 */
export async function POST(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request, {
        allowedRoles: ["MAIN_OFFICER", "IT_OFFICER"],
    });
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const parsed = testSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid provider test payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { provider, model, endpoint } = parsed.data;

        const adapter = getAdapter(provider);
        if (!adapter) {
            return NextResponse.json({
                data: { reachable: false, error: "AI analysis is disabled" },
            });
        }

        // A user-supplied endpoint is an SSRF vector, so vet it before calling.
        // Self-hosted providers are the exception: Ollama legitimately lives on
        // loopback over plain HTTP, which the default policy rejects.
        if (endpoint) {
            try {
                await assertSafeOutboundUrl(
                    endpoint,
                    adapter.selfHosted
                        ? { allowInsecureHttp: true, resolveDns: false }
                        : {},
                );
            } catch (error) {
                return NextResponse.json(
                    { error: error instanceof Error ? error.message : "Endpoint rejected" },
                    { status: 400 },
                );
            }
        }

        const result = await adapter.probe({
            provider,
            model: model?.trim() || adapter.defaultModel,
            endpoint: endpoint || adapter.defaultEndpoint || null,
            apiKey: apiKeyForProvider(provider),
        });

        return NextResponse.json({ data: result });
    } catch (error) {
        console.error("Error testing AI provider:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
