import type { Severity } from "@prisma/client";

const DEFAULT_SLA_DAYS: Record<Severity, number> = {
  CRITICAL: 7,
  HIGH: 14,
  MEDIUM: 30,
  LOW: 60,
  INFORMATIONAL: 90,
};

export function getDefaultSlaDaysForSeverity(severity: Severity): number {
  return DEFAULT_SLA_DAYS[severity] ?? 30;
}

export function calculateSlaDueAt(severity: Severity, baseDate: Date = new Date()): Date {
  const days = getDefaultSlaDaysForSeverity(severity);
  // Millisecond arithmetic, not `setDate`. The local-time version shifted the
  // due instant by an hour across a DST boundary while `isSlaBreached` compares
  // absolute times, so SLAs silently moved twice a year.
  return new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isSlaBreached(slaDueAt: Date | null, now: Date = new Date()): boolean {
  if (!slaDueAt) return false;
  return slaDueAt.getTime() < now.getTime();
}

export function getSlaRemainingMs(slaDueAt: Date | null, now: Date = new Date()): number | null {
  if (!slaDueAt) return null;
  return slaDueAt.getTime() - now.getTime();
}
