import type { WorkflowState } from "@prisma/client";

const transitionMap: Record<WorkflowState, WorkflowState[]> = {
  NEW: ["TRIAGED", "IN_PROGRESS", "CLOSED"],
  TRIAGED: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  IN_PROGRESS: ["RESOLVED", "TRIAGED", "CLOSED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
};

/**
 * States reachable from `from`. Exported so the UI renders exactly the
 * transitions the API will accept, rather than keeping its own copy of the
 * table that can silently drift out of step.
 */
export function allowedWorkflowTransitions(from: WorkflowState): WorkflowState[] {
  return transitionMap[from] ?? [];
}

export function canTransitionWorkflowState(from: WorkflowState, to: WorkflowState) {
  return allowedWorkflowTransitions(from).includes(to);
}

export function assertValidWorkflowTransition(from: WorkflowState, to: WorkflowState) {
  if (!canTransitionWorkflowState(from, to)) {
    throw new Error(`Invalid workflow transition from ${from} to ${to}`);
  }
}

export function applyWorkflowStateTimestamps(
  nextState: WorkflowState,
  now: Date,
): {
  triagedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
} {
  const out: {
    triagedAt?: Date;
    resolvedAt?: Date;
    closedAt?: Date;
  } = {};

  if (nextState === "TRIAGED") {
    out.triagedAt = now;
  }

  if (nextState === "RESOLVED") {
    out.resolvedAt = now;
  }

  if (nextState === "CLOSED") {
    out.closedAt = now;
  }

  return out;
}
