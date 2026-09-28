import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { isInvitationExpired, isInvitationUsed, isValidInvitationTokenFormat } from "@/lib/invitation-utils";
import { logActivity } from "@/lib/logger";

const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Token is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * POST /api/invitations/accept
 * Accept an invitation and create user account
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, name: rawName, password } = acceptInvitationSchema.parse(body);
    const name = rawName.trim();

    // Validate token format
    if (!isValidInvitationTokenFormat(token)) {
      return NextResponse.json(
        { error: "Invalid invitation token format" },
        { status: 400 }
      );
    }

    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      select: {
        id: true,
        email: true,
        organizationId: true,
        role: true,
        expiresAt: true,
        usedAt: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation token" },
        { status: 404 }
      );
    }

    // Check if invitation is expired
    if (isInvitationExpired(invitation.expiresAt)) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 410 }
      );
    }

    // Check if invitation has been used
    if (isInvitationUsed(invitation.usedAt)) {
      return NextResponse.json(
        { error: "Invitation has already been used" },
        { status: 410 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: invitation.email,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Create user and mark invitation as used in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name,
          email: invitation.email,
          password: hashedPassword,
          role: invitation.role,
          organizationId: invitation.organizationId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          organizationId: true,
        },
      });

      // Mark invitation as used
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date() },
      });

      return user;
    });

    // Log audit entry
    await logActivity(
      "User created via invitation",
      "user",
      result.email,
      null,
      { role: result.role },
      `User ${result.email} created via invitation with role ${result.role}`,
      result.id,
      undefined,
      result.organizationId ?? undefined
    );

    return NextResponse.json(
      {
        message: "Account created successfully",
        user: result,
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

    console.error("Accept invitation error:", error instanceof Error ? error.message : String(error));

    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
