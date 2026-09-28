import "dotenv/config";
import { Worker, Queue, type Job } from "bullmq";
import { createRedisConnection, isRedisConfigured } from "@/lib/queue/connection";
import { loadHandlers } from "@/lib/queue/handlers";
import { markJobFailed, markJobRunning, markJobSucceeded } from "@/lib/queue/job-run";
import { QUEUE_CONCURRENCY, QUEUE_NAMES, type JobName, type QueueName } from "@/lib/queue/types";
import { prisma } from "@/lib/prisma";

/**
 * Background job processor.
 *
 * Runs as its own container (`docker compose up --scale worker=N`) so that
 * long work — AI risk analysis, scans, CVE ingestion, scheduled reports — is
 * never attached to an HTTP request. Previously all of it ran inline, which is
 * why a self-hosted model with a 300s budget could not finish before the
 * client gave up and left rows stranded in PROCESSING.
 */

const SHUTDOWN_TIMEOUT_MS = Number(process.env.WORKER_SHUTDOWN_TIMEOUT_MS ?? 30_000);

/** Repeating housekeeping. Cron in UTC. */
const REPEATABLE_JOBS: Array<{ name: JobName; pattern: string }> = [
  // Un-stick assessments abandoned by a killed worker.
  { name: "maintenance.reap-stale-risk-entries", pattern: "*/5 * * * *" },
  // Fire report schedules whose nextRunAt has passed.
  { name: "maintenance.run-due-report-schedules", pattern: "*/10 * * * *" },
  { name: "maintenance.prune-job-runs", pattern: "30 3 * * *" },
];

async function registerRepeatableJobs(): Promise<Queue> {
  const queue = new Queue("maintenance", { connection: createRedisConnection() });

  for (const job of REPEATABLE_JOBS) {
    // Keyed by job name, so N workers converge on one schedule instead of
    // registering N copies of it.
    await queue.upsertJobScheduler(
      job.name,
      { pattern: job.pattern },
      {
        name: job.name,
        data: {},
        opts: { removeOnComplete: { count: 20 }, removeOnFail: { count: 50 } },
      },
    );
  }

  return queue;
}

async function runJob(job: Job): Promise<unknown> {
  const handlers = await loadHandlers();
  const name = job.name as JobName;
  const handler = handlers[name];

  if (!handler) {
    throw new Error(`No handler registered for job '${job.name}'`);
  }

  const { __jobRunId: jobRunId, ...payload } = job.data as Record<string, unknown> & {
    __jobRunId?: string;
  };

  if (jobRunId) {
    await markJobRunning(jobRunId, job.attemptsMade + 1);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (handler as (p: any) => Promise<unknown>)(payload);
    if (jobRunId) {
      await markJobSucceeded(jobRunId, result);
    }
    return result;
  } catch (error) {
    // Only record terminal failure once BullMQ has exhausted its retries,
    // so a transient blip does not show up as a failed run.
    const attemptsAllowed = job.opts.attempts ?? 1;
    if (jobRunId && job.attemptsMade + 1 >= attemptsAllowed) {
      await markJobFailed(jobRunId, error);
    }
    throw error;
  }
}

async function main() {
  if (!isRedisConfigured()) {
    console.error(
      "[worker] REDIS_URL is not set. In this mode the web process runs jobs " +
        "in-process and a separate worker has nothing to consume — exiting.",
    );
    process.exit(1);
  }

  console.log(`[worker] starting; queues: ${QUEUE_NAMES.join(", ")}`);

  const workers = QUEUE_NAMES.map((queueName: QueueName) => {
    const worker = new Worker(queueName, runJob, {
      connection: createRedisConnection(),
      concurrency: QUEUE_CONCURRENCY[queueName],
    });

    worker.on("failed", (job, error) => {
      console.error(`[worker:${queueName}] job ${job?.name} failed:`, error?.message);
    });
    worker.on("error", (error) => {
      console.error(`[worker:${queueName}] error:`, error.message);
    });

    return worker;
  });

  const maintenanceQueue = await registerRepeatableJobs();
  console.log("[worker] ready");

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[worker] ${signal} received; finishing in-flight jobs`);

    const timer = setTimeout(() => {
      console.error("[worker] shutdown timed out; forcing exit");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    try {
      await Promise.all(workers.map((worker) => worker.close()));
      await maintenanceQueue.close();
      await prisma.$disconnect();
    } catch (error) {
      console.error("[worker] shutdown error:", error);
    } finally {
      clearTimeout(timer);
      process.exit(0);
    }
  };

  // beforeExit never fires for a container stop; these do.
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

void main().catch((error) => {
  console.error("[worker] fatal:", error);
  process.exit(1);
});
