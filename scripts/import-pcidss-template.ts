import { prisma } from "../src/lib/prisma";
import { importComplianceTemplate } from "../src/lib/compliance-template-importer";

async function main() {
  const organization = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!organization) {
    throw new Error("No organization found.");
  }

  const result = await importComplianceTemplate({
    templateId: "pci_dss_4_0",
    organizationId: organization.id,
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error("PCI DSS import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
