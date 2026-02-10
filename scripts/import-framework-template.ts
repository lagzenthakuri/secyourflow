import { prisma } from "../src/lib/prisma";
import {
  assertTemplateId,
  importComplianceTemplate,
} from "../src/lib/compliance-template-importer";

function readArg(name: string): string | undefined {
  const index = process.argv.findIndex((arg) => arg === name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const templateArg = readArg("--template");
  if (!templateArg) {
    throw new Error("Missing --template argument. Example: --template iso27001_2022");
  }

  const templateId = assertTemplateId(templateArg);
  const providedOrgId = readArg("--org");
  const overwrite = process.argv.includes("--overwrite");

  const organization = providedOrgId
    ? await prisma.organization.findUnique({ where: { id: providedOrgId } })
    : await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });

  if (!organization) {
    throw new Error("No organization found. Create an organization before importing templates.");
  }

  const result = await importComplianceTemplate({
    templateId,
    organizationId: organization.id,
    overwriteExisting: overwrite,
  });

  console.log(
    JSON.stringify(
      {
        templateId,
        organizationId: organization.id,
        ...result,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("Template import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
