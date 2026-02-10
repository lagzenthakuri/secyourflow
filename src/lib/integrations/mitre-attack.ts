import { getThreatIntelConfig } from "@/modules/threat-intel/config";
import { MitreTaxiiClient } from "@/modules/threat-intel/mitre/taxii-client";
import { MitreAttackService } from "@/modules/threat-intel/mitre/service";
import { ThreatIntelRepository } from "@/modules/threat-intel/persistence/repository";

export class MitreAttackIntegration {
  private readonly service: MitreAttackService;

  constructor() {
    const config = getThreatIntelConfig();
    const repository = new ThreatIntelRepository();
    const client = new MitreTaxiiClient(config);
    this.service = new MitreAttackService(client, repository);
  }

  async sync(organizationId: string, checkpoint: string | null) {
    return this.service.sync({ organizationId, checkpoint });
  }
}
