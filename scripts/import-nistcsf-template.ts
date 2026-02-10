import { prisma } from "../src/lib/prisma";
import { importComplianceTemplate } from "../src/lib/compliance-template-importer";

async function main() {
  const organization = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!organization) {
    throw new Error("No organization found.");
  }

  const result = await importComplianceTemplate({
    templateId: "nist_csf_2_0",
    organizationId: organization.id,
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error("NIST CSF import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
