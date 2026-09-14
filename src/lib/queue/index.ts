import type { Queue } from "bullmq";
import { isRedisConfigured } from "@/lib/queue/connection";
import {
  attachQueueJobId,
  createJobRun,
  markJobFailed,
  markJobRunning,
  markJobSucceeded,
} from "@/lib/queue/job-run";
import { loadHandlers } from "@/lib/queue/handlers";
import type { JobName, JobPayloads, QueueName } from "@/lib/queue/types";
import { queueForJob } from "@/lib/queue/types";

export { isRedisConfigured } from "@/lib/queue/connection";
export * from "@/lib/queue/types";

const queues = new Map<QueueName, Queue>();

async function getQueue(name: QueueName): Promise<Queue> {
  const existing = queues.get(name);
  if (existing) {
    return existing;
  }

  const { Queue: BullQueue } = await import("bullmq");
  const { getRedisConnection } = await import("@/lib/queue/connection");

  const queue = new BullQueue(name, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 10_000 },
      // Keep a short tail in Redis; JobRun is the durable history.
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  });

  queues.set(name, queue);
  return queue;
}

export interface EnqueueOptions {
  organizationId?: string | null;
  /** Domain object the job acts on, so the UI can poll by entity. */
  entityType?: string | null;
  entityId?: string | null;
  /**
   * Stable id for work that must not be queued twice (a nightly ingestion, a
   * re-analysis of the same finding). BullMQ drops a duplicate id.
   */
  dedupeKey?: string;
  delayMs?: number;
}

export interface EnqueueResult {
  jobRunId: string;
  /** False when the job ran in-process because Redis is not configured. */
  queued: boolean;
}

/**
 * Hands work to the worker fleet, or runs it in-process when Redis is absent.
 *
 * Callers get a `jobRunId` immediately and never wait for the work itself —
 * that is the whole point. Long operations used to run inside the HTTP
 * request, which is why AI risk analysis timed out and left rows stranded.
 */
export async function enqueue<N extends JobName>(
  name: N,
  payload: JobPayloads[N],
  options: EnqueueOptions = {},
): Promise<EnqueueResult> {
  const jobRun = await createJobRun({
    name,
    organizationId: options.organizationId,
    entityType: options.entityType,
    entityId: options.entityId,
    payload,
  });

  if (!isRedisConfigured()) {
    runInline(name, payload, jobRun.id);
    return { jobRunId: jobRun.id, queued: false };
  }

  try {
    const queue = await getQueue(queueForJob(name));
    const job = await queue.add(
      name,
      { ...payload, __jobRunId: jobRun.id },
      { jobId: options.dedupeKey, delay: options.delayMs },
    );

    if (job.id) {
      await attachQueueJobId(jobRun.id, job.id);
    }

    return { jobRunId: jobRun.id, queued: true };
  } catch (error) {
    // Redis being unreachable must not silently drop the work.
    console.error(`[queue] enqueue failed for ${name}, running inline:`, error);
    runInline(name, payload, jobRun.id);
    return { jobRunId: jobRun.id, queued: false };
  }
}

/**
 * In-process execution for single-container deployments.
 *
 * Deliberately not awaited: the caller is an HTTP request and must return
 * immediately. This is safe only because that mode runs under a long-lived
 * Node server — the JobRun row still records the outcome either way.
 */
function runInline<N extends JobName>(name: N, payload: JobPayloads[N], jobRunId: string): void {
  void (async () => {
    await markJobRunning(jobRunId, 1);
    try {
      const handlers = await loadHandlers();
      const result = await handlers[name](payload);
      await markJobSucceeded(jobRunId, result);
    } catch (error) {
      console.error(`[queue] inline job ${name} failed:`, error);
      await markJobFailed(jobRunId, error);
    }
  })();
}

export async function closeQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((queue) => queue.close().catch(() => undefined)));
  queues.clear();
}
