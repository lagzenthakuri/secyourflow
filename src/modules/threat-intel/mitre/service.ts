import { MitreTaxiiClient } from "./taxii-client";
import { parseAttackObjects } from "./parser";
import { ThreatIntelRepository } from "../persistence/repository";
import { VulnerabilityTechniqueMapper } from "../mapping/vulnerability-mapper";

export interface MitreSyncSummary {
  tactics: number;
  techniques: number;
  actors: number;
  campaigns: number;
  tacticTechniqueLinks: number;
  actorTechniqueLinks: number;
  campaignTechniqueLinks: number;
  campaignActorLinks: number;
  vulnerabilityTechniqueLinks: number;
  vulnerabilityActorLinks: number;
  errors: string[];
  checkpoint: string;
}

export class MitreAttackService {
  private readonly mapper: VulnerabilityTechniqueMapper;

  constructor(
    private readonly taxiiClient: MitreTaxiiClient,
    private readonly repository: ThreatIntelRepository,
  ) {
    this.mapper = new VulnerabilityTechniqueMapper(repository);
  }

  async sync(params: { organizationId: string; checkpoint: string | null }): Promise<MitreSyncSummary> {
    const errors: string[] = [];

    const objects = await this.taxiiClient.fetchCollectionObjects({
      collectionId: "x-mitre-collection--1f5f1533-f617-4ca8-9ab4-6a02367fa019",
      addedAfter: params.checkpoint,
      limit: 500,
    });

    const parsed = parseAttackObjects(objects);

    const tacticIdByExternalId = new Map<string, string>();
    const techniqueIdByExternalId = new Map<string, string>();
    const actorIdByStixId = new Map<string, string>();
    const campaignIdByStixId = new Map<string, string>();

    for (const tactic of parsed.tactics) {
      try {
        const saved = await this.repository.upsertAttackTactic(tactic);
        tacticIdByExternalId.set(saved.externalId, saved.id);
      } catch (error) {
        errors.push(`Failed to upsert tactic ${tactic.externalId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    for (const technique of parsed.techniques) {
      try {
        const saved = await this.repository.upsertAttackTechnique({
          externalId: technique.externalId,
          name: technique.name,
          description: technique.description,
          isSubTechnique: technique.isSubTechnique,
          revoked: technique.revoked,
          platforms: technique.platforms,
        });
        techniqueIdByExternalId.set(saved.externalId, saved.id);
      } catch (error) {
        errors.push(`Failed to upsert technique ${technique.externalId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    let tacticTechniqueLinks = 0;
    for (const link of parsed.tacticTechniqueLinks) {
      const tacticId = tacticIdByExternalId.get(link.tacticExternalId);
      const techniqueId = techniqueIdByExternalId.get(link.techniqueExternalId);
      if (!tacticId || !techniqueId) continue;

      try {
        await this.repository.linkTechniqueToTactic(techniqueId, tacticId);
        tacticTechniqueLinks += 1;
      } catch (error) {
        errors.push(`Failed to link tactic ${link.tacticExternalId} -> ${link.techniqueExternalId}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    for (const actor of parsed.actors) {
      try {
        const saved = await this.repository.upsertThreatActor({
          externalId: actor.externalId,
          name: actor.name,
          description: actor.description,
          aliases: actor.aliases,
        });
        actorIdByStixId.set(actor.stixId, saved.id);
      } catch (error) {
        errors.push(`Failed to upsert actor ${actor.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    for (const campaign of parsed.campaigns) {
      try {
        const saved = await this.repository.upsertThreatCampaign({
          externalId: campaign.externalId,
          name: campaign.name,
          description: campaign.description,
          firstSeen: campaign.firstSeen,
          lastSeen: campaign.lastSeen,
          actorId: null,
        });
        campaignIdByStixId.set(campaign.stixId, saved.id);
      } catch (error) {
        errors.push(`Failed to upsert campaign ${campaign.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    let actorTechniqueLinks = 0;
    for (const link of parsed.actorTechniqueLinks) {
      const actorId = actorIdByStixId.get(link.actorStixId);
      const techniqueExternalId = parsed.techniques.find((entry) => entry.stixId === link.techniqueStixId)?.externalId;
      const techniqueId = techniqueExternalId ? techniqueIdByExternalId.get(techniqueExternalId) : null;
      if (!actorId || !techniqueId) continue;

      try {
        await this.repository.linkActorTechnique(actorId, techniqueId);
        actorTechniqueLinks += 1;
      } catch (error) {
        errors.push(`Failed to link actor technique ${link.actorStixId}:${link.techniqueStixId} - ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    let campaignTechniqueLinks = 0;
    for (const link of parsed.campaignTechniqueLinks) {
      const campaignId = campaignIdByStixId.get(link.campaignStixId);
      const techniqueExternalId = parsed.techniques.find((entry) => entry.stixId === link.techniqueStixId)?.externalId;
      const techniqueId = techniqueExternalId ? techniqueIdByExternalId.get(techniqueExternalId) : null;
      if (!campaignId || !techniqueId) continue;

      try {
        await this.repository.linkCampaignTechnique(campaignId, techniqueId);
        campaignTechniqueLinks += 1;
      } catch (error) {
        errors.push(`Failed to link campaign technique ${link.campaignStixId}:${link.techniqueStixId} - ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    let campaignActorLinks = 0;
    for (const link of parsed.campaignActorLinks) {
      const campaignId = campaignIdByStixId.get(link.campaignStixId);
      const actorId = actorIdByStixId.get(link.actorStixId);
      if (!campaignId || !actorId) continue;

      try {
        await this.repository.linkCampaignActor(campaignId, actorId);
        campaignActorLinks += 1;
      } catch (error) {
        errors.push(`Failed to link campaign actor ${link.campaignStixId}:${link.actorStixId} - ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const vulnerabilityTechnique = await this.mapper.mapOrganizationVulnerabilities(params.organizationId);
    errors.push(...vulnerabilityTechnique.errors);

    const vulnerabilityActor = await this.mapper.linkVulnerabilitiesToActors(params.organizationId);
    errors.push(...vulnerabilityActor.errors);

    return {
      tactics: parsed.tactics.length,
      techniques: parsed.techniques.length,
      actors: parsed.actors.length,
      campaigns: parsed.campaigns.length,
      tacticTechniqueLinks,
      actorTechniqueLinks,
      campaignTechniqueLinks,
      campaignActorLinks,
      vulnerabilityTechniqueLinks: vulnerabilityTechnique.direct + vulnerabilityTechnique.cwe,
      vulnerabilityActorLinks: vulnerabilityActor.linked,
      errors,
      checkpoint: new Date().toISOString(),
    };
  }
}
