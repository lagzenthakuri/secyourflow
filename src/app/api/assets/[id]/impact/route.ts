import { NextResponse } from "next/server";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { buildAssetImpactAnalysis } from "@/lib/assets/impact";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  const { id } = await params;

  try {
    const result = await buildAssetImpactAnalysis(authResult.context.organizationId, id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 404 },
    );
  }
}
