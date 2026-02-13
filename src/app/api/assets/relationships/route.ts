import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionWithOrg } from "@/lib/api-auth";
import {
  createAssetRelationship,
  deleteAssetRelationship,
  listAssetRelationships,
} from "@/lib/assets/relationships";

const createSchema = z.object({
  parentAssetId: z.string().min(1),
  childAssetId: z.string().min(1),
  relationshipType: z.enum(["HOSTS", "RUNS_ON", "DEPENDS_ON", "CONNECTS_TO", "CONTAINS"]),
  notes: z.string().max(1000).optional(),
});

export async function GET(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  const data = await listAssetRelationships(authResult.context.organizationId);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid relationship payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const created = await createAssetRelationship({
      organizationId: authResult.context.organizationId,
      ...parsed.data,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) return authResult.response;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    await deleteAssetRelationship({
      organizationId: authResult.context.organizationId,
      id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 404 },
    );
  }
}
