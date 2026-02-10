import type { Severity } from "@prisma/client";
import { ThreatIntelRepository } from "./persistence/repository";

const severityRank: Record<Exclude<Severity, never>, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  INFORMATIONAL: 1,
};

function pickHigherSeverity(current: Severity | null, incoming: Severity | null): Severity | null {
  if (!incoming) {
    return current;
  }

  if (!current) {
    return incoming;
  }

  return severityRank[incoming] > severityRank[current] ? incoming : current;
}

export class ThreatIntelQueryService {
  constructor(private readonly repository: ThreatIntelRepository = new ThreatIntelRepository()) {}

  async getOverview(organizationId: string) {
    const [feeds, indicators, activeCount, criticalCount, matches, actors, campaigns, runs] = await Promise.all([
      this.repository.listFeeds(organizationId),
      this.repository.listIndicators(organizationId),
      this.repository.countActiveIndicators(organizationId),
      this.repository.countCriticalIndicators(organizationId),
      this.repository.listIndicatorMatches(organizationId),
      this.repository.listActorsWithLinks(),
      this.repository.listCampaigns(),
      this.repository.listRecentFeedRuns(organizationId),
    ]);

    return {
      feeds,
      indicators,
      matches,
      runs,
      stats: {
        activeFeeds: feeds.filter((feed) => feed.isActive).length,
        totalIndicators: indicators.length,
        activeIndicators: activeCount,
        criticalIndicators: criticalCount,
        matchedAssets: new Set(matches.map((match) => match.assetId)).size,
        actorCount: actors.length,
        campaignCount: campaigns.length,
      },
    };
  }

  async getAttackMatrix(organizationId: string) {
    const [base, vulnerabilitySignals, indicatorSignals] = await Promise.all([
      this.repository.getAttackMatrixBase(),
      this.repository.getTechniqueVulnerabilitySignals(organizationId),
      this.repository.getTechniqueIndicatorSignals(organizationId),
    ]);

    const vulnByTechniqueId = new Map<string, { count: number; maxSeverity: Severity | null; lastSeen: Date | null }>();
    for (const signal of vulnerabilitySignals) {
      const existing = vulnByTechniqueId.get(signal.techniqueId) ?? {
        count: 0,
        maxSeverity: null,
        lastSeen: null,
      };

      existing.count += 1;
      existing.maxSeverity = pickHigherSeverity(existing.maxSeverity, signal.vulnerability.severity);
      existing.lastSeen = !existing.lastSeen || signal.vulnerability.updatedAt > existing.lastSeen
        ? signal.vulnerability.updatedAt
        : existing.lastSeen;
      vulnByTechniqueId.set(signal.techniqueId, existing);
    }

    const iocByTechniqueExternalId = new Map<string, { count: number; maxSeverity: Severity | null; lastSeen: Date | null }>();
    for (const signal of indicatorSignals) {
      if (!signal.techniqueId) continue;

      const existing = iocByTechniqueExternalId.get(signal.techniqueId) ?? {
        count: 0,
        maxSeverity: null,
        lastSeen: null,
      };
      existing.count += 1;
      existing.maxSeverity = pickHigherSeverity(existing.maxSeverity, signal.severity);
      existing.lastSeen = !existing.lastSeen || signal.lastSeen > existing.lastSeen
        ? signal.lastSeen
        : existing.lastSeen;
      iocByTechniqueExternalId.set(signal.techniqueId, existing);
    }

    const tactics = new Map<
      string,
      {
        tacticId: string;
        tacticExternalId: string;
        tacticName: string;
        shortName: string | null;
        techniques: Array<{
          techniqueId: string;
          techniqueExternalId: string;
          techniqueName: string;
          vulnerabilityCount: number;
          indicatorCount: number;
          maxSeverity: Severity | null;
          lastSeen: string | null;
        }>;
      }
    >();

    for (const link of base) {
      const vulnerabilityStats = vulnByTechniqueId.get(link.technique.id) ?? {
        count: 0,
        maxSeverity: null,
        lastSeen: null,
      };

      const indicatorStats = iocByTechniqueExternalId.get(link.technique.externalId) ?? {
        count: 0,
        maxSeverity: null,
        lastSeen: null,
      };

      const maxSeverity = pickHigherSeverity(vulnerabilityStats.maxSeverity, indicatorStats.maxSeverity);
      const lastSeenDate = [vulnerabilityStats.lastSeen, indicatorStats.lastSeen]
        .filter((value): value is Date => Boolean(value))
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

      const tacticKey = link.tactic.externalId;
      const existingTactic = tactics.get(tacticKey) ?? {
        tacticId: link.tactic.id,
        tacticExternalId: link.tactic.externalId,
        tacticName: link.tactic.name,
        shortName: link.tactic.shortName,
        techniques: [],
      };

      existingTactic.techniques.push({
        techniqueId: link.technique.id,
        techniqueExternalId: link.technique.externalId,
        techniqueName: link.technique.name,
        vulnerabilityCount: vulnerabilityStats.count,
        indicatorCount: indicatorStats.count,
        maxSeverity,
        lastSeen: lastSeenDate ? lastSeenDate.toISOString() : null,
      });

      tactics.set(tacticKey, existingTactic);
    }

    return {
      tactics: [...tactics.values()].map((tactic) => ({
        ...tactic,
        techniques: tactic.techniques.sort((a, b) => a.techniqueExternalId.localeCompare(b.techniqueExternalId)),
      })),
      summary: {
        tacticCount: tactics.size,
        techniqueCount: base.length,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async getActors(organizationId: string) {
    const actors = await this.repository.listActorsWithLinks();
    return actors.map((actor) => ({
      id: actor.id,
      externalId: actor.externalId,
      name: actor.name,
      description: actor.description,
      aliases: actor.aliases,
      techniques: actor.techniques.map((link) => ({
        externalId: link.technique.externalId,
        name: link.technique.name,
      })),
      campaignCount: actor.campaigns.length,
      linkedVulnerabilities: actor.vulnerabilityLinks
        .filter((link) => link.vulnerability.organizationId === organizationId)
        .map((link) => ({
          id: link.vulnerability.id,
          cveId: link.vulnerability.cveId,
          title: link.vulnerability.title,
          severity: link.vulnerability.severity,
          source: link.source,
        })),
    }));
  }

  async getCampaigns() {
    const campaigns = await this.repository.listCampaigns();
    return campaigns.map((campaign) => ({
      id: campaign.id,
      externalId: campaign.externalId,
      name: campaign.name,
      description: campaign.description,
      actor: campaign.actor
        ? {
            id: campaign.actor.id,
            name: campaign.actor.name,
            externalId: campaign.actor.externalId,
          }
        : null,
      techniques: campaign.techniques.map((link) => ({
        externalId: link.technique.externalId,
        name: link.technique.name,
      })),
      firstSeen: campaign.firstSeen,
      lastSeen: campaign.lastSeen,
    }));
  }
}
