import { prisma } from "@/lib/prisma";
import { processRiskAssessment } from "@/lib/risk-engine";
import { updateComplianceFromRisk } from "@/lib/compliance-engine";
import {
  runContinuousComplianceAudit,
  runContinuousComplianceAuditForAllOrganizations,
} from "@/lib/evidence-engine";
import { runScheduledComplianceAssessments } from "@/lib/compliance-engine";
import { notifySecurityTeam } from "@/lib/notifications/service";
import type { JobHandlerMap } from "@/lib/queue/handlers";
import type { RiskAnalysis } from "@/lib/risk-engine";

/**
 * Job implementations.
 *
 * Kept behind a lazy import so that API routes which only enqueue work do not
 * pull the scan, ingestion and AI engines into their bundle.
 */
export const jobHandlers: JobHandlerMap = {
  "risk.assess": async ({ organizationId, vulnerabilityId, assetId, userId }) => {
    const outcome = await processRiskAssessment({
      organizationId,
      vulnerabilityId,
      assetId,
      userId,
    });

    if (outcome.status !== "COMPLETED") {
      // Returned rather than thrown: "no asset linked" is an expected state,
      // not a job failure to retry.
      return outcome;
    }

    // Only a model assessment may drive compliance failures. The deterministic
    // path deliberately produces no control mapping.
    if (outcome.analysisSource === "AI") {
      const { enqueue } = await import("@/lib/queue");
      await enqueue(
        "risk.propagate-compliance",
        { organizationId, riskEntryId: outcome.riskEntryId },
        { organizationId, entityType: "RiskRegister", entityId: outcome.riskEntryId },
      );
    }

    const vulnerability = await prisma.vulnerability.findUnique({
      where: { id: vulnerabilityId },
      select: { title: true },
    });

    await notifySecurityTeam(organizationId, {
      title: "Risk assessment complete",
      message:
        `'${vulnerability?.title ?? "Vulnerability"}' scored ${outcome.riskScore.toFixed(1)}/25 ` +
        `(${outcome.analysisSource === "AI" ? "AI assessment" : "deterministic scoring — no AI provider available"}).`,
      type: outcome.analysisSource === "AI" ? "INFO" : "WARNING",
      link: `/vulnerabilities/${vulnerabilityId}`,
    });

    return outcome;
  },

  "risk.propagate-compliance": async ({ organizationId, riskEntryId }) => {
    const entry = await prisma.riskRegister.findFirst({
      where: { id: riskEntryId, organizationId },
      include: {
        vulnerability: { select: { title: true, cveId: true, severity: true } },
        asset: { select: { id: true, name: true } },
      },
    });

    if (!entry) {
      return { skipped: "Risk entry not found" };
    }

    if (entry.analysisSource !== "AI") {
      return { skipped: "Deterministic assessments do not map controls" };
    }

    await updateComplianceFromRisk(
      {
        id: entry.id,
        organizationId,
        riskScore: entry.riskScore,
        aiAnalysis: entry.aiAnalysis as unknown as RiskAnalysis,
      },
      {
        title: entry.vulnerability.title,
        cveId: entry.vulnerability.cveId ?? undefined,
        severity: entry.vulnerability.severity,
      },
      { id: entry.asset.id, name: entry.asset.name },
    );

    return { propagated: true };
  },

  "scan.run": async (payload) => {
    const { runScan } = await import("@/lib/scanners/run");
    const result = await runScan({
      scannerId: payload.scannerId,
      organizationId: payload.organizationId,
      target: payload.target,
      assetId: payload.assetId,
    });

    if (payload.aiTriage && result.vulnerabilityIds.length > 0) {
      const { enqueue } = await import("@/lib/queue");
      await enqueue(
        "scan.triage",
        {
          organizationId: payload.organizationId,
          vulnerabilityIds: result.vulnerabilityIds,
          assetId: payload.assetId,
          target: payload.target,
          userId: payload.userId,
        },
        { organizationId: payload.organizationId, entityType: "ScanResult", entityId: result.scanResultId },
      );
    }

    return result;
  },

  "scan.triage": async (payload) => {
    const { triageScanFindings } = await import("@/lib/scanners/triage");
    return triageScanFindings(payload);
  },

  "cve.ingest": async ({ source }) => {
    const { IngestionOrchestrator } = await import("@/modules/cve-ingestion/orchestrator");
    const orchestrator = new IngestionOrchestrator();

    switch (source) {
      case "nvd":
        return orchestrator.ingestNvd();
      case "kev":
        return orchestrator.enrichWithKev();
      case "epss":
        return orchestrator.enrichWithEpss();
      default:
        return orchestrator.runFullIngestion();
    }
  },

  "threat.sync": async ({ organizationId, source, includeMitre, includeCorrelation }) => {
    const { ThreatIntelOrchestrator } = await import("@/modules/threat-intel/orchestrator");
    const orchestrator = new ThreatIntelOrchestrator();
    return orchestrator.sync(organizationId, { source, includeMitre, includeCorrelation });
  },

  "compliance.assess-organization": async ({ organizationId }) =>
    runScheduledComplianceAssessments({ organizationId }),

  "compliance.audit-organization": async ({ organizationId }) =>
    organizationId
      ? runContinuousComplianceAudit({ organizationId })
      : runContinuousComplianceAuditForAllOrganizations(),

  "report.render": async (payload) => {
    const { renderAndArchiveReport } = await import("@/lib/queue/handlers/reports");
    return renderAndArchiveReport(payload);
  },

  "maintenance.reap-stale-risk-entries": async () => {
    const { reapStaleRiskEntries } = await import("@/lib/queue/handlers/maintenance");
    return reapStaleRiskEntries();
  },

  "maintenance.run-due-report-schedules": async () => {
    const { runDueReportSchedules } = await import("@/lib/queue/handlers/maintenance");
    return runDueReportSchedules();
  },

  "maintenance.prune-job-runs": async () => {
    const { pruneJobRuns } = await import("@/lib/queue/handlers/maintenance");
    return pruneJobRuns();
  },
};
