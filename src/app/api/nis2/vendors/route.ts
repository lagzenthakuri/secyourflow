import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { CERTIFICATION_OPTIONS, scoreVendor } from "@/lib/nis2/vendors";

const vendorInputSchema = z.object({
    name: z.string().min(2).max(200),
    description: z.string().max(4000).nullable().optional(),
    serviceProvided: z.string().min(2).max(500),
    criticality: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3", "LEVEL_4"]).default("LEVEL_3"),
    dataAccessLevel: z.enum(["NONE", "PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"]).default("NONE"),
    country: z.string().max(100).nullable().optional(),
    euBased: z.boolean().default(false),
    certifications: z.array(z.enum(CERTIFICATION_OPTIONS as [string, ...string[]])).max(20).default([]),
    contractStart: z.iso.datetime().nullable().optional(),
    contractEnd: z.iso.datetime().nullable().optional(),
    slaDefined: z.boolean().default(false),
    auditRights: z.boolean().default(false),
    securityClauses: z.boolean().default(false),
    breachNotifiedIn: z.number().int().min(0).max(8760).nullable().optional(),
    lastAuditAt: z.iso.datetime().nullable().optional(),
    acnRelevant: z.boolean().default(false),
    contactEmail: z.email().max(320).nullable().optional(),
    notes: z.string().max(8000).nullable().optional(),
});

export async function GET(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request);
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const vendors = await prisma.nis2Vendor.findMany({
            where: { organizationId: authResult.context.organizationId },
            include: {
                processLinks: { include: { process: { select: { id: true, name: true, criticality: true } } } },
            },
            orderBy: [{ criticality: "asc" }, { name: "asc" }],
        });

        const now = new Date();

        return NextResponse.json({
            data: vendors.map((vendor) => ({ ...vendor, assessment: scoreVendor(vendor, now) })),
        });
    } catch (error) {
        console.error("Error fetching NIS2 vendors:", error);
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
        const parsed = vendorInputSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid vendor payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const { contractStart, contractEnd, lastAuditAt, ...input } = parsed.data;

        const dates = {
            contractStart: contractStart ? new Date(contractStart) : null,
            contractEnd: contractEnd ? new Date(contractEnd) : null,
            lastAuditAt: lastAuditAt ? new Date(lastAuditAt) : null,
        };

        if (dates.contractStart && dates.contractEnd && dates.contractStart > dates.contractEnd) {
            return NextResponse.json({ error: "contractStart must precede contractEnd" }, { status: 400 });
        }

        const assessment = scoreVendor({ ...input, ...dates });

        const vendor = await prisma.nis2Vendor.create({
            data: {
                ...input,
                ...dates,
                organizationId,
                securityScore: assessment.score,
                scoreBreakdown: assessment as unknown as Prisma.InputJsonObject,
                scoredAt: new Date(),
            },
        });

        await prisma.auditLog.create({
            data: {
                action: "NIS2_VENDOR_CREATED",
                entityType: "Nis2Vendor",
                entityId: vendor.id,
                newValue: { name: vendor.name, criticality: vendor.criticality, score: assessment.score },
                userId,
                organizationId,
            },
        });

        return NextResponse.json({ data: { ...vendor, assessment } }, { status: 201 });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return NextResponse.json({ error: "A vendor with that name already exists" }, { status: 409 });
        }
        console.error("Error creating NIS2 vendor:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
