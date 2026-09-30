import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (
  !(databaseUrl && new URL(databaseUrl).pathname.endsWith("/secyourflow_e2e"))
) {
  throw new Error(
    "TEST_DATABASE_URL must explicitly target the secyourflow_e2e database"
  );
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
try {
  const organization = await prisma.organization.upsert({
    where: { id: "e2e-organization" },
    create: { id: "e2e-organization", name: "E2E Test Organization" },
    update: {},
  });
  const password = await hash("TestPassword123!", 12);
  await prisma.user.upsert({
    where: { email: "test@example.com" },
    create: {
      email: "test@example.com",
      name: "E2E Test User",
      password,
      role: "MAIN_OFFICER",
      organizationId: organization.id,
    },
    update: {
      password,
      role: "MAIN_OFFICER",
      organizationId: organization.id,
      activeSessionId: null,
    },
  });
} finally {
  await prisma.$disconnect();
}
