import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { RelationshipError, replacePolicyLinks } from "@/lib/grc/relationships";
import { riskLevelForScore } from "@/lib/grc/appetite";
import {
    allowedPolicyTransitions,
    assertValidPolicyTransition,
    policyReviewStampForTransition,
    policyReviewState,
    type PolicyReviewStamp,
} from "@/lib/grc/policy-workflow";

const POLICY_TYPES = ["POLICY", "STANDARD", "PROCEDURE", "GUIDELINE"] as const;
const POLICY_STATUSES = ["DRAFT", "UNDER_REVIEW", "ACTIVE", "ARCHIVED"] as const;

const updatePolicySchema = z
    .object({
        title: z.string().min(2).max(300).optional(),
        description: z.string().max(12000).nullable().optional(),
        version: z.string().min(1).max(20).optional(),
        type: z.enum(POLICY_TYPES).nullable().optional(),
        url: z.string().url().max(2000).nullable().optional(),
        owner: z.string().max(200).nullable().optional(),
        lastReview: z.iso.datetime().nullable().optional(),
        nextReview: z.iso.datetime().nullable().optional(),
        /** Lifecycle move; validated against the transition table. */
        status: z.enum(POLICY_STATUSES).optional(),
        riskIds: z.array(z.string().min(1)).max(500).optional(),
        assetIds: z.array(z.string().min(1)).max(500).optional(),
        vendorIds: z.array(z.string().min(1)).max(500).optional(),
        dataAssetIds: z.array(z.string().min(1)).max(500).optional(),
        controlIds: z.array(z.string().min(1)).max(500).optional(),
    })
    .refine(
        (value) =>
            Object.keys(value).some(
                (key) =>
                    key !== "status" &&
                    key !== "riskIds" &&
                    key !== "assetIds" &&
                    key !== "vendorIds" &&
                    key !== "dataAssetIds" &&
                    key !== "controlIds" &&
                    (value as Record<string, unknown>)[key] !== undefined,
            ) ||
            value.status !== undefined ||
            value.riskIds !== undefined ||
            value.assetIds !== undefined ||
            value.vendorIds !== undefined ||
            value.dataAssetIds !== undefined ||
            value.controlIds !== undefined,
        { message: "Nothing to update" },
    );

const LINK_KEYS = ["riskIds", "assetIds", "vendorIds", "dataAssetIds", "controlIds"] as const;

function policyLinksInclude() {
    return {
        riskLinks: {
            select: {
                risk: {
                    select: {
                        id: true,
                        riskScore: true,
                        isResolved: true,
                        assetId: true,
                        asset: { select: { id: true, name: true } },
                        vulnerability: { select: { id: true, title: true, cveId: true } },
                    },
                },
            },
        },
        assetLinks: { select: { asset: { select: { id: true, name: true, type: true } } } },
        vendorLinks: {
            select: {
                vendor: { select: { id: true, name: true, criticality: true } },
            },
        },
        dataLinks: {
            select: {
                dataAsset: { select: { id: true, name: true, category: true, classification: true } },
            },
        },
        controlLinks: {
            select: {
                control: {
                    select: {
                        id: true,
                        controlId: true,
                        title: true,
                        status: true,
                        implementationStatus: true,
                        framework: { select: { id: true, name: true } },
                    },
                },
            },
        },
    } as const;
}

function shapePolicy(policy: Awaited<ReturnType<typeof findPolicy>>) {
    if (!policy) return null;
    return {
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
        reviewState: policyReviewState(policy),
        risks: policy.riskLinks.map((link) => ({
            ...link.risk,
            riskLevel: riskLevelForScore(link.risk.riskScore),
        })),
        assets: policy.assetLinks.map((link) => link.asset),
        vendors: policy.vendorLinks.map((link) => link.vendor),
        data: policy.dataLinks.map((link) => link.dataAsset),
        controls: policy.controlLinks.map((link) => ({
            ...link.control,
            framework: link.control.framework.name,
        })),
    };
}

