import { prisma } from "@/lib/prisma";
import type { JobName } from "@/lib/queue/types";
import { queueForJob } from "@/lib/queue/types";
import type { Prisma } from "@prisma/client";

/**
 * Durable job history.
 *
 * BullMQ keeps the queue; this keeps the record. It is what the UI polls to
 * answer "is my analysis finished?", and what an operator reads to find out
 * why last night's ingestion did not.
 */

export interface CreateJobRunInput {
  name: JobName;
  organizationId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  payload?: unknown;
}

export async function createJobRun(input: CreateJobRunInput) {
  return prisma.jobRun.create({
    data: {
      queue: queueForJob(input.name),
      jobName: input.name,
      organizationId: input.organizationId ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      payload: (input.payload ?? undefined) as Prisma.InputJsonValue | undefined,
    },
    select: { id: true },
  });
}

export async function attachQueueJobId(jobRunId: string, jobId: string) {
  await prisma.jobRun
    .update({ where: { id: jobRunId }, data: { jobId } })
    .catch(() => undefined);
}

export async function markJobRunning(jobRunId: string, attempt: number) {
  await prisma.jobRun
    .update({
      where: { id: jobRunId },
      data: { status: "RUNNING", attempts: attempt, startedAt: new Date() },
    })
    .catch(() => undefined);
}

export async function markJobSucceeded(jobRunId: string, result?: unknown) {
  await prisma.jobRun
    .update({
      where: { id: jobRunId },
      data: {
        status: "SUCCEEDED",
        finishedAt: new Date(),
        result: (result ?? undefined) as Prisma.InputJsonValue | undefined,
        error: null,
      },
    })
    .catch(() => undefined);
}

export async function markJobFailed(jobRunId: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await prisma.jobRun
    .update({
      where: { id: jobRunId },
      data: { status: "FAILED", finishedAt: new Date(), error: message.slice(0, 4000) },
    })
    .catch(() => undefined);
}
