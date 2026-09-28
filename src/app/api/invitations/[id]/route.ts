import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { logActivity } from "@/lib/logger";

/**
 * DELETE /api/invitations/[id]
 * Revoke an invitation (MAIN_OFFICER only)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireSessionWithOrg(req, {
      allowedRoles: ["MAIN_OFFICER"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { context } = authResult;
    const { id } = await params;

    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        organizationId: true,
        usedAt: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Verify invitation belongs to user's organization
    if (invitation.organizationId !== context.organizationId) {
      return NextResponse.json(
        { error: "Forbidden: invitation belongs to another organization" },
        { status: 403 }
      );
    }

    // Check if already used
    if (invitation.usedAt) {
      return NextResponse.json(
        { error: "Cannot revoke an invitation that has already been used" },
        { status: 400 }
      );
    }

    // Delete invitation
    await prisma.invitation.delete({
      where: { id },
    });

    // Log audit entry
    await logActivity(
      "Invitation revoked",
      "invitation",
      invitation.email,
      null,
      null,
      `Invitation revoked for ${invitation.email}`,
      context.userId,
      undefined,
      context.organizationId
    );

    return NextResponse.json({
      message: "Invitation revoked successfully",
    });
  } catch (error) {
    console.error("Revoke invitation error:", error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      { error: "Failed to revoke invitation" },
      { status: 500 }
    );
  }
}
