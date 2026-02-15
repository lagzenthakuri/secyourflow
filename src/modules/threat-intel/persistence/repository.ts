import { prisma } from "../../../lib/prisma";
import type {
  AttackMappingSource,
  IndicatorType,
  Prisma,
  Severity,
  ThreatFeedFormat,
  ThreatFeedType,
  ThreatMatchStatus,
} from "@prisma/client";
import type {
  AttackTechniqueMappingInput,
  NormalizedIndicatorInput,
  ThreatFeedRunSummary,
  ThreatFeedUpsertInput,
  ThreatIndicatorMatchInput,
} from "../types";

type PrismaClientLike = typeof prisma;

export interface IndicatorListFilters {
  type?: IndicatorType;
  severity?: Severity;
  search?: string;
  includeExpired?: boolean;
}

export class ThreatIntelRepository {
  constructor(private readonly db: PrismaClientLike = prisma) {}

  async getUserOrganizationId(userId: string): Promise<string | null> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user) {
      return null;
    }

    return user.organizationId ?? null;
  }

  async upsertFeed(organizationId: string, input: ThreatFeedUpsertInput) {
    return this.db.threatFeed.upsert({
      where: {
        organizationId_name: {
          organizationId,
          name: input.name,
        },
      },
      create: {
        organizationId,
        name: input.name,
        source: input.source,
        type: input.type,
        format: input.format,
        url: input.url,
        apiKey: input.apiKey,
        syncInterval: input.syncInterval,
        isActive: input.isActive ?? true,
        metadata: (input.metadata ?? null) as Prisma.InputJsonValue,
      },
      update: {
        source: input.source,
        type: input.type,
        format: input.format,
        url: input.url,
        apiKey: input.apiKey,
        syncInterval: input.syncInterval,
        isActive: input.isActive,
        metadata: (input.metadata ?? null) as Prisma.InputJsonValue,
      },
    });
  }

  async listFeeds(organizationId: string) {
    return this.db.threatFeed.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      include: {
        runs: {
          take: 1,
          orderBy: { startedAt: "desc" },
        },
      },
    });
  }

  async updateFeed(organizationId: string, feedId: string, data: {
    isActive?: boolean;
    syncInterval?: number;
    checkpoint?: string | null;
    apiKey?: string | null;
    url?: string | null;
    format?: ThreatFeedFormat;
    lastSync?: Date;
  }) {
    const existing = await this.db.threatFeed.findFirst({
      where: {
        id: feedId,
        organizationId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new Error("Threat feed not found");
    }

    return this.db.threatFeed.update({ where: { id: existing.id }, data });
  }

  async createFeedRun(organizationId: string, feedId: string) {
    return this.db.threatFeedRun.create({
      data: {
        organizationId,
        feedId,
        status: "RUNNING",
      },
    });
  }

  async finishFeedRun(runId: string, summary: ThreatFeedRunSummary) {
    return this.db.threatFeedRun.update({
      where: { id: runId },
      data: {
        finishedAt: new Date(),
        status: summary.errors.length > 0 ? "PARTIAL" : "SUCCESS",
        recordsFetched: summary.fetched,
        recordsCreated: summary.created,
        recordsUpdated: summary.updated,
        recordsSkipped: summary.skipped,
        checkpoint: summary.checkpoint,
        errors: summary.errors as Prisma.InputJsonValue,
      },
    });
  }

  async upsertIndicator(organizationId: string, feedId: string, indicator: NormalizedIndicatorInput) {
    const whereKey = {
      organizationId_type_normalizedValue_feedId: {
        organizationId,
        type: indicator.type,
        normalizedValue: indicator.normalizedValue,
        feedId,
      },
    };

    const existing = await this.db.threatIndicator.findUnique({
      where: whereKey,
      select: { id: true },
    });

    const result = await this.db.threatIndicator.upsert({
      where: whereKey,
      create: {
        organizationId,
        feedId,
        type: indicator.type,
        value: indicator.value,
        normalizedValue: indicator.normalizedValue,
        confidence: indicator.confidence,
        severity: indicator.severity,
        firstSeen: indicator.firstSeen,
        lastSeen: indicator.lastSeen,
        expiresAt: indicator.expiresAt,
        source: indicator.source,
        description: indicator.description,
        tags: indicator.tags,
        tacticId: indicator.tacticId,
        techniqueId: indicator.techniqueId,
        metadata: (indicator.metadata ?? null) as Prisma.InputJsonValue,
      },
      update: {
        value: indicator.value,
        confidence: indicator.confidence,
        severity: indicator.severity,
        lastSeen: indicator.lastSeen,
        expiresAt: indicator.expiresAt,
        description: indicator.description,
        tags: indicator.tags,
        tacticId: indicator.tacticId,
        techniqueId: indicator.techniqueId,
        metadata: (indicator.metadata ?? null) as Prisma.InputJsonValue,
      },
    });

    return {
      indicator: result,
      created: !existing,
    };
  }

  async listIndicators(organizationId: string, filters: IndicatorListFilters = {}) {
    const where: Prisma.ThreatIndicatorWhereInput = {
      organizationId,
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.severity ? { severity: filters.severity } : {}),
    };

    const andConditions: Prisma.ThreatIndicatorWhereInput[] = [];
    if (filters.search) {
      andConditions.push({
        OR: [
          { value: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
          { source: { contains: filters.search, mode: "insensitive" } },
        ],
      });
    }

    if (!filters.includeExpired) {
      andConditions.push({
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    return this.db.threatIndicator.findMany({
      where,
      orderBy: { lastSeen: "desc" },
      include: {
        feed: {
          select: {
            id: true,
            name: true,
            source: true,
          },
        },
      },
    });
  }

  async getIndicatorById(organizationId: string, indicatorId: string) {
    return this.db.threatIndicator.findFirst({
      where: { id: indicatorId, organizationId },
    });
  }

  async upsertIndicatorMatch(input: ThreatIndicatorMatchInput) {
    const where = {
      indicatorId_assetId_matchField: {
        indicatorId: input.indicatorId,
        assetId: input.assetId,
        matchField: input.matchField,
      },
    };

    return this.db.threatIndicatorMatch.upsert({
      where,
      create: {
        indicatorId: input.indicatorId,
        assetId: input.assetId,
        organizationId: input.organizationId,
        matchField: input.matchField,
        matchValue: input.matchValue,
        confidence: input.confidence,
        status: input.status ?? "ACTIVE",
        notes: input.notes,
      },
      update: {
        matchValue: input.matchValue,
        confidence: input.confidence,
        status: input.status ?? "ACTIVE",
        notes: input.notes,
        lastMatchedAt: new Date(),
      },
    });
  }

  async listIndicatorMatches(organizationId: string) {
    return this.db.threatIndicatorMatch.findMany({
      where: { organizationId },
      orderBy: { lastMatchedAt: "desc" },
      include: {
        indicator: true,
        asset: {
          select: {
            id: true,
            name: true,
            ipAddress: true,
            hostname: true,
          },
        },
      },
    });
  }

  async setMatchStatus(organizationId: string, matchId: string, status: ThreatMatchStatus) {
    const existing = await this.db.threatIndicatorMatch.findFirst({
      where: {
        id: matchId,
        organizationId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new Error("Match not found");
    }

    return this.db.threatIndicatorMatch.update({
      where: { id: existing.id },
      data: {
        status,
        resolvedAt: status === "RESOLVED" ? new Date() : null,
      },
    });
  }

  async upsertAttackTactic(data: {
    externalId: string;
    name: string;
    shortName: string | null;
    description: string | null;
    platforms: string[];
  }) {
    return this.db.attackTactic.upsert({
      where: { externalId: data.externalId },
      create: {
        externalId: data.externalId,
        name: data.name,
        shortName: data.shortName,
        description: data.description,
        platforms: data.platforms,
      },
      update: {
        name: data.name,
        shortName: data.shortName,
        description: data.description,
        platforms: data.platforms,
      },
    });
  }

  async upsertAttackTechnique(data: {
    externalId: string;
    name: string;
    description: string | null;
    isSubTechnique: boolean;
    revoked: boolean;
    platforms: string[];
  }) {
    return this.db.attackTechnique.upsert({
      where: { externalId: data.externalId },
      create: data,
      update: data,
    });
  }

  async linkTechniqueToTactic(techniqueId: string, tacticId: string) {
    return this.db.attackTechniqueTactic.upsert({
      where: {
        techniqueId_tacticId: {
          techniqueId,
          tacticId,
        },
      },
      create: {
        techniqueId,
        tacticId,
      },
      update: {},
    });
  }

  async upsertThreatActor(data: {
    externalId: string | null;
    name: string;
    description: string | null;
    aliases: string[];
  }) {
    if (data.externalId) {
      return this.db.threatActor.upsert({
        where: { externalId: data.externalId },
        create: data,
        update: data,
      });
    }

    const existing = await this.db.threatActor.findFirst({
      where: { name: data.name },
    });

    if (existing) {
      return this.db.threatActor.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.db.threatActor.create({
      data,
    });
  }

  async upsertThreatCampaign(data: {
    externalId: string | null;
    name: string;
    description: string | null;
    firstSeen: Date | null;
    lastSeen: Date | null;
    actorId: string | null;
  }) {
    if (data.externalId) {
      return this.db.threatCampaign.upsert({
        where: { externalId: data.externalId },
        create: data,
        update: data,
      });
    }

    const existing = await this.db.threatCampaign.findFirst({
      where: { name: data.name },
    });

    if (existing) {
      return this.db.threatCampaign.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.db.threatCampaign.create({
      data,
    });
  }

  async linkActorTechnique(actorId: string, techniqueId: string) {
    return this.db.threatActorTechnique.upsert({
      where: {
        actorId_techniqueId: {
          actorId,
          techniqueId,
        },
      },
      create: {
        actorId,
        techniqueId,
      },
      update: {},
    });
  }

  async linkCampaignTechnique(campaignId: string, techniqueId: string) {
    return this.db.threatCampaignTechnique.upsert({
      where: {
        campaignId_techniqueId: {
          campaignId,
          techniqueId,
        },
      },
      create: {
        campaignId,
        techniqueId,
      },
      update: {},
    });
  }

  async linkCampaignActor(campaignId: string, actorId: string) {
    return this.db.threatCampaign.update({
      where: { id: campaignId },
      data: { actorId },
    });
  }

  async findTechniqueByExternalId(externalId: string) {
    return this.db.attackTechnique.findUnique({
      where: { externalId },
    });
  }

  async findTacticByExternalId(externalId: string) {
    return this.db.attackTactic.findUnique({
      where: { externalId },
    });
  }

  async upsertVulnerabilityTechniqueMapping(input: AttackTechniqueMappingInput) {
    const technique = await this.findTechniqueByExternalId(input.techniqueExternalId);
    if (!technique) {
      return null;
    }

    return this.db.vulnerabilityAttackTechnique.upsert({
      where: {
        vulnerabilityId_techniqueId_mappingSource: {
          vulnerabilityId: input.vulnerabilityId,
          techniqueId: technique.id,
          mappingSource: input.mappingSource,
        },
      },
      create: {
        vulnerabilityId: input.vulnerabilityId,
        techniqueId: technique.id,
        mappingSource: input.mappingSource,
        confidence: input.confidence,
        notes: input.notes,
      },
      update: {
        confidence: input.confidence,
        notes: input.notes,
      },
    });
  }

  async upsertVulnerabilityActorLink(input: {
    vulnerabilityId: string;
    actorId: string;
    source: AttackMappingSource;
    notes?: string;
  }) {
    return this.db.vulnerabilityThreatActor.upsert({
      where: {
        vulnerabilityId_actorId_source: {
          vulnerabilityId: input.vulnerabilityId,
          actorId: input.actorId,
          source: input.source,
        },
      },
      create: {
        vulnerabilityId: input.vulnerabilityId,
        actorId: input.actorId,
        source: input.source,
        notes: input.notes,
      },
      update: {
        notes: input.notes,
      },
    });
  }

  async listOrgVulnerabilities(organizationId: string) {
    return this.db.vulnerability.findMany({
      where: { organizationId },
      select: {
        id: true,
        cveId: true,
        title: true,
        description: true,
        cweId: true,
        severity: true,
        references: true,
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async listOrgAssets(organizationId: string) {
    return this.db.asset.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        ipAddress: true,
        hostname: true,
        metadata: true,
      },
    });
  }

  async getAttackMatrixBase() {
    return this.db.attackTechniqueTactic.findMany({
      include: {
        tactic: true,
        technique: true,
      },
      orderBy: [{ tactic: { externalId: "asc" } }, { technique: { externalId: "asc" } }],
    });
  }

  async getTechniqueVulnerabilitySignals(organizationId: string) {
    return this.db.vulnerabilityAttackTechnique.findMany({
      where: {
        vulnerability: {
          organizationId,
        },
      },
      select: {
        techniqueId: true,
        vulnerability: {
          select: {
            id: true,
            severity: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async getTechniqueIndicatorSignals(organizationId: string) {
    return this.db.threatIndicator.findMany({
      where: {
        organizationId,
        techniqueId: {
          not: null,
        },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      select: {
        techniqueId: true,
        severity: true,
        lastSeen: true,
      },
    });
  }

  async listActorsWithLinks() {
    return this.db.threatActor.findMany({
      include: {
        techniques: {
          include: {
            technique: true,
          },
        },
        campaigns: {
          include: {
            techniques: {
              include: {
                technique: true,
              },
            },
          },
        },
        vulnerabilityLinks: {
          include: {
            vulnerability: {
              select: {
                id: true,
                cveId: true,
                title: true,
                severity: true,
                organizationId: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async listCampaigns() {
    return this.db.threatCampaign.findMany({
      include: {
        actor: true,
        techniques: {
          include: {
            technique: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async countActiveIndicators(organizationId: string) {
    return this.db.threatIndicator.count({
      where: {
        organizationId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
  }

  async countCriticalIndicators(organizationId: string) {
    return this.db.threatIndicator.count({
      where: {
        organizationId,
        severity: "CRITICAL",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
  }

  async listRecentFeedRuns(organizationId: string) {
    return this.db.threatFeedRun.findMany({
      where: { organizationId },
      include: {
        feed: {
          select: {
            id: true,
            name: true,
            source: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
      take: 20,
    });
  }

  async markStaleFeedRuns(organizationId: string, feedId: string, staleBefore: Date) {
    return this.db.threatFeedRun.updateMany({
      where: {
        organizationId,
        feedId,
        status: "RUNNING",
        startedAt: {
          lt: staleBefore,
        },
      },
      data: {
        status: "PARTIAL",
        finishedAt: new Date(),
        errors: ["Run marked stale after exceeding execution window"] as Prisma.InputJsonValue,
      },
    });
  }

  async seedDefaultFeeds(organizationId: string) {
    const defaults: Array<ThreatFeedUpsertInput> = [
      {
        name: "AlienVault OTX",
        source: "ALIENVAULT_OTX",
        type: "IOC",
        format: "JSON",
        url: "https://otx.alienvault.com/api/v1/pulses/subscribed",
      },
      {
        name: "CIRCL Vulnerability Feed",
        source: "CIRCL",
        type: "CVE",
        format: "JSON",
        url: "https://vulnerability.circl.lu/api/last",
      },
      {
        name: "URLhaus Recent URLs",
        source: "URLHAUS",
        type: "IOC",
        format: "JSON",
        url: "https://urlhaus-api.abuse.ch/v1/urls/recent/",
      },
      {
        name: "MalwareBazaar Recent",
        source: "MALWAREBAZAAR",
        type: "MALWARE",
        format: "JSON",
        url: "https://mb-api.abuse.ch/api/v1/",
      },
      {
        name: "MITRE ATT&CK TAXII",
        source: "MITRE_ATTACK",
        type: "THREAT_ACTOR",
        format: "TAXII",
        url: "https://attack-taxii.mitre.org/taxii2/",
        syncInterval: 86400,
      },
    ];

    for (const feed of defaults) {
      await this.upsertFeed(organizationId, feed);
    }
  }

  async listVulnerabilityTechniqueMappings(organizationId: string) {
    return this.db.vulnerabilityAttackTechnique.findMany({
      where: {
        vulnerability: {
          organizationId,
        },
      },
      include: {
        vulnerability: {
          select: {
            id: true,
            cveId: true,
            title: true,
            severity: true,
            organizationId: true,
          },
        },
        technique: true,
      },
    });
  }

  async listActorTechniqueLinks() {
    return this.db.threatActorTechnique.findMany({
      include: {
        actor: true,
        technique: true,
      },
    });
  }
}

export function coerceFeedType(value: string): ThreatFeedType {
  const normalized = value.toUpperCase();
  if (["CVE", "MALWARE", "IOC", "THREAT_ACTOR", "CAMPAIGN"].includes(normalized)) {
    return normalized as ThreatFeedType;
  }

  return "IOC";
}

export function coerceFeedFormat(value: string): ThreatFeedFormat {
  const normalized = value.toUpperCase();
  if (["JSON", "CSV", "TAXII"].includes(normalized)) {
    return normalized as ThreatFeedFormat;
  }

  return "JSON";
}
