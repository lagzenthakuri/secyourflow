import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const vulnData = await request.json();

        const updatedVuln = await prisma.vulnerability.update({
            where: { id },
            data: {
                ...vulnData,
                lastSeen: new Date(),
            },
        });

        return NextResponse.json(updatedVuln);
    } catch (error) {
        console.error("Update Vulnerability Error:", error);
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
    console.log("DELETE request received for vulnerability");
    try {
        const { id } = await params;
        console.log(`Target ID for deletion: ${id}`);

        if (!id) {
            console.error("No ID provided in DELETE request");
            return NextResponse.json(
                { error: "Vulnerability ID is required" },
                { status: 400 }
            );
        }

        // Verify existence first
        const existing = await prisma.vulnerability.findUnique({
            where: { id }
        });

        if (!existing) {
            console.error(`Vulnerability not found: ${id}`);
            return NextResponse.json(
                { error: "Vulnerability not found" },
                { status: 404 }
            );
        }

        console.log(`Deleting vulnerability record: ${id}`);
        await prisma.vulnerability.delete({
            where: { id },
        });

        console.log(`Successfully deleted vulnerability: ${id}`);
        return NextResponse.json({ message: "Vulnerability deleted successfully" });
    } catch (error) {
        console.error("CRITICAL: Delete Vulnerability Error:", error);
        return NextResponse.json(
            { error: `Server error: ${error instanceof Error ? error.message : "Unknown error"}` },
            { status: 500 }
        );
    }
}
