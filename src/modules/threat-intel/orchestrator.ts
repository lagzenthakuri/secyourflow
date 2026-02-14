import type { ThreatFeed } from "@prisma/client";
import { getThreatIntelConfig, type ThreatIntelConfig } from "./config";
import { ThreatIntelRepository } from "./persistence/repository";
import type { ThreatFeedAdapter } from "./adapters/types";
import { OtxAdapter } from "./adapters/otx-adapter";
import { CirclAdapter } from "./adapters/circl-adapter";
import { UrlhausAdapter } from "./adapters/urlhaus-adapter";
import { MalwareBazaarAdapter } from "./adapters/malwarebazaar-adapter";
import { CustomFeedAdapter } from "./adapters/custom-feed-adapter";
import { MitreTaxiiClient } from "./mitre/taxii-client";
import { MitreAttackService } from "./mitre/service";
import { IocCorrelationEngine } from "./correlation/engine";
import { decryptSecret } from "@/lib/crypto/sealed-secrets";

export interface FeedSyncResult {
  feedId: string;
  feedName: string;
  source: string;
  success: boolean;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  checkpoint: string | null;
}

export interface ThreatIntelSyncResult {
  organizationId: string;
  startedAt: string;
  finishedAt: string;
  feeds: FeedSyncResult[];
  correlation?: {
    scannedIndicators: number;
    scannedAssets: number;
    matchesCreated: number;
    matchesUpdated: number;
    alertsGenerated: number;
  };
}

interface SyncOptions {
  source?: string;
  includeMitre?: boolean;
  includeCorrelation?: boolean;
}

export class ThreatIntelOrchestrator {
  private readonly config: ThreatIntelConfig;
  private readonly repository: ThreatIntelRepository;

  constructor(config?: ThreatIntelConfig, repository?: ThreatIntelRepository) {
    this.config = config ?? getThreatIntelConfig();
    this.repository = repository ?? new ThreatIntelRepository();
  }

  private staleRunThresholdMs(): number {
    const timeoutDerivedWindow = this.config.ingestion.timeoutMs * 20;
    return Math.max(10 * 60 * 1000, timeoutDerivedWindow);
  }

  private createAdapter(feed: ThreatFeed): ThreatFeedAdapter | null {
    switch (feed.source.toUpperCase()) {
      case "ALIENVAULT_OTX":
        return new OtxAdapter(this.config);
      case "CIRCL":
        return new CirclAdapter(this.config);
      case "URLHAUS":
        return new UrlhausAdapter(this.config);
      case "MALWAREBAZAAR":
        return new MalwareBazaarAdapter(this.config);
      case "MITRE_ATTACK":
        return null;
      default:
        if (!feed.url) {
          return null;
        }

        return new CustomFeedAdapter(this.config, {
          source: feed.source,
          url: feed.url,
          format: feed.format,
          apiKey: decryptSecret(feed.apiKey),
          headers:
            feed.metadata && typeof feed.metadata === "object" && !Array.isArray(feed.metadata)
              ? ((feed.metadata as Record<string, unknown>).headers as Record<string, string> | undefined)
              : undefined,
        });
    }
  }

