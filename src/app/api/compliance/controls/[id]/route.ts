import { NextRequest, NextResponse } from "next/server";
import { ControlType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { recordComplianceTrendSnapshot } from "@/lib/compliance-engine";
import { requireSessionWithOrg } from "@/lib/api-auth";

const updateControlSchema = z.object({
    title: z.string().min(2).max(300).optional(),
    description: z.string().optional().nullable(),
    controlType: z.nativeEnum(ControlType).optional(),
    category: z.string().optional().nullable(),
    status: z
        .enum(["COMPLIANT", "NON_COMPLIANT", "PARTIALLY_COMPLIANT", "NOT_ASSESSED", "NOT_APPLICABLE"])
        .optional(),
    maturityLevel: z.number().int().min(0).max(5).optional(),
    nistCsfFunction: z
        .enum(["GOVERN", "IDENTIFY", "PROTECT", "DETECT", "RESPOND", "RECOVER"])
        .optional()
        .nullable(),
    ownerRole: z.string().optional().nullable(),
    riskCategory: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    nextAssessment: z.string().datetime().optional().nullable(),
});

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER"] });
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const { id } = await params;
        const parsed = updateControlSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid control update payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const existing = await prisma.complianceControl.findFirst({
            where: {
                id,
                framework: {
                    organizationId: authResult.context.organizationId,
                },
            },
            select: { id: true, frameworkId: true },
        });

        if (!existing) {
            return NextResponse.json({ error: "Control not found" }, { status: 404 });
        }

        const data: Record<string, unknown> = {
            ...parsed.data,
            description: parsed.data.description === undefined ? undefined : parsed.data.description || null,
            controlType: parsed.data.controlType,
            category: parsed.data.category === undefined ? undefined : parsed.data.category || null,
            nistCsfFunction:
                parsed.data.nistCsfFunction === undefined ? undefined : parsed.data.nistCsfFunction || null,
            ownerRole: parsed.data.ownerRole === undefined ? undefined : parsed.data.ownerRole || null,
            riskCategory: parsed.data.riskCategory === undefined ? undefined : parsed.data.riskCategory || null,
            notes: parsed.data.notes === undefined ? undefined : parsed.data.notes || null,
            nextAssessment:
                parsed.data.nextAssessment === undefined
                    ? undefined
                    : parsed.data.nextAssessment
                      ? new Date(parsed.data.nextAssessment)
                      : null,
        };

        if (parsed.data.status && parsed.data.status !== "NOT_ASSESSED") {
            data.lastAssessed = new Date();
        }

        const updatedControl = await prisma.complianceControl.update({
            where: { id: existing.id },
            data,
        });

        await recordComplianceTrendSnapshot(updatedControl.frameworkId);

        return NextResponse.json(updatedControl);
    } catch (error) {
        console.error("Update Control Error:", error);
        return NextResponse.json({ error: "Failed to update control" }, { status: 400 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER"] });
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const { id } = await params;

        const existing = await prisma.complianceControl.findFirst({
            where: {
                id,
                framework: {
                    organizationId: authResult.context.organizationId,
                },
            },
            select: { id: true },
        });

        if (!existing) {
            return NextResponse.json({ error: "Control not found" }, { status: 404 });
        }

        await prisma.complianceControl.delete({
            where: { id: existing.id },
        });

        return NextResponse.json({ message: "Control deleted successfully" });
    } catch (error) {
        console.error("Delete Control Error:", error);
        return NextResponse.json({ error: "Failed to delete control" }, { status: 400 });
    }
}
