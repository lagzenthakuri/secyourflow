import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (
  !(databaseUrl && new URL(databaseUrl).pathname.endsWith("/secyourflow_test"))
) {
  throw new Error(
    "Integration tests require TEST_DATABASE_URL targeting secyourflow_test"
  );
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const prefix = `integration-${randomUUID()}`;
const orgA = `${prefix}-a`;
const orgB = `${prefix}-b`;
const userId = `${prefix}-user`;
const email = `${prefix}@example.com`;

beforeAll(async () => {
  await prisma.organization.createMany({
    data: [
      { id: orgA, name: "Integration Alpha" },
      { id: orgB, name: "Integration Beta" },
    ],
  });
  await prisma.user.create({
    data: { id: userId, email, organizationId: orgA, role: "ANALYST" },
  });
});
afterAll(async () => {
  try {
    await prisma.user.deleteMany({
      where: { organizationId: { in: [orgA, orgB] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [orgA, orgB] } },
    });
  } finally {
    await prisma.$disconnect();
  }
});

describe("PostgreSQL through Prisma", () => {
  it("persists and retrieves a user", async () => {
    expect(
      await prisma.user.findUnique({ where: { id: userId } })
    ).toMatchObject({ email, organizationId: orgA, role: "ANALYST" });
  });
  it("supports case-insensitive email lookup", async () => {
    expect(
      await prisma.user.findFirst({
        where: { email: { equals: email.toUpperCase(), mode: "insensitive" } },
      })
    ).toMatchObject({ id: userId });
  });
  it("does not return another organization's users for a scoped query", async () => {
    expect(
      await prisma.user.findMany({ where: { organizationId: orgB } })
    ).toEqual([]);
    expect(
      await prisma.user.findMany({ where: { organizationId: orgA } })
    ).toHaveLength(1);
  });
  it("enforces unique emails", async () => {
    await expect(
      prisma.user.create({ data: { email, organizationId: orgB } })
    ).rejects.toMatchObject({ code: "P2002" });
  });
  it("enforces organization foreign keys", async () => {
    await expect(
      prisma.user.create({
        data: {
          email: `${prefix}-missing@example.com`,
          organizationId: `${prefix}-missing`,
        },
      })
    ).rejects.toMatchObject({ code: "P2003" });
  });
  it("rolls back failed transactions", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { name: "Must roll back" },
        });
        throw new Error("Intentional rollback");
      })
    ).rejects.toThrow("Intentional rollback");
    expect(
      await prisma.user.findUnique({ where: { id: userId } })
    ).toMatchObject({ name: null });
  });
});
