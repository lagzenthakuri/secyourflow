import type {
  AssetStatus,
  AssetType,
  CloudProvider,
  Criticality,
  Environment,
} from "@repo/database";

export interface DiscoveredAssetRecord {
  cloudAccountId?: string;
  cloudProvider?: CloudProvider;
  cloudRegion?: string;
  criticality?: Criticality;
  department?: string;
  environment?: Environment;
  externalId?: string;
  hostname?: string;
  ipAddress?: string;
  location?: string;
  metadata?: Record<string, unknown>;
  name: string;
  operatingSystem?: string;
  owner?: string;
  status?: AssetStatus;
  tags?: string[];
  type: AssetType;
}

export interface AssetDiscoveryAdapter {
  listDiscoveredAssets(): Promise<DiscoveredAssetRecord[]>;
  source: string;
}