function findPolicy(organizationId: string, id: string) {
    return prisma.policy.findFirst({
        where: { id, organizationId },
        include: policyLinksInclude(),
    });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const { id } = await params;
        const policy = await findPolicy(authResult.context.organizationId, id);

        if (!policy) {
            return NextResponse.json({ error: "Policy not found" }, { status: 404 });
        }

        return NextResponse.json({ data: shapePolicy(policy) });
    } catch (error) {
        console.error("Error fetching policy:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER"] });
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId, userId } = authResult.context;

    try {
        const { id } = await params;
        const parsed = updatePolicySchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid policy payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const existing = await findPolicy(organizationId, id);
        if (!existing) {
            return NextResponse.json({ error: "Policy not found" }, { status: 404 });
        }

        const { status, lastReview, nextReview, ...fields } = parsed.data;
        const linkSets = Object.fromEntries(
            LINK_KEYS.filter((key) => parsed.data[key] !== undefined).map((key) => [
                key,
                parsed.data[key],
            ]),
        );

        const now = new Date();
        let reviewStamp: PolicyReviewStamp = { lastReview: null, nextReview: null };
        let statusChanged = false;

        if (status !== undefined && status !== existing.status) {
            try {
                assertValidPolicyTransition(existing.status, status);
            } catch (transitionError) {
                return NextResponse.json(
                    { error: transitionError instanceof Error ? transitionError.message : "Invalid status" },
                    { status: 409 },
                );
            }
            reviewStamp = policyReviewStampForTransition(existing.status, status, now);
            statusChanged = true;
        }

        // Explicit review dates win over the ones the transition implies.
        const reviewDates: { lastReview?: Date | null; nextReview?: Date | null } = {};
        if (lastReview !== undefined) {
            reviewDates.lastReview = lastReview ? new Date(lastReview) : null;
        } else if (reviewStamp.lastReview) {
            reviewDates.lastReview = reviewStamp.lastReview;
        }
        if (nextReview !== undefined) {
            reviewDates.nextReview = nextReview ? new Date(nextReview) : null;
        } else if (reviewStamp.nextReview) {
            reviewDates.nextReview = reviewStamp.nextReview;
        }

        const policy = await prisma.policy.update({
            where: { id: existing.id },
            data: {
                ...fields,
                ...(status !== undefined && { status }),
                ...reviewDates,
            },
        });

        await replacePolicyLinks(policy.id, organizationId, linkSets);

        if (statusChanged) {
            await prisma.auditLog.create({
                data: {
                    action: "POLICY_STATUS_CHANGED",
                    entityType: "Policy",
                    entityId: policy.id,
                    oldValue: { status: existing.status },
                    newValue: { status: policy.status },
                    userId,
                    organizationId,
                },
            });
        } else {
            await prisma.auditLog.create({
                data: {
                    action: "POLICY_UPDATED",
                    entityType: "Policy",
                    entityId: policy.id,
                    oldValue: { title: existing.title, version: existing.version },
                    newValue: { title: policy.title, version: policy.version },
                    userId,
                    organizationId,
                },
            });
        }

        const refreshed = await findPolicy(organizationId, policy.id);
        return NextResponse.json({ data: shapePolicy(refreshed) });
    } catch (error) {
        if (error instanceof RelationshipError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Error updating policy:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER"] });
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId, userId } = authResult.context;

    try {
        const { id } = await params;
        const existing = await prisma.policy.findFirst({
            where: { id, organizationId },
            select: { id: true, title: true },
        });
        if (!existing) {
            return NextResponse.json({ error: "Policy not found" }, { status: 404 });
        }

        await prisma.policy.delete({ where: { id: existing.id } });

        await prisma.auditLog.create({
            data: {
                action: "POLICY_DELETED",
                entityType: "Policy",
                entityId: existing.id,
                oldValue: { title: existing.title },
                userId,
                organizationId,
            },
        });

        return NextResponse.json({ data: { id: existing.id } });
    } catch (error) {
        console.error("Error deleting policy:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
