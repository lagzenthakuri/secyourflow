import type { ReportFrequency, ReportOutputFormat, ReportTemplateKey } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateRenderedReport } from "@/lib/reporting/engine";
import { persistReportRun } from "@/lib/reporting/archive";

export interface RenderReportJob {
  organizationId: string;
  requestedByUserId: string;
  templateKey: string;
  outputFormat: string;
  name?: string;
  filters?: Record<string, unknown>;
  scheduleId?: string;
}

/**
 * Next fire time for a schedule.
 *
 * Advances from `from` in whole periods until it is in the future, so a worker
 * that was down for three days produces one catch-up run rather than three.
 */
export function nextRunAt(frequency: ReportFrequency, from: Date, now: Date = new Date()): Date {
  const next = new Date(from);

  const advance = () => {
    if (frequency === "DAILY") next.setUTCDate(next.getUTCDate() + 1);
    else if (frequency === "WEEKLY") next.setUTCDate(next.getUTCDate() + 7);
    else next.setUTCMonth(next.getUTCMonth() + 1);
  };

  advance();
  // Bounded so a badly-set past date cannot spin.
  for (let i = 0; i < 1000 && next.getTime() <= now.getTime(); i += 1) {
    advance();
  }

  return next;
}

/** Renders a report, archives the artifact, and advances its schedule. */
export async function renderAndArchiveReport(job: RenderReportJob) {
  const templateKey = job.templateKey as ReportTemplateKey;
  const outputFormat = job.outputFormat as ReportOutputFormat;

  const { data, artifact } = await generateRenderedReport({
    organizationId: job.organizationId,
    requestedByUserId: job.requestedByUserId,
    templateKey,
    outputFormat,
    filters: job.filters,
    name: job.name,
  });

  const persisted = await persistReportRun({
    organizationId: job.organizationId,
    userId: job.requestedByUserId,
    name: job.name || `Scheduled ${templateKey}`,
    templateKey,
    outputFormat,
    metadata: { generatedAt: data.generatedAt, summary: data.summary },
    artifact,
  });

  if (job.scheduleId) {
    const schedule = await prisma.reportSchedule.findUnique({
      where: { id: job.scheduleId },
      select: { frequency: true, nextRunAt: true },
    });

    if (schedule) {
      const now = new Date();
      await prisma.reportSchedule
        .update({
          where: { id: job.scheduleId },
          data: { lastRunAt: now, nextRunAt: nextRunAt(schedule.frequency, schedule.nextRunAt, now) },
        })
        .catch((error) => console.error("[reports] failed to advance schedule:", error));
    }
  }

  return { reportId: persisted.report.id, size: persisted.report.size };
}
