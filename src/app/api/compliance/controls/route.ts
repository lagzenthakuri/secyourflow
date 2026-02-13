import { NextRequest, NextResponse } from "next/server";
import { ControlFrequency, ControlType, Role } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/security/api-auth";

const createControlSchema = z.object({
    frameworkId: z.string().trim().min(1),
    controlId: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000).optional(),
    category: z.string().trim().max(120).optional(),
    objective: z.string().trim().max(2000).optional(),
    evidenceRequired: z.array(z.string().trim().max(200)).optional(),
    frequency: z.nativeEnum(ControlFrequency).optional(),
    controlType: z.nativeEnum(ControlType).optional(),
});

export async function POST(request: NextRequest) {
    const authResult = await requireApiAuth({
        allowedRoles: [Role.IT_OFFICER, Role.PENTESTER, Role.MAIN_OFFICER],
        request,
    });
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const body = await request.json();
        const parsed = createControlSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid control payload" }, { status: 400 });
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
                frameworkId: parsed.data.frameworkId,
                controlId: parsed.data.controlId,
                title: parsed.data.title,
                description: parsed.data.description,
                category: parsed.data.category,
                objective: parsed.data.objective,
                evidenceRequired: parsed.data.evidenceRequired ?? [],
                ...(parsed.data.controlType ? { controlType: parsed.data.controlType } : {}),
                ...(parsed.data.frequency ? { frequency: parsed.data.frequency } : {}),
            },
        });

        return NextResponse.json(newControl, { status: 201 });
    } catch {
        console.error("Create Control Error");
        return NextResponse.json({ error: "Failed to create control" }, { status: 400 });
    }
}
