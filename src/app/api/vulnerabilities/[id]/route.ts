import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
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
        const vulnData = await request.json();
        const orgId = authResult.context.organizationId;

        // Verify vulnerability belongs to user's organization
        const existingVuln = await prisma.vulnerability.findFirst({
            where: { id, organizationId: orgId }
        });

        if (!existingVuln) {
            return NextResponse.json({ error: "Vulnerability not found" }, { status: 404 });
        }

        // Only allow specific fields to be updated (prevent mass assignment)
        const allowedFields = [
            'title', 'description', 'severity', 'status', 'cvssScore',
            'cvssVector', 'cweId', 'cisaKev', 'epssScore', 'isExploited',
            'patchAvailable', 'businessImpact', 'solution', 'dueDate', 'fixedAt', 'exploitMaturity', 'references'
        ];

        const updateData: Record<string, unknown> = { lastSeen: new Date() };
        for (const field of allowedFields) {
            if (field in vulnData) {
                const value = vulnData[field];
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

        const updatedVuln = await prisma.vulnerability.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(updatedVuln);
    } catch {
        console.error("Update Vulnerability Error");
        return NextResponse.json(
            { error: "Failed to update vulnerability" },
            { status: 400 }
        );
    }
}

export async function DELETE(
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

        if (!id) {
            return NextResponse.json(
                { error: "Vulnerability ID is required" },
                { status: 400 }
            );
        }

        const orgId = authResult.context.organizationId;

        // Verify vulnerability belongs to user's organization
        const existing = await prisma.vulnerability.findFirst({
            where: { id, organizationId: orgId }
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Vulnerability not found" },
                { status: 404 }
            );
        }

        await prisma.vulnerability.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Vulnerability deleted successfully" });
    } catch {
        console.error("Delete Vulnerability Error");
        return NextResponse.json(
            { error: "Failed to delete vulnerability" },
            { status: 500 }
        );
    }
}
