import { NextResponse } from "next/server";
import {
  runContinuousComplianceAudit,
  runContinuousComplianceAuditForAllOrganizations,
} from "@/lib/evidence-engine";
import { requireAutomationContext } from "@/lib/api-auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { organizationId?: string };

  const authResult = await requireAutomationContext(request, body.organizationId);
  if (!authResult.ok) {
    return authResult.response;
  }

  const { organizationId } = authResult.context;

  try {
    // A null organization is only reachable via the admin token and means an
    // explicit every-tenant sweep. The single-tenant entry point now requires
    // an organizationId so it can never fan out across tenants by accident.
    const summary = organizationId
      ? await runContinuousComplianceAudit({ organizationId })
      : await runContinuousComplianceAuditForAllOrganizations();

    return NextResponse.json({ message: "Compliance monitoring completed.", summary });
  } catch (error) {
    console.error("Compliance Monitor Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run monitoring" },
      { status: 500 },
    );
  }
}
