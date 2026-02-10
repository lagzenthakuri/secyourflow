import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listComplianceTemplates } from "@/lib/compliance-template-library";
import { assertTemplateId, importComplianceTemplate } from "@/lib/compliance-template-importer";

export async function GET() {
  return NextResponse.json({
    data: listComplianceTemplates(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      templateId?: string;
      overwriteExisting?: boolean;
      frameworkName?: string;
      frameworkDescription?: string;
    };

    if (!body.templateId) {
      return NextResponse.json({ error: "templateId is required" }, { status: 400 });
    }

    const templateId = assertTemplateId(body.templateId);

    const organization = await prisma.organization.findFirst({
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const result = await importComplianceTemplate({
      templateId,
      organizationId: organization.id,
      overwriteExisting: body.overwriteExisting,
      frameworkName: body.frameworkName,
      frameworkDescription: body.frameworkDescription,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import template" },
      { status: 400 },
    );
  }
}
