import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/api-auth";
import { sendOrganizationActivationEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, context: { params: Promise<{ organizationId: string }> }) {
  const authResult = await requireSuperAdmin(req);
  if (!authResult.ok) return authResult.response;

  try {
    const { organizationId } = await context.params;
    if (!organizationId) {
      return NextResponse.json({ error: "Organization id is required" }, { status: 400 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        productKey: true,
        users: {
          where: { role: "MAIN_OFFICER" },
          select: { email: true },
          take: 1,
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const officerEmail = organization.users[0]?.email;
    if (!officerEmail) {
      return NextResponse.json({ error: "Main officer email not found for this organization" }, { status: 404 });
    }

    const activationToken = randomUUID();
    await prisma.passwordToken.create({
      data: {
        email: officerEmail.toLowerCase(),
        token: activationToken,
        expires: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        type: "ACTIVATION",
      },
    });

    const activationLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/activate?token=${activationToken}`;

    const mailResult = await sendOrganizationActivationEmail({
      to: officerEmail.toLowerCase(),
      organizationName: organization.name,
      productKey: organization.productKey?.key || "N/A",
      activationLink,
    });

    if (!mailResult.sent) {
      return NextResponse.json(
        {
          message: "Activation link refreshed but email was not sent",
          activationLink,
          emailStatus: "not_configured",
          emailError: mailResult.reason || null,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      message: "Activation invite re-sent successfully",
      activationLink,
      emailStatus: "sent",
    });
  } catch (error) {
    console.error("Resend activation error:", error);
    return NextResponse.json({ error: "Failed to resend activation invite" }, { status: 500 });
  }
}
