import { prisma } from "@/lib/prisma";

/**
 * Periodic housekeeping run by the worker. See src/worker/index.ts for cadence.
 */

/** How long an assessment may sit in PROCESSING before it is declared dead. */
const STALE_RISK_ENTRY_MS = Number(process.env.RISK_ENTRY_STALE_MS ?? 30 * 60 * 1000);

/**
 * Retires assessments abandoned mid-flight.
 *
 * Without this a killed worker leaves the row in PROCESSING forever and the UI
 * shows "AI Risk Assessment in progress..." with no way out. Marking them
 * FAILED makes them visible and retryable.
 */
export async function reapStaleRiskEntries() {
  const cutoff = new Date(Date.now() - STALE_RISK_ENTRY_MS);

  const { count } = await prisma.riskRegister.updateMany({
    where: { status: "PROCESSING", updatedAt: { lt: cutoff } },
    data: {
      status: "FAILED",
      failureReason: "Analysis did not finish within the expected time. Re-run to assess.",
    },
  });

  if (count > 0) {
    console.warn(`[maintenance] reaped ${count} stale risk assessment(s)`);
  }

  return { reaped: count };
}

/**
 * Fires report schedules that are due.
 *
 * `ReportSchedule.nextRunAt` and its index existed in the schema but nothing
 * ever read them — scheduled reports simply never ran.
 */
export async function runDueReportSchedules() {
  const now = new Date();

  const due = await prisma.reportSchedule.findMany({
    where: { isActive: true, nextRunAt: { lte: now } },
    take: 100,
    orderBy: { nextRunAt: "asc" },
    select: {
      id: true,
      organizationId: true,
      userId: true,
      name: true,
      templateKey: true,
      outputFormat: true,
      filters: true,
      nextRunAt: true,
    },
  });

  if (due.length === 0) {
    return { dispatched: 0 };
  }

  const { enqueue } = await import("@/lib/queue");

  for (const schedule of due) {
    await enqueue(
      "report.render",
      {
        organizationId: schedule.organizationId,
        requestedByUserId: schedule.userId,
        templateKey: schedule.templateKey,
        outputFormat: schedule.outputFormat,
        name: schedule.name,
        filters: (schedule.filters as Record<string, unknown> | null) ?? undefined,
        scheduleId: schedule.id,
      },
      {
        organizationId: schedule.organizationId,
        entityType: "ReportSchedule",
        entityId: schedule.id,
        // One run per schedule per due-window, however many workers race here.
        dedupeKey: `report-schedule:${schedule.id}:${schedule.nextRunAt.toISOString()}`,
      },
    );
  }

  return { dispatched: due.length };
}

/** Keeps JobRun bounded; the queue itself is trimmed by BullMQ. */
export async function pruneJobRuns() {
  const cutoff = new Date(Date.now() - Number(process.env.JOB_RUN_RETENTION_MS ?? 30 * 24 * 60 * 60 * 1000));

  const { count } = await prisma.jobRun.deleteMany({
    where: { createdAt: { lt: cutoff }, status: { in: ["SUCCEEDED", "FAILED"] } },
  });

  return { pruned: count };
}
