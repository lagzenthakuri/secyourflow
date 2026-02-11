import type { AssetType, Criticality, Environment, AssetStatus, CloudProvider } from "@prisma/client";

export interface DiscoveredAssetRecord {
  externalId?: string;
  name: string;
  type: AssetType;
  hostname?: string;
  ipAddress?: string;
  operatingSystem?: string;
  environment?: Environment;
  criticality?: Criticality;
  status?: AssetStatus;
  owner?: string;
  department?: string;
  location?: string;
  cloudProvider?: CloudProvider;
  cloudRegion?: string;
  cloudAccountId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface AssetDiscoveryAdapter {
  source: string;
  listDiscoveredAssets(): Promise<DiscoveredAssetRecord[]>;
}