  async sync(organizationId: string, options: SyncOptions = {}): Promise<ThreatIntelSyncResult> {
    if (!this.config.features.enabled) {
      throw new Error("Threat intel feature is disabled via THREAT_INTEL_ENABLED");
    }

    await this.repository.seedDefaultFeeds(organizationId);

    const startedAt = new Date();
    const feedResults: FeedSyncResult[] = [];

    const feeds = (await this.repository.listFeeds(organizationId)).filter((feed) => {
      if (!feed.isActive) {
        return false;
      }

      if (!options.source) {
        return true;
      }

      return feed.source.toLowerCase() === options.source.toLowerCase();
    });

    for (const feed of feeds) {
      await this.repository.markStaleFeedRuns(
        organizationId,
        feed.id,
        new Date(Date.now() - this.staleRunThresholdMs()),
      );

      const run = await this.repository.createFeedRun(organizationId, feed.id);
      const runResult: FeedSyncResult = {
        feedId: feed.id,
        feedName: feed.name,
        source: feed.source,
        success: false,
        fetched: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [],
        checkpoint: feed.checkpoint,
      };

      try {
        if (feed.source.toUpperCase() === "MITRE_ATTACK") {
          if (options.includeMitre === false) {
            runResult.success = true;
            feedResults.push(runResult);
            await this.repository.finishFeedRun(run.id, {
              fetched: 0,
              created: 0,
              updated: 0,
              skipped: 0,
              errors: [],
              checkpoint: feed.checkpoint,
            });
            continue;
          }

          const mitreService = new MitreAttackService(new MitreTaxiiClient(this.config), this.repository);
          const mitreResult = await mitreService.sync({
            organizationId,
            checkpoint: feed.checkpoint,
          });

          runResult.fetched = mitreResult.tactics + mitreResult.techniques + mitreResult.actors + mitreResult.campaigns;
          runResult.created = runResult.fetched;
          runResult.updated = mitreResult.tacticTechniqueLinks + mitreResult.actorTechniqueLinks + mitreResult.campaignTechniqueLinks;
          runResult.errors = mitreResult.errors;
          runResult.checkpoint = mitreResult.checkpoint;
          runResult.success = mitreResult.errors.length === 0;

          await this.repository.updateFeed(organizationId, feed.id, {
            checkpoint: mitreResult.checkpoint,
            lastSync: new Date(),
          });

          await this.repository.finishFeedRun(run.id, {
            fetched: runResult.fetched,
            created: runResult.created,
            updated: runResult.updated,
            skipped: runResult.skipped,
            errors: runResult.errors,
            checkpoint: runResult.checkpoint,
          });

          feedResults.push(runResult);
          continue;
        }

        const adapter = this.createAdapter(feed);
        if (!adapter) {
          runResult.errors.push(`No adapter available for source ${feed.source}`);
          runResult.success = false;
          feedResults.push(runResult);
          await this.repository.finishFeedRun(run.id, {
            fetched: 0,
            created: 0,
            updated: 0,
            skipped: 0,
            errors: runResult.errors,
            checkpoint: runResult.checkpoint,
          });
          continue;
        }

        const fetched = await adapter.fetchSince(feed.checkpoint);
        runResult.fetched = fetched.records.length;
        runResult.checkpoint = fetched.checkpoint;
        runResult.errors.push(...fetched.warnings);

        for (const record of fetched.records) {
          const normalized = adapter.normalize(record, {
            organizationId,
            sourceName: feed.source,
          });

          if (!normalized) {
            runResult.skipped += 1;
            continue;
          }

          const upserted = await this.repository.upsertIndicator(organizationId, feed.id, normalized);
          if (upserted.created) {
            runResult.created += 1;
          } else {
            runResult.updated += 1;
          }
        }

        runResult.success = runResult.errors.length === 0;

        await this.repository.updateFeed(organizationId, feed.id, {
          checkpoint: runResult.checkpoint,
          lastSync: new Date(),
        });

        await this.repository.finishFeedRun(run.id, {
          fetched: runResult.fetched,
          created: runResult.created,
          updated: runResult.updated,
          skipped: runResult.skipped,
          errors: runResult.errors,
          checkpoint: runResult.checkpoint,
        });
      } catch (error) {
        runResult.success = false;
        runResult.errors.push(error instanceof Error ? error.message : String(error));

        await this.repository.finishFeedRun(run.id, {
          fetched: runResult.fetched,
          created: runResult.created,
          updated: runResult.updated,
          skipped: runResult.skipped,
          errors: runResult.errors,
          checkpoint: runResult.checkpoint,
        });
      }

      feedResults.push(runResult);
    }

    let correlation: ThreatIntelSyncResult["correlation"];
    if (options.includeCorrelation !== false && this.config.features.iocCorrelationEnabled) {
      const engine = new IocCorrelationEngine(this.repository, this.config);
      correlation = await engine.run(organizationId);
    }

    return {
      organizationId,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      feeds: feedResults,
      correlation,
    };
  }
}
