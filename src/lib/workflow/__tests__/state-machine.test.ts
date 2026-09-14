import { describe, expect, it } from "vitest";
import type { WorkflowState } from "@prisma/client";
import {
  applyWorkflowStateTimestamps,
  assertValidWorkflowTransition,
  canTransitionWorkflowState,
} from "@/lib/workflow/state-machine";

const ALL_STATES: WorkflowState[] = ["NEW", "TRIAGED", "IN_PROGRESS", "RESOLVED", "CLOSED"];

describe("workflow state machine", () => {
  it("allows the normal triage path", () => {
    expect(canTransitionWorkflowState("NEW", "TRIAGED")).toBe(true);
    expect(canTransitionWorkflowState("TRIAGED", "IN_PROGRESS")).toBe(true);
    expect(canTransitionWorkflowState("IN_PROGRESS", "RESOLVED")).toBe(true);
    expect(canTransitionWorkflowState("RESOLVED", "CLOSED")).toBe(true);
  });

  it("treats CLOSED as terminal", () => {
    for (const to of ALL_STATES) {
      expect(canTransitionWorkflowState("CLOSED", to)).toBe(false);
    }
  });

  it("rejects skipping straight from NEW to RESOLVED", () => {
    expect(canTransitionWorkflowState("NEW", "RESOLVED")).toBe(false);
    expect(() => assertValidWorkflowTransition("NEW", "RESOLVED")).toThrow(/Invalid workflow transition/);
  });

  it("never throws for any pair of declared states", () => {
    // Guards against an enum value being added to the schema without a row in
    // the transition table, which would be a runtime TypeError.
    for (const from of ALL_STATES) {
      for (const to of ALL_STATES) {
        expect(() => canTransitionWorkflowState(from, to)).not.toThrow();
      }
    }
  });

  it("stamps only the timestamp belonging to the new state", () => {
    const now = new Date("2026-06-01T00:00:00.000Z");
    expect(applyWorkflowStateTimestamps("TRIAGED", now)).toEqual({ triagedAt: now });
    expect(applyWorkflowStateTimestamps("RESOLVED", now)).toEqual({ resolvedAt: now });
    expect(applyWorkflowStateTimestamps("CLOSED", now)).toEqual({ closedAt: now });
    expect(applyWorkflowStateTimestamps("NEW", now)).toEqual({});
  });
});
