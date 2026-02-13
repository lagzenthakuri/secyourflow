import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { assertTemplateId, importComplianceTemplate } from "@/lib/compliance-template-importer";
import { requireApiAuth } from "@/lib/security/api-auth";

export async function POST(request: NextRequest) {
  const authResult = await requireApiAuth({
    allowedRoles: [Role.IT_OFFICER, Role.MAIN_OFFICER],
    request,
  });
  if ("response" in authResult) {
    return authResult.response;
  }

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

    const result = await importComplianceTemplate({
      templateId,
      organizationId: authResult.context.organizationId,
      overwriteExisting: body.overwriteExisting,
      frameworkName: body.frameworkName,
      frameworkDescription: body.frameworkDescription,
    });

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to import template" }, { status: 400 });
  }
}
