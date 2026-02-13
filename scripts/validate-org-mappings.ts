import { prisma } from "../src/lib/prisma";
import {
  createPrismaOrganizationMappingValidationReader,
  hasMappingValidationErrors,
  validateOrganizationMappings,
} from "../src/lib/security/org-mapping-validator";

async function main() {
  const reader = createPrismaOrganizationMappingValidationReader(prisma);
  const summary = await validateOrganizationMappings(reader);

  if (summary.missingTables.length > 0) {
    console.error("Missing required mapping tables:");
    for (const tableName of summary.missingTables) {
      console.error(`- ${tableName}`);
    }
    console.error(
      "Create and populate mapping tables before running migration 20260213183000_add_org_scope_to_scanners_and_risk.",
    );
    process.exit(1);
  }

  if (!hasMappingValidationErrors(summary)) {
    console.log("Organization mapping validation passed.");
    console.log("All ScannerConfig, ScanResult, and RiskSnapshot rows have resolvable organization mappings.");
    return;
  }

  if (summary.unresolvedScanners.length > 0) {
    console.error(`Unresolved ScannerConfig rows: ${summary.unresolvedScanners.length}`);
    for (const row of summary.unresolvedScanners.slice(0, 25)) {
      console.error(`- ScannerConfig ${row.id}`);
    }
    if (summary.unresolvedScanners.length > 25) {
      console.error(`...and ${summary.unresolvedScanners.length - 25} more`);
    }
  }

  if (summary.unresolvedRiskSnapshots.length > 0) {
    console.error(`Unresolved RiskSnapshot rows: ${summary.unresolvedRiskSnapshots.length}`);
    for (const row of summary.unresolvedRiskSnapshots.slice(0, 25)) {
      console.error(`- RiskSnapshot ${row.id}`);
    }
    if (summary.unresolvedRiskSnapshots.length > 25) {
      console.error(`...and ${summary.unresolvedRiskSnapshots.length - 25} more`);
    }
  }

  if (summary.unresolvedScanResults.length > 0) {
    console.error(`Unresolved ScanResult rows: ${summary.unresolvedScanResults.length}`);
    for (const row of summary.unresolvedScanResults.slice(0, 25)) {
      console.error(`- ScanResult ${row.id} (scannerId=${row.scannerId ?? "NULL"})`);
    }
    if (summary.unresolvedScanResults.length > 25) {
      console.error(`...and ${summary.unresolvedScanResults.length - 25} more`);
    }
  }

  process.exit(1);
}

main()
  .catch((error) => {
    console.error("Failed to validate organization mappings:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
