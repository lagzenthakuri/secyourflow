import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { listAiProviders, resolveAiConfig } from "@/lib/ai";

/**
 * Lists selectable AI providers plus the organization's current selection.
 * Never returns API key material — only whether a key is present.
 */
export async function GET(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId } = authResult.context;

    try {
        const [settings, active] = await Promise.all([
            prisma.setting.findUnique({
                where: { organizationId },
                select: {
                    aiRiskAssessmentEnabled: true,
                    aiProvider: true,
                    aiModel: true,
                    aiEndpoint: true,
                },
            }),
            resolveAiConfig(organizationId),
        ]);

        return NextResponse.json({
            data: {
                providers: listAiProviders(),
                current: {
                    enabled: settings?.aiRiskAssessmentEnabled ?? true,
                    provider: settings?.aiProvider ?? "OLLAMA",
                    model: settings?.aiModel ?? null,
                    endpoint: settings?.aiEndpoint ?? null,
                },
                // What the engine would actually use right now.
                effective: active
                    ? { provider: active.provider, model: active.model, endpoint: active.endpoint }
                    : null,
            },
        });
    } catch (error) {
        console.error("Error listing AI providers:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
