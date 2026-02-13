import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordComplianceTrendSnapshot } from "@/lib/compliance-engine";
import { requireApiAuth } from "@/lib/security/api-auth";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await requireApiAuth({
        allowedRoles: [Role.IT_OFFICER, Role.PENTESTER, Role.MAIN_OFFICER],
        request,
    });
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const { id } = await params;
        const body = await request.json();
        const orgId = authResult.context.organizationId;

        // Verify control belongs to user's organization
        const existingControl = await prisma.complianceControl.findFirst({
            where: {
                id,
                framework: { organizationId: orgId }
            }
        });

        if (!existingControl) {
            return NextResponse.json({ error: "Control not found" }, { status: 404 });
        }

        // Only allow specific fields to be updated
        const allowedFields = ['status', 'notes', 'implementationStatus', 'ownerRole', 'nextAssessment', 'evidence'];
        const updateData: Record<string, unknown> = {};
        
        for (const field of allowedFields) {
            if (field in body) {
                const value = body[field];
                // Sanitize string inputs
                if (typeof value === 'string') {
                    updateData[field] = value
                        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                        .replace(/<[^>]+>/g, '')
                        .trim();
                } else {
                    updateData[field] = value;
                }
            }
        }

        // If status changed to COMPLIANT, update lastAssessed
        if (body.status && body.status !== "NOT_ASSESSED") {
            updateData.lastAssessed = new Date();
        }

        const updatedControl = await prisma.complianceControl.update({
            where: { id },
            data: updateData,
        });

        await recordComplianceTrendSnapshot(updatedControl.frameworkId);

        return NextResponse.json(updatedControl);
    } catch {
        console.error("Update Control Error");
        return NextResponse.json({ error: 'Failed to update control' }, { status: 400 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await requireApiAuth({
        allowedRoles: [Role.MAIN_OFFICER],
        request,
    });
    if ("response" in authResult) {
        return authResult.response;
    }

    try {
        const { id } = await params;
        const orgId = authResult.context.organizationId;

        // Verify control belongs to user's organization
        const existingControl = await prisma.complianceControl.findFirst({
            where: {
                id,
                framework: { organizationId: orgId }
            }
        });

        if (!existingControl) {
            return NextResponse.json({ error: "Control not found" }, { status: 404 });
        }

        await prisma.complianceControl.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Control deleted successfully" });
    } catch {
        console.error("Delete Control Error");
        return NextResponse.json({ error: 'Failed to delete control' }, { status: 400 });
    }
}
