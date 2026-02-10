import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSessionWithOrg } from "@/lib/api-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireSessionWithOrg();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const { organizationId } = authResult.context;

  const report = await prisma.report.findFirst({
    where: { id, organizationId },
    include: {
      runs: {
        orderBy: { createdAt: "desc" },
        include: {
          artifacts: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        take: 1,
      },
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const artifact = report.runs[0]?.artifacts[0];
  if (!artifact) {
    return NextResponse.json({ error: "Report artifact not found" }, { status: 404 });
  }

  return new NextResponse(artifact.data, {
    status: 200,
    headers: {
      "Content-Type": artifact.mimeType,
      "Content-Disposition": `attachment; filename=\"${artifact.fileName}\"`,
      "Content-Length": String(artifact.sizeBytes),
    },
  });
}
