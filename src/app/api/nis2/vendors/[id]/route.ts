import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { CERTIFICATION_OPTIONS, scoreVendor } from "@/lib/nis2/vendors";

const updateVendorSchema = z.object({
    name: z.string().min(2).max(200).optional(),
    description: z.string().max(4000).nullable().optional(),
    serviceProvided: z.string().min(2).max(500).optional(),
    criticality: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4"]).optional(),
    dataAccessLevel: z.enum(["NONE", "PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"]).optional(),
    country: z.string().max(100).nullable().optional(),
    euBased: z.boolean().optional(),
    certifications: z.array(z.enum(CERTIFICATION_OPTIONS as [string, ...string[]])).max(20).optional(),
    contractStart: z.iso.datetime().nullable().optional(),
    contractEnd: z.iso.datetime().nullable().optional(),
    slaDefined: z.boolean().optional(),
    auditRights: z.boolean().optional(),
    securityClauses: z.boolean().optional(),
    breachNotifiedIn: z.number().int().min(0).max(8760).nullable().optional(),
    lastAuditAt: z.iso.datetime().nullable().optional(),
    acnRelevant: z.boolean().optional(),
    contactEmail: z.email().max(320).nullable().optional(),
    notes: z.string().max(8000).nullable().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const { id } = await params;
        const vendor = await prisma.nis2Vendor.findFirst({
            where: { id, organizationId: authResult.context.organizationId },
            include: {
                processLinks: { include: { process: { select: { id: true, name: true, criticality: true } } } },
            },
        });

        if (!vendor) {
            return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
        }

        return NextResponse.json({ data: { ...vendor, assessment: scoreVendor(vendor) } });
    } catch (error) {
        console.error("Error fetching NIS2 vendor:", error);
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
        const parsed = updateVendorSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid vendor update payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const existing = await prisma.nis2Vendor.findFirst({ where: { id, organizationId } });
        if (!existing) {
            return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
        }

        const { contractStart, contractEnd, lastAuditAt, ...updates } = parsed.data;

        const dates = {
            ...(contractStart !== undefined && { contractStart: contractStart ? new Date(contractStart) : null }),
            ...(contractEnd !== undefined && { contractEnd: contractEnd ? new Date(contractEnd) : null }),
            ...(lastAuditAt !== undefined && { lastAuditAt: lastAuditAt ? new Date(lastAuditAt) : null }),
        };

        // Score the vendor as it will be after the patch, not as it was.
        const merged = { ...existing, ...updates, ...dates };
        if (merged.contractStart && merged.contractEnd && merged.contractStart > merged.contractEnd) {
            return NextResponse.json({ error: "contractStart must precede contractEnd" }, { status: 400 });
        }

        const assessment = scoreVendor(merged);

        const vendor = await prisma.nis2Vendor.update({
            where: { id: existing.id },
            data: {
                ...updates,
                ...dates,
                securityScore: assessment.score,
                scoreBreakdown: assessment as unknown as Prisma.InputJsonObject,
                scoredAt: new Date(),
            },
        });

        await prisma.auditLog.create({
            data: {
                action: "NIS2_VENDOR_UPDATED",
                entityType: "Nis2Vendor",
                entityId: vendor.id,
                oldValue: { criticality: existing.criticality, score: existing.securityScore },
                newValue: { criticality: vendor.criticality, score: assessment.score },
                userId,
                organizationId,
            },
        });

        return NextResponse.json({ data: { ...vendor, assessment } });
    } catch (error) {
        console.error("Error updating NIS2 vendor:", error);
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
        const existing = await prisma.nis2Vendor.findFirst({
            where: { id, organizationId },
            select: { id: true, name: true },
        });

        if (!existing) {
            return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
        }

        await prisma.nis2Vendor.delete({ where: { id: existing.id } });

        await prisma.auditLog.create({
            data: {
                action: "NIS2_VENDOR_DELETED",
                entityType: "Nis2Vendor",
                entityId: existing.id,
                oldValue: { name: existing.name },
                userId,
                organizationId,
            },
        });

        return NextResponse.json({ data: { id: existing.id } });
    } catch (error) {
        console.error("Error deleting NIS2 vendor:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
