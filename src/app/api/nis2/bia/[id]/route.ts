import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { IMPACT_SCALE_MAX, IMPACT_SCALE_MIN, computeImpactScore, detectGaps } from "@/lib/nis2/bia";

const impactRating = z.number().int().min(IMPACT_SCALE_MIN).max(IMPACT_SCALE_MAX);

const updateProcessSchema = z.object({
    name: z.string().min(2).max(200).optional(),
    description: z.string().max(4000).nullable().optional(),
    owner: z.string().max(200).nullable().optional(),
    criticality: z.enum(["VITAL", "CRITICAL", "IMPORTANT", "SUPPORTING"]).optional(),
    rtoHours: z.number().int().min(0).max(8760).nullable().optional(),
    rpoHours: z.number().int().min(0).max(8760).nullable().optional(),
    mtpdHours: z.number().int().min(0).max(8760).nullable().optional(),
    financialImpact: impactRating.optional(),
    operationalImpact: impactRating.optional(),
    reputationalImpact: impactRating.optional(),
    regulatoryImpact: impactRating.optional(),
    safetyImpact: impactRating.optional(),
    bcpDocumented: z.boolean().optional(),
    drpDocumented: z.boolean().optional(),
    lastTestedAt: z.iso.datetime().nullable().optional(),
    assetIds: z.array(z.string().min(1)).max(500).optional(),
    vendorIds: z.array(z.string().min(1)).max(500).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const { id } = await params;
        const process = await prisma.nis2BusinessProcess.findFirst({
            where: { id, organizationId: authResult.context.organizationId },
            include: {
                assetDependencies: {
                    include: { asset: { select: { id: true, name: true, type: true, criticality: true } } },
                },
                vendorDependencies: {
                    include: { vendor: { select: { id: true, name: true, criticality: true, securityScore: true } } },
                },
            },
        });

        if (!process) {
            return NextResponse.json({ error: "Business process not found" }, { status: 404 });
        }

        return NextResponse.json({ data: { ...process, gaps: detectGaps(process) } });
    } catch (error) {
        console.error("Error fetching NIS2 business process:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authResult = await requireSessionWithOrg(request, {
        allowedRoles: ["MAIN_OFFICER", "IT_OFFICER"],
    });
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId, userId } = authResult.context;

    try {
        const { id } = await params;
        const parsed = updateProcessSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid business process update payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const existing = await prisma.nis2BusinessProcess.findFirst({ where: { id, organizationId } });
        if (!existing) {
            return NextResponse.json({ error: "Business process not found" }, { status: 404 });
        }

        const { assetIds, vendorIds, lastTestedAt, ...updates } = parsed.data;

        if (assetIds) {
            const unique = [...new Set(assetIds)];
            const owned = await prisma.asset.count({ where: { id: { in: unique }, organizationId } });
            if (owned !== unique.length) {
                return NextResponse.json(
                    { error: "One or more assets do not belong to this organization" },
                    { status: 400 },
                );
            }
        }
        if (vendorIds) {
            const unique = [...new Set(vendorIds)];
            const owned = await prisma.nis2Vendor.count({ where: { id: { in: unique }, organizationId } });
            if (owned !== unique.length) {
                return NextResponse.json(
                    { error: "One or more vendors do not belong to this organization" },
                    { status: 400 },
                );
            }
        }

        // Impact score is derived from the post-patch dimension ratings.
        const merged = { ...existing, ...updates };

        const process = await prisma.$transaction(async (tx) => {
            if (assetIds) {
                await tx.nis2ProcessAssetDependency.deleteMany({ where: { processId: existing.id } });
                await tx.nis2ProcessAssetDependency.createMany({
                    data: [...new Set(assetIds)].map((assetId) => ({
                        processId: existing.id,
                        assetId,
                        organizationId,
                    })),
                });
            }
            if (vendorIds) {
                await tx.nis2ProcessVendorDependency.deleteMany({ where: { processId: existing.id } });
                await tx.nis2ProcessVendorDependency.createMany({
                    data: [...new Set(vendorIds)].map((vendorId) => ({
                        processId: existing.id,
                        vendorId,
                        organizationId,
                    })),
                });
            }

            return tx.nis2BusinessProcess.update({
                where: { id: existing.id },
                data: {
                    ...updates,
                    ...(lastTestedAt !== undefined && {
                        lastTestedAt: lastTestedAt ? new Date(lastTestedAt) : null,
                    }),
                    impactScore: computeImpactScore(merged),
                },
                include: {
                    assetDependencies: { include: { asset: { select: { id: true, name: true, type: true } } } },
                    vendorDependencies: { include: { vendor: { select: { id: true, name: true } } } },
                },
            });
        });

        await prisma.auditLog.create({
            data: {
                action: "NIS2_BUSINESS_PROCESS_UPDATED",
                entityType: "Nis2BusinessProcess",
                entityId: process.id,
                oldValue: { criticality: existing.criticality, impactScore: existing.impactScore },
                newValue: { criticality: process.criticality, impactScore: process.impactScore },
                userId,
                organizationId,
            },
        });

        return NextResponse.json({ data: { ...process, gaps: detectGaps(process) } });
    } catch (error) {
        console.error("Error updating NIS2 business process:", error);
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
        const existing = await prisma.nis2BusinessProcess.findFirst({
            where: { id, organizationId },
            select: { id: true, name: true },
        });

        if (!existing) {
            return NextResponse.json({ error: "Business process not found" }, { status: 404 });
        }

        await prisma.nis2BusinessProcess.delete({ where: { id: existing.id } });

        await prisma.auditLog.create({
            data: {
                action: "NIS2_BUSINESS_PROCESS_DELETED",
                entityType: "Nis2BusinessProcess",
                entityId: existing.id,
                oldValue: { name: existing.name },
                userId,
                organizationId,
            },
        });

        return NextResponse.json({ data: { id: existing.id } });
    } catch (error) {
        console.error("Error deleting NIS2 business process:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
