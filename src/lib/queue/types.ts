/**
 * Job catalogue.
 *
 * A job name is `<queue>.<action>`; the prefix selects the BullMQ queue, so
 * related work shares a concurrency budget (all AI analysis competes for the
 * same model, all scans for the same host resources).
 */

export const QUEUE_NAMES = [
  "risk",
  "scan",
  "cve",
  "threat",
  "compliance",
  "report",
  "maintenance",
] as const;

export type QueueName = (typeof QUEUE_NAMES)[number];

export interface JobPayloads {
  /** Score one vulnerability on one asset. */
  "risk.assess": {
    organizationId: string;
    vulnerabilityId: string;
    assetId: string;
    userId?: string;
  };
  /** Propagate a completed assessment into the compliance controls. */
  "risk.propagate-compliance": {
    organizationId: string;
    riskEntryId: string;
  };
  /** Run a configured scanner against a target, then queue triage. */
  "scan.run": {
    organizationId: string;
    scannerId: string;
    target: string;
    assetId?: string;
    userId?: string;
    aiTriage: boolean;
  };
  /** Score every finding a scan produced. */
  "scan.triage": {
    organizationId: string;
    vulnerabilityIds: string[];
    assetId?: string;
    target?: string;
    userId?: string;
    scannerName?: string;
  };
  "cve.ingest": { source?: "nvd" | "kev" | "epss" | "all" };
  "threat.sync": {
    organizationId: string;
    source?: string;
    includeMitre?: boolean;
    includeCorrelation?: boolean;
  };
  "compliance.assess-organization": { organizationId: string };
  "compliance.audit-organization": { organizationId: string };
  /** Renders and archives one report. Used by the scheduler. */
  "report.render": {
    organizationId: string;
    requestedByUserId: string;
    templateKey: string;
    outputFormat: string;
    name?: string;
    filters?: Record<string, unknown>;
    scheduleId?: string;
  };
  /** Periodic housekeeping — see src/worker/index.ts. */
  "maintenance.reap-stale-risk-entries": Record<string, never>;
  "maintenance.run-due-report-schedules": Record<string, never>;
  "maintenance.prune-job-runs": Record<string, never>;
}

export type JobName = keyof JobPayloads;

export function queueForJob(name: JobName): QueueName {
  return name.split(".", 1)[0] as QueueName;
}

/** Per-queue worker concurrency. AI-bound queues stay low on purpose. */
export const QUEUE_CONCURRENCY: Record<QueueName, number> = {
  // A self-hosted model serves every request from one pool of compute, so
  // more parallelism just makes each call slower and risks timeouts.
  risk: Number(process.env.WORKER_CONCURRENCY_RISK ?? 2),
  scan: Number(process.env.WORKER_CONCURRENCY_SCAN ?? 2),
  cve: 1,
  threat: 1,
  compliance: 1,
  report: Number(process.env.WORKER_CONCURRENCY_REPORT ?? 2),
  maintenance: 1,
};
