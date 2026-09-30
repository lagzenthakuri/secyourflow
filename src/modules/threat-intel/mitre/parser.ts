interface ExternalReference {
  external_id?: string;
  source_name?: string;
}

interface KillChainPhase {
  kill_chain_name?: string;
  phase_name?: string;
}

interface StixBaseObject {
  aliases?: string[];
  created?: string;
  description?: string;
  external_references?: ExternalReference[];
  first_seen?: string;
  id?: string;
  kill_chain_phases?: KillChainPhase[];
  last_seen?: string;
  modified?: string;
  name?: string;
  relationship_type?: string;
  revoked?: boolean;
  source_ref?: string;
  target_ref?: string;
  type?: string;
  x_mitre_is_subtechnique?: boolean;
  x_mitre_platforms?: string[];
  x_mitre_shortname?: string;
}

export interface ParsedAttackTactic {
  description: string | null;
  externalId: string;
  name: string;
  platforms: string[];
  shortName: string | null;
}

export interface ParsedAttackTechnique {
  description: string | null;
  externalId: string;
  isSubTechnique: boolean;
  name: string;
  platforms: string[];
  revoked: boolean;
  stixId: string;
  tacticShortNames: string[];
}

export interface ParsedThreatActor {
  aliases: string[];
  description: string | null;
  externalId: string | null;
  name: string;
  stixId: string;
}

export interface ParsedThreatCampaign {
  description: string | null;
  externalId: string | null;
  firstSeen: Date | null;
  lastSeen: Date | null;
  name: string;
  stixId: string;
}

export interface ParsedAttackData {
  actors: ParsedThreatActor[];
  actorTechniqueLinks: Array<{ actorStixId: string; techniqueStixId: string }>;
  campaignActorLinks: Array<{ campaignStixId: string; actorStixId: string }>;
  campaigns: ParsedThreatCampaign[];
  campaignTechniqueLinks: Array<{
    campaignStixId: string;
    techniqueStixId: string;
  }>;
  tactics: ParsedAttackTactic[];
  tacticTechniqueLinks: Array<{
    tacticExternalId: string;
    techniqueExternalId: string;
  }>;
  techniques: ParsedAttackTechnique[];
}

function getAttackExternalId(
  references: ExternalReference[] | undefined
): string | null {
  for (const reference of references ?? []) {
    if (reference.source_name === "mitre-attack" && reference.external_id) {
      return reference.external_id;
    }
  }

  return null;
}

function toDate(value?: string): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseAttackObjects(objects: unknown[]): ParsedAttackData {
  const stixObjects = objects.filter(
    (item): item is StixBaseObject => Boolean(item) && typeof item === "object"
  );

  const tactics: ParsedAttackTactic[] = [];
  const techniques: ParsedAttackTechnique[] = [];
  const actors: ParsedThreatActor[] = [];
  const campaigns: ParsedThreatCampaign[] = [];

  const tacticByShortName = new Map<string, string>();
  const techniqueExternalByStixId = new Map<string, string>();

  for (const object of stixObjects) {
    if (!(object.id && object.type)) {
      continue;
    }

    if (object.type === "x-mitre-tactic") {
      const externalId = getAttackExternalId(object.external_references);
      if (!externalId) {
        continue;
      }

      const shortName = object.x_mitre_shortname ?? null;
      if (shortName) {
        tacticByShortName.set(shortName, externalId);
      }

      tactics.push({
        externalId,
        name: object.name ?? externalId,
        shortName,
        description: object.description ?? null,
        platforms: object.x_mitre_platforms ?? [],
      });
      continue;
    }

    if (object.type === "attack-pattern") {
      const externalId = getAttackExternalId(object.external_references);
      if (!externalId?.startsWith("T")) {
        continue;
      }

      const tacticShortNames = (object.kill_chain_phases ?? [])
        .filter(
          (phase) =>
            phase.kill_chain_name === "mitre-attack" &&
            Boolean(phase.phase_name)
        )
        .map((phase) => phase.phase_name as string);

      techniques.push({
        externalId,
        stixId: object.id,
        name: object.name ?? externalId,
        description: object.description ?? null,
        isSubTechnique: Boolean(object.x_mitre_is_subtechnique),
        revoked: Boolean(object.revoked),
        platforms: object.x_mitre_platforms ?? [],
        tacticShortNames,
      });

      techniqueExternalByStixId.set(object.id, externalId);
      continue;
    }

    if (object.type === "intrusion-set") {
      actors.push({
        externalId: getAttackExternalId(object.external_references),
        stixId: object.id,
        name: object.name ?? object.id,
        description: object.description ?? null,
        aliases: object.aliases ?? [],
      });
      continue;
    }

    if (object.type === "campaign") {
      campaigns.push({
        externalId: getAttackExternalId(object.external_references),
        stixId: object.id,
        name: object.name ?? object.id,
        description: object.description ?? null,
        firstSeen: toDate(object.first_seen),
        lastSeen: toDate(object.last_seen),
      });
    }
  }

  const tacticTechniqueLinks: Array<{
    tacticExternalId: string;
    techniqueExternalId: string;
  }> = [];

  for (const technique of techniques) {
    for (const shortName of technique.tacticShortNames) {
      const tacticExternalId = tacticByShortName.get(shortName);
      if (!tacticExternalId) {
        continue;
      }

      tacticTechniqueLinks.push({
        tacticExternalId,
        techniqueExternalId: technique.externalId,
      });
    }
  }

  const actorTechniqueLinks: Array<{
    actorStixId: string;
    techniqueStixId: string;
  }> = [];
  const campaignTechniqueLinks: Array<{
    campaignStixId: string;
    techniqueStixId: string;
  }> = [];
  const campaignActorLinks: Array<{
    campaignStixId: string;
    actorStixId: string;
  }> = [];

  for (const object of stixObjects) {
    if (object.type !== "relationship") {
      continue;
    }

    if (
      !(object.source_ref && object.target_ref) ||
      object.relationship_type !== "uses"
    ) {
      continue;
    }

    const source = object.source_ref;
    const target = object.target_ref;

    if (
      source.startsWith("intrusion-set--") &&
      target.startsWith("attack-pattern--")
    ) {
      if (techniqueExternalByStixId.has(target)) {
        actorTechniqueLinks.push({
          actorStixId: source,
          techniqueStixId: target,
        });
      }
      continue;
    }

    if (
      source.startsWith("campaign--") &&
      target.startsWith("attack-pattern--")
    ) {
      if (techniqueExternalByStixId.has(target)) {
        campaignTechniqueLinks.push({
          campaignStixId: source,
          techniqueStixId: target,
        });
      }
      continue;
    }

    if (
      source.startsWith("campaign--") &&
      target.startsWith("intrusion-set--")
    ) {
      campaignActorLinks.push({ campaignStixId: source, actorStixId: target });
      continue;
    }

    if (
      source.startsWith("intrusion-set--") &&
      target.startsWith("campaign--")
    ) {
      campaignActorLinks.push({ campaignStixId: target, actorStixId: source });
    }
  }

  return {
    tactics,
    techniques,
    actors,
    campaigns,
    tacticTechniqueLinks,
    actorTechniqueLinks,
    campaignTechniqueLinks,
    campaignActorLinks,
  };
}
