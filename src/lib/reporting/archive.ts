import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { ReportOutputFormat, ReportTemplateKey } from "@prisma/client";
import type { RenderedReport } from "@/lib/reporting/types";

interface PersistReportRunParams {
  organizationId: string;
  userId: string;
  name: string;
  templateKey: ReportTemplateKey;
  outputFormat: ReportOutputFormat;
  scheduleId?: string;
  metadata?: Record<string, unknown>;
  artifact: RenderedReport;
}

function toOptionalJson(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined;
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

export async function persistReportRun(params: PersistReportRunParams) {
  return prisma.$transaction(async (tx) => {
    const report = await tx.report.create({
      data: {
        name: params.name,
        type: params.templateKey,
        templateKey: params.templateKey,
        format: params.outputFormat,
        outputFormat: params.outputFormat,
        status: "COMPLETED",
        size: `${Math.max(1, Math.round(params.artifact.bytes.byteLength / 1024))} KB`,
        organizationId: params.organizationId,
        userId: params.userId,
        scheduleId: params.scheduleId,
      },
    });

    const run = await tx.reportRun.create({
      data: {
        organizationId: params.organizationId,
        scheduleId: params.scheduleId,
        reportId: report.id,
        status: "COMPLETED",
        startedAt: new Date(),
        completedAt: new Date(),
        metadata: toOptionalJson(params.metadata),
      },
    });

    const artifact = await tx.reportArtifact.create({
      data: {
        organizationId: params.organizationId,
        reportRunId: run.id,
        format: params.outputFormat,
        fileName: params.artifact.fileName,
        mimeType: params.artifact.mimeType,
        sizeBytes: params.artifact.bytes.byteLength,
        data: Uint8Array.from(params.artifact.bytes),
      },
    });

    await tx.report.update({
      where: { id: report.id },
      data: {
        url: `/api/reports/${report.id}/download`,
      },
    });

    return {
      report,
      run,
      artifact,
    };
  });
}
