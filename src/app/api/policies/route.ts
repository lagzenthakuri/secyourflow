import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { RelationshipError, replacePolicyLinks } from "@/lib/grc/relationships";
import { allowedPolicyTransitions, POLICY_REVIEW_DUE_SOON_DAYS } from "@/lib/grc/policy-workflow";

const POLICY_TYPES = ["POLICY", "STANDARD", "PROCEDURE", "GUIDELINE"] as const;

const createPolicySchema = z.object({
    title: z.string().min(2).max(300),
    description: z.string().max(12000).nullable().optional(),
    version: z.string().min(1).max(20).default("1.0"),
    type: z.enum(POLICY_TYPES).default("POLICY"),
    url: z.string().url().max(2000).nullable().optional(),
    owner: z.string().max(200).nullable().optional(),
    nextReview: z.iso.datetime().nullable().optional(),
    riskIds: z.array(z.string().min(1)).max(500).optional(),
    assetIds: z.array(z.string().min(1)).max(500).optional(),
    vendorIds: z.array(z.string().min(1)).max(500).optional(),
    dataAssetIds: z.array(z.string().min(1)).max(500).optional(),
    controlIds: z.array(z.string().min(1)).max(500).optional(),
});

export async function GET(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const policies = await prisma.policy.findMany({
            where: { organizationId: authResult.context.organizationId },
            include: {
                _count: {
                    select: {
                        riskLinks: true,
                        assetLinks: true,
                        vendorLinks: true,
                        dataLinks: true,
                        controlLinks: true,
                    },
                },
            },
            orderBy: [{ status: "asc" }, { nextReview: "asc" }, { title: "asc" }],
        });

        const now = Date.now();
        const horizonMs = POLICY_REVIEW_DUE_SOON_DAYS * 24 * 60 * 60 * 1000;

        return NextResponse.json({
            data: policies.map((policy) => ({
                id: policy.id,
                title: policy.title,
                description: policy.description,
                version: policy.version,
                status: policy.status,
                type: policy.type,
                url: policy.url,
                owner: policy.owner,
                lastReview: policy.lastReview,
                nextReview: policy.nextReview,
                createdAt: policy.createdAt,
                updatedAt: policy.updatedAt,
                allowedTransitions: allowedPolicyTransitions(policy.status),
                reviewState: !policy.nextReview
                    ? "UNSCHEDULED"
                    : policy.nextReview.getTime() < now
                      ? "OVERDUE"
                      : policy.nextReview.getTime() - now <= horizonMs
                        ? "DUE_SOON"
                        : "CURRENT",
                counts: {
                    risks: policy._count.riskLinks,
                    assets: policy._count.assetLinks,
                    vendors: policy._count.vendorLinks,
                    data: policy._count.dataLinks,
                    controls: policy._count.controlLinks,
                },
            })),
        });
    } catch (error) {
        console.error("Error fetching policies:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER"] });
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId, userId } = authResult.context;

    try {
        const parsed = createPolicySchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid policy payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { nextReview, riskIds, assetIds, vendorIds, dataAssetIds, controlIds, ...fields } =
            parsed.data;

        const policy = await prisma.policy.create({
            data: {
                ...fields,
                nextReview: nextReview ? new Date(nextReview) : null,
                organizationId,
            },
        });

        await replacePolicyLinks(policy.id, organizationId, {
            riskIds,
            assetIds,
            vendorIds,
            dataAssetIds,
            controlIds,
        });

        await prisma.auditLog.create({
            data: {
                action: "POLICY_CREATED",
                entityType: "Policy",
                entityId: policy.id,
                newValue: { title: policy.title, type: policy.type, version: policy.version },
                userId,
                organizationId,
            },
        });

        return NextResponse.json({ data: policy }, { status: 201 });
    } catch (error) {
        if (error instanceof RelationshipError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Error creating policy:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
