import type { JobName, JobPayloads } from "@/lib/queue/types";

/**
 * A job handler. Handlers are plain async functions so they can be called
 * directly by a test, by the worker, or by the inline fallback.
 */
export type JobHandler<N extends JobName> = (payload: JobPayloads[N]) => Promise<unknown>;

export type JobHandlerMap = { [N in JobName]: JobHandler<N> };

/**
 * Loaded lazily and only on the server that actually runs a job. Handlers pull
 * in the scan, ingestion and AI engines, and API routes that merely *enqueue*
 * work should not drag all of that into their bundle.
 */
export async function loadHandlers(): Promise<JobHandlerMap> {
  const { jobHandlers } = await import("@/lib/queue/handlers/index");
  return jobHandlers;
}
