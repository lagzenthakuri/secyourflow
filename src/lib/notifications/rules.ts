import { prisma } from "@/lib/prisma";
import type { Severity } from "@prisma/client";

interface VulnerabilityNotificationInput {
  organizationId: string;
  eventType: string;
  vulnerability: {
    id: string;
    title: string;
    severity: Severity;
    isExploited: boolean;
    cisaKev: boolean;
  };
}

const severityWeight: Record<Severity, number> = {
  INFORMATIONAL: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export function isSeverityAllowed(actual: Severity, minimum?: Severity | null) {
  if (!minimum) return true;
  return severityWeight[actual] >= severityWeight[minimum];
}

export async function dispatchVulnerabilityNotifications(input: VulnerabilityNotificationInput) {
  const rules = await prisma.notificationRule.findMany({
    where: {
      organizationId: input.organizationId,
      isActive: true,
      eventType: input.eventType,
      channel: "IN_APP",
    },
  });

  let sent = 0;

  for (const rule of rules) {
    const vuln = input.vulnerability;

    if (!isSeverityAllowed(vuln.severity, rule.minimumSeverity)) continue;
    if (rule.includeExploited && !vuln.isExploited) continue;
    if (rule.includeKev && !vuln.cisaKev) continue;

    const title = `[${vuln.severity}] ${vuln.title}`;
    const message = `Vulnerability ${vuln.id} matched notification rule '${rule.name}'.`;

    try {
      if (rule.channel !== "IN_APP") {
        continue;
      }

      if (rule.channel === "IN_APP") {
        await prisma.notification.create({
          data: {
            userId: rule.userId,
            title,
            message,
            type: "WARNING",
            link: `/vulnerabilities/${vuln.id}`,
          },
        });
      }

      sent += 1;
    } catch (error) {
      // Best effort; continue remaining rules.
      console.error("Notification rule dispatch failed", {
        ruleId: rule.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { matchedRules: rules.length, dispatched: sent };
}
