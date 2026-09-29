import { NextRequest, NextResponse } from "next/server";
import { ControlType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";

const createControlSchema = z.object({
    frameworkId: z.string().min(1),
    controlId: z.string().min(1).max(80),
    title: z.string().min(2).max(300),
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

export async function POST(request: NextRequest) {
    const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER"] });
    if (!authResult.ok) {
        return authResult.response;
    }

    try {
        const parsed = createControlSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid control payload", details: parsed.error.flatten() },
                { status: 400 },
            );
        }

        const framework = await prisma.complianceFramework.findFirst({
            where: {
                id: parsed.data.frameworkId,
                organizationId: authResult.context.organizationId,
            },
            select: { id: true },
        });

        if (!framework) {
            return NextResponse.json({ error: "Framework not found" }, { status: 404 });
        }

        const newControl = await prisma.complianceControl.create({
            data: {
                frameworkId: framework.id,
                controlId: parsed.data.controlId,
                title: parsed.data.title,
                description: parsed.data.description || null,
                controlType: parsed.data.controlType,
                category: parsed.data.category || null,
                status: parsed.data.status,
                maturityLevel: parsed.data.maturityLevel,
                nistCsfFunction: parsed.data.nistCsfFunction || null,
                ownerRole: parsed.data.ownerRole || null,
                riskCategory: parsed.data.riskCategory || null,
                notes: parsed.data.notes || null,
                nextAssessment: parsed.data.nextAssessment ? new Date(parsed.data.nextAssessment) : null,
            },
        });

        return NextResponse.json(newControl, { status: 201 });
    } catch (error) {
        console.error("Create Control Error:", error);
        return NextResponse.json({ error: "Failed to create control" }, { status: 400 });
    }
}
