import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readEvidenceFile } from "@/lib/compliance-evidence-storage";
import { requireSessionWithOrg } from "@/lib/api-auth";
import { logActivity } from "@/lib/logger";
import { extractRequestContext } from "@/lib/request-utils";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> },
) {
  const authResult = await requireSessionWithOrg(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const { versionId } = await params;

    const version = await prisma.complianceEvidenceVersion.findFirst({
      where: {
        id: versionId,
        evidence: {
          organizationId: authResult.context.organizationId,
        },
      },
      include: {
        evidence: {
          select: { id: true },
        },
      },
    });

    if (!version) {
      return NextResponse.json({ error: "Evidence version not found" }, { status: 404 });
    }

    const fileBuffer = await readEvidenceFile(version.storagePath);
    const requestContext = extractRequestContext(request);

    await logActivity(
      "Compliance evidence downloaded",
      "complianceEvidenceVersion",
      version.id,
      null,
      {
        evidenceId: version.evidence.id,
        fileName: version.fileName,
      },
      `Downloaded compliance evidence file ${version.fileName}`,
      authResult.context.userId,
      requestContext,
      authResult.context.organizationId,
    );

    return new NextResponse(Uint8Array.from(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": version.mimeType,
        "Content-Disposition": `attachment; filename="${version.fileName}"`,
        "Content-Length": String(fileBuffer.byteLength),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Evidence download failed:", error);
    return NextResponse.json({ error: "Failed to download evidence" }, { status: 500 });
  }
}
