import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { IMPACT_SCALE_MAX, IMPACT_SCALE_MIN, computeImpactScore, detectGaps, summarizeBia } from "@/lib/nis2/bia";

const impactRating = z.number().int().min(IMPACT_SCALE_MIN).max(IMPACT_SCALE_MAX);

const processInputSchema = z.object({
    name: z.string().min(2).max(200),
    description: z.string().max(4000).nullable().optional(),
    owner: z.string().max(200).nullable().optional(),
    criticality: z.enum(["VITAL", "CRITICAL", "IMPORTANT", "SUPPORTING"]).default("IMPORTANT"),
    rtoHours: z.number().int().min(0).max(8760).nullable().optional(),
    rpoHours: z.number().int().min(0).max(8760).nullable().optional(),
    mtpdHours: z.number().int().min(0).max(8760).nullable().optional(),
    financialImpact: impactRating.default(1),
    operationalImpact: impactRating.default(1),
    reputationalImpact: impactRating.default(1),
    regulatoryImpact: impactRating.default(1),
    safetyImpact: impactRating.default(1),
    bcpDocumented: z.boolean().default(false),
    drpDocumented: z.boolean().default(false),
    lastTestedAt: z.iso.datetime().nullable().optional(),
    assetIds: z.array(z.string().min(1)).max(500).default([]),
    vendorIds: z.array(z.string().min(1)).max(500).default([]),
});

export async function GET(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const processes = await prisma.nis2BusinessProcess.findMany({
            where: { organizationId: authResult.context.organizationId },
            include: {
                assetDependencies: {
                    include: { asset: { select: { id: true, name: true, type: true, criticality: true } } },
                },
                vendorDependencies: {
                    include: { vendor: { select: { id: true, name: true, criticality: true, securityScore: true } } },
                },
            },
            orderBy: [{ criticality: "asc" }, { name: "asc" }],
        });

        const now = new Date();

        return NextResponse.json({
            data: processes.map((process) => ({ ...process, gaps: detectGaps(process, now) })),
            summary: summarizeBia(processes, now),
        });
    } catch (error) {
        console.error("Error fetching NIS2 business processes:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request, {
        allowedRoles: ["MAIN_OFFICER", "IT_OFFICER"],
    });
    if (!authResult.ok) {
        return authResult.response;
    }

    const { organizationId, userId } = authResult.context;

    try {
        const parsed = processInputSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid business process payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { assetIds, vendorIds, lastTestedAt, ...input } = parsed.data;

        const uniqueAssetIds = [...new Set(assetIds)];
        const uniqueVendorIds = [...new Set(vendorIds)];

        // Dependencies must stay inside the tenant boundary.
        if (uniqueAssetIds.length > 0) {
            const owned = await prisma.asset.count({
                where: { id: { in: uniqueAssetIds }, organizationId },
            });
            if (owned !== uniqueAssetIds.length) {
                return NextResponse.json(
                    { error: "One or more assets do not belong to this organization" },
                    { status: 400 },
                );
            }
        }
        if (uniqueVendorIds.length > 0) {
            const owned = await prisma.nis2Vendor.count({
                where: { id: { in: uniqueVendorIds }, organizationId },
            });
            if (owned !== uniqueVendorIds.length) {
                return NextResponse.json(
                    { error: "One or more vendors do not belong to this organization" },
                    { status: 400 },
                );
            }
        }

        const process = await prisma.nis2BusinessProcess.create({
            data: {
                ...input,
                organizationId,
                lastTestedAt: lastTestedAt ? new Date(lastTestedAt) : null,
                impactScore: computeImpactScore(input),
                assetDependencies: {
                    create: uniqueAssetIds.map((assetId) => ({ assetId, organizationId })),
                },
                vendorDependencies: {
                    create: uniqueVendorIds.map((vendorId) => ({ vendorId, organizationId })),
                },
            },
            include: {
                assetDependencies: { include: { asset: { select: { id: true, name: true, type: true } } } },
                vendorDependencies: { include: { vendor: { select: { id: true, name: true } } } },
            },
        });

        await prisma.auditLog.create({
            data: {
                action: "NIS2_BUSINESS_PROCESS_CREATED",
                entityType: "Nis2BusinessProcess",
                entityId: process.id,
                newValue: { name: process.name, criticality: process.criticality, impactScore: process.impactScore },
                userId,
                organizationId,
            },
        });

        return NextResponse.json({ data: { ...process, gaps: detectGaps(process) } }, { status: 201 });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json({ error: "A process with that name already exists" }, { status: 409 });
        }
        console.error("Error creating NIS2 business process:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
