import { NextRequest, NextResponse } from "next/server";
import { listComplianceTemplates } from "@/lib/compliance-template-library";
import { assertTemplateId, importComplianceTemplate } from "@/lib/compliance-template-importer";
import { requireSessionWithOrg } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  return NextResponse.json({
    data: listComplianceTemplates(),
  });
}

export async function POST(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request, { allowedRoles: ["MAIN_OFFICER"] });
  if (!authResult.ok) return authResult.response;

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
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import template" },
      { status: 400 },
    );
  }
}
