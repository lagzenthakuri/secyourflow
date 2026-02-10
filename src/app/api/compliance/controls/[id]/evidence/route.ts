import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertEvidenceFileAllowed, writeEvidenceFile } from "@/lib/compliance-evidence-storage";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  void request;
  try {
    const { id } = await params;

    const evidence = await prisma.complianceEvidence.findMany({
      where: {
        controlId: id,
      },
      include: {
        versions: {
          orderBy: {
            version: "desc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({
      data: evidence,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load evidence" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const control = await prisma.complianceControl.findUnique({
      where: {
        id,
      },
      include: {
        framework: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!control) {
      return NextResponse.json({ error: "Control not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const fileValue = formData.get("file");
    const titleValue = formData.get("title");
    const descriptionValue = formData.get("description");
    const notesValue = formData.get("notes");
    const assetIdValue = formData.get("assetId");
    const evidenceIdValue = formData.get("evidenceId");

    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await fileValue.arrayBuffer());
    const mimeType = fileValue.type || "application/octet-stream";
    assertEvidenceFileAllowed(fileValue.name, mimeType, fileBuffer.byteLength);

    const title = typeof titleValue === "string" && titleValue.trim() ? titleValue.trim() : null;
    const description =
      typeof descriptionValue === "string" && descriptionValue.trim() ? descriptionValue.trim() : null;
    const notes = typeof notesValue === "string" && notesValue.trim() ? notesValue.trim() : null;
    const assetId = typeof assetIdValue === "string" && assetIdValue.trim() ? assetIdValue.trim() : null;
    const evidenceId =
      typeof evidenceIdValue === "string" && evidenceIdValue.trim() ? evidenceIdValue.trim() : null;

    if (assetId) {
      const asset = await prisma.asset.findUnique({
        where: {
          id: assetId,
        },
        select: {
          id: true,
          organizationId: true,
        },
      });

      if (!asset || asset.organizationId !== control.framework.organizationId) {
        return NextResponse.json(
          { error: "assetId is invalid for this control organization" },
          { status: 400 },
        );
      }
    }

    let evidenceRecord:
      | {
          id: string;
          currentVersion: number;
          title: string;
          description: string | null;
          assetId: string | null;
        }
      | null = null;

    if (evidenceId) {
      const existing = await prisma.complianceEvidence.findUnique({
        where: {
          id: evidenceId,
        },
        select: {
          id: true,
          controlId: true,
          currentVersion: true,
          organizationId: true,
          title: true,
          description: true,
          assetId: true,
        },
      });

      if (!existing || existing.controlId !== control.id) {
        return NextResponse.json({ error: "evidenceId does not match this control" }, { status: 400 });
      }
      if (existing.organizationId !== control.framework.organizationId) {
        return NextResponse.json({ error: "evidenceId organization mismatch" }, { status: 400 });
      }

      evidenceRecord = {
        id: existing.id,
        currentVersion: existing.currentVersion,
        title: existing.title,
        description: existing.description,
        assetId: existing.assetId,
      };
    }

    if (!evidenceRecord) {
      const created = await prisma.complianceEvidence.create({
        data: {
          title: title || fileValue.name,
          description,
          controlId: control.id,
          assetId,
          organizationId: control.framework.organizationId,
          currentVersion: 0,
        },
        select: {
          id: true,
          currentVersion: true,
          title: true,
          description: true,
          assetId: true,
        },
      });
      evidenceRecord = created;
    }

    const nextVersion = evidenceRecord.currentVersion + 1;
    const linkedAssetId = assetId || evidenceRecord.assetId;
    const filePayload = await writeEvidenceFile({
      controlId: control.id,
      evidenceId: evidenceRecord.id,
      version: nextVersion,
      originalFileName: fileValue.name,
      mimeType,
      data: fileBuffer,
    });

    const latest = await prisma.$transaction(async (tx) => {
      await tx.complianceEvidenceVersion.create({
        data: {
          evidenceId: evidenceRecord.id,
          version: nextVersion,
          fileName: fileValue.name,
          mimeType,
          sizeBytes: filePayload.sizeBytes,
          storagePath: filePayload.storagePath,
          checksum: filePayload.checksum,
          notes,
        },
      });

      const updatedEvidence = await tx.complianceEvidence.update({
        where: {
          id: evidenceRecord.id,
        },
        data: {
          currentVersion: nextVersion,
          ...(title ? { title } : {}),
          ...(description !== null ? { description } : {}),
          ...(assetId ? { assetId } : {}),
        },
      });

      const evidenceSummary =
        `Latest evidence file: ${fileValue.name} (v${nextVersion}) uploaded at ${new Date().toISOString()}. ` +
        `Stored at ${filePayload.storagePath}.`;

      await tx.complianceControl.update({
        where: {
          id: control.id,
        },
        data: {
          evidence: evidenceSummary,
        },
      });

      if (linkedAssetId) {
        await tx.assetComplianceControl.upsert({
          where: {
            assetId_controlId: {
              assetId: linkedAssetId,
              controlId: control.id,
            },
          },
          update: {
            evidence: evidenceSummary,
            assessedAt: new Date(),
          },
          create: {
            assetId: linkedAssetId,
            controlId: control.id,
            evidence: evidenceSummary,
            assessedAt: new Date(),
          },
        });
      }

      return updatedEvidence;
    });

    return NextResponse.json({
      evidenceId: latest.id,
      version: nextVersion,
      fileName: fileValue.name,
      storagePath: filePayload.storagePath,
      sizeBytes: filePayload.sizeBytes,
      checksum: filePayload.checksum,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload evidence" },
      { status: 400 },
    );
  }
}
