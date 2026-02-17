import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { generateInvitationToken, getInvitationExpiry } from "@/lib/invitation-utils";
import { logActivity } from "@/lib/logger";

const createInvitationSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["IT_OFFICER", "PENTESTER", "ANALYST", "MAIN_OFFICER"]).default("ANALYST"),
  expiresInHours: z.number().min(1).max(168).optional().default(48), // Max 7 days
});

/**
 * POST /api/invitations
 * Create a new invitation (MAIN_OFFICER only)
 */
export async function POST(req: Request) {
  try {
    const authResult = await requireSessionWithOrg(req, {
      allowedRoles: ["MAIN_OFFICER"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { context } = authResult;
    const body = await req.json();
    const { email: rawEmail, role, expiresInHours } = createInvitationSchema.parse(body);
    const email = rawEmail.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
      select: { id: true, organizationId: true },
    });

    if (existingUser) {
      if (existingUser.organizationId === context.organizationId) {
        return NextResponse.json(
          { error: "User with this email already exists in your organization" },
          { status: 409 }
        );
      } else {
        return NextResponse.json(
          { error: "User with this email already exists in another organization" },
          { status: 409 }
        );
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        organizationId: context.organizationId,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: { id: true },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: "An active invitation for this email already exists" },
        { status: 409 }
      );
    }

    // Generate secure token
    const token = generateInvitationToken();
    const expiresAt = getInvitationExpiry(expiresInHours);

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        email,
        organizationId: context.organizationId,
        role,
        token,
        expiresAt,
        createdById: context.userId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        token: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Log audit entry
    await logActivity(
      "Invitation created",
      "invitation",
      email,
      null,
      { role, expiresAt: expiresAt.toISOString() },
      `Invitation created for ${email} with role ${role}`,
      context.userId,
      undefined,
      context.organizationId
    );

    return NextResponse.json(
      {
        message: "Invitation created successfully",
        invitation: {
          ...invitation,
          inviteUrl: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/accept-invite?token=${invitation.token}`,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Create invitation error:", error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/invitations
 * List all invitations for the organization (MAIN_OFFICER only)
 */
export async function GET(req: Request) {
  try {
    const authResult = await requireSessionWithOrg(req, {
      allowedRoles: ["MAIN_OFFICER"],
    });

    if (!authResult.ok) {
      return authResult.response;
    }

    const { context } = authResult;

    const invitations = await prisma.invitation.findMany({
      where: {
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        usedAt: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error("List invitations error:", error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      { error: "Failed to list invitations" },
      { status: 500 }
    );
  }
}
