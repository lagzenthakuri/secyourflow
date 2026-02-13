import { prisma } from "@/lib/prisma";

export type UnresolvedIdRow = { id: string };
export type UnresolvedScanRow = { id: string; scannerId: string | null };

export type OrganizationMappingValidationSummary = {
  missingTables: string[];
  unresolvedScanners: UnresolvedIdRow[];
  unresolvedRiskSnapshots: UnresolvedIdRow[];
  unresolvedScanResults: UnresolvedScanRow[];
};

export interface OrganizationMappingValidationReader {
  tableExists: (tableName: string) => Promise<boolean>;
  getUnresolvedScanners: () => Promise<UnresolvedIdRow[]>;
  getUnresolvedRiskSnapshots: () => Promise<UnresolvedIdRow[]>;
  getUnresolvedScanResults: () => Promise<UnresolvedScanRow[]>;
}

type ExistsRow = { exists: boolean };

type QueryablePrisma = Pick<typeof prisma, "$queryRaw">;

export function createPrismaOrganizationMappingValidationReader(
  db: QueryablePrisma = prisma,
): OrganizationMappingValidationReader {
  return {
    async tableExists(tableName: string) {
      const rows = await db.$queryRaw<ExistsRow[]>`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = ${tableName}
        ) AS "exists"
      `;
      return rows[0]?.exists === true;
    },
    async getUnresolvedScanners() {
      return db.$queryRaw<UnresolvedIdRow[]>`
        SELECT sc.id
        FROM "ScannerConfig" AS sc
        LEFT JOIN "ScannerConfigOrganizationMapping" AS map
          ON map."scannerConfigId" = sc.id
        LEFT JOIN "Organization" AS org
          ON org.id = map."organizationId"
        WHERE map."scannerConfigId" IS NULL
           OR org.id IS NULL
        ORDER BY sc."createdAt" ASC
      `;
    },
    async getUnresolvedRiskSnapshots() {
      return db.$queryRaw<UnresolvedIdRow[]>`
        SELECT rs.id
        FROM "RiskSnapshot" AS rs
        LEFT JOIN "RiskSnapshotOrganizationMapping" AS map
          ON map."riskSnapshotId" = rs.id
        LEFT JOIN "Organization" AS org
          ON org.id = map."organizationId"
        WHERE map."riskSnapshotId" IS NULL
           OR org.id IS NULL
        ORDER BY rs."date" ASC
      `;
    },
    async getUnresolvedScanResults() {
      return db.$queryRaw<UnresolvedScanRow[]>`
        SELECT sr.id, sr."scannerId"
        FROM "ScanResult" AS sr
        LEFT JOIN "ScannerConfig" AS sc
          ON sc.id = sr."scannerId"
        LEFT JOIN "ScannerConfigOrganizationMapping" AS map
          ON map."scannerConfigId" = sc.id
        LEFT JOIN "Organization" AS org
          ON org.id = map."organizationId"
        WHERE sc.id IS NULL
           OR map."scannerConfigId" IS NULL
           OR org.id IS NULL
        ORDER BY sr."createdAt" ASC
      `;
    },
  };
}

export async function validateOrganizationMappings(
  reader: OrganizationMappingValidationReader,
): Promise<OrganizationMappingValidationSummary> {
  const requiredTables = ["ScannerConfigOrganizationMapping", "RiskSnapshotOrganizationMapping"];
  const missingTables: string[] = [];

  for (const tableName of requiredTables) {
    const exists = await reader.tableExists(tableName);
    if (!exists) {
      missingTables.push(tableName);
    }
  }

  if (missingTables.length > 0) {
    return {
      missingTables,
      unresolvedScanners: [],
      unresolvedRiskSnapshots: [],
      unresolvedScanResults: [],
    };
  }

  const [unresolvedScanners, unresolvedRiskSnapshots, unresolvedScanResults] = await Promise.all([
    reader.getUnresolvedScanners(),
    reader.getUnresolvedRiskSnapshots(),
    reader.getUnresolvedScanResults(),
  ]);

  return {
    missingTables,
    unresolvedScanners,
    unresolvedRiskSnapshots,
    unresolvedScanResults,
  };
}

export function hasMappingValidationErrors(summary: OrganizationMappingValidationSummary): boolean {
  return (
    summary.missingTables.length > 0 ||
    summary.unresolvedScanners.length > 0 ||
    summary.unresolvedRiskSnapshots.length > 0 ||
    summary.unresolvedScanResults.length > 0
  );
}
