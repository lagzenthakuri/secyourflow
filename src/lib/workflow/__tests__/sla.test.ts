import { describe, expect, it } from "vitest";
import {
  calculateSlaDueAt,
  getDefaultSlaDaysForSeverity,
  getSlaRemainingMs,
  isSlaBreached,
} from "@/lib/workflow/sla";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("SLA windows", () => {
  it("shortens the window as severity rises", () => {
    expect(getDefaultSlaDaysForSeverity("CRITICAL")).toBeLessThan(
      getDefaultSlaDaysForSeverity("HIGH"),
    );
    expect(getDefaultSlaDaysForSeverity("HIGH")).toBeLessThan(
      getDefaultSlaDaysForSeverity("MEDIUM"),
    );
    expect(getDefaultSlaDaysForSeverity("MEDIUM")).toBeLessThan(
      getDefaultSlaDaysForSeverity("LOW"),
    );
  });

  it("adds exactly the right number of days in absolute time", () => {
    const base = new Date("2026-06-01T12:00:00.000Z");
    const due = calculateSlaDueAt("CRITICAL", base);
    expect(due.getTime() - base.getTime()).toBe(7 * DAY_MS);
  });

  it("does not drift across a DST boundary", () => {
    // Europe/London springs forward on 2026-03-29. `setDate` arithmetic in a
    // DST-observing local zone lost an hour here while isSlaBreached compares
    // absolute time.
    const base = new Date("2026-03-27T12:00:00.000Z");
    const due = calculateSlaDueAt("MEDIUM", base); // 30 days
    expect(due.getTime() - base.getTime()).toBe(30 * DAY_MS);
  });

  it("treats a missing due date as not breached", () => {
    expect(isSlaBreached(null)).toBe(false);
    expect(getSlaRemainingMs(null)).toBeNull();
  });

  it("detects a breach on absolute time", () => {
    const now = new Date("2026-06-10T00:00:00.000Z");
    expect(isSlaBreached(new Date("2026-06-09T23:59:59.000Z"), now)).toBe(true);
    expect(isSlaBreached(new Date("2026-06-10T00:00:01.000Z"), now)).toBe(false);
  });
});
