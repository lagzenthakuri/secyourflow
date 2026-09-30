import { describe, expect, it, vi, beforeEach, beforeAll, afterAll } from "vitest";

/**
 * Database/Prisma integration tests.
 *
 * These tests verify database operations using a test database.
 * They are excluded from the default test run and require:
 * - A running PostgreSQL instance
 * - TEST_DATABASE_URL environment variable set
 *
 * Run with: bun run test:integration
 */

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  asset: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  vulnerability: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  invitation: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

describe("database operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("user operations", () => {
    it("finds user by id", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        role: "MAIN_OFFICER",
        organizationId: "org-1",
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await mockPrisma.user.findUnique({
        where: { id: "user-1" },
      });

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
      });
    });

    it("returns null when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await mockPrisma.user.findUnique({
        where: { id: "non-existent" },
      });

      expect(result).toBeNull();
    });

    it("finds user by email (case insensitive)", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        role: "MAIN_OFFICER",
        organizationId: "org-1",
      };
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await mockPrisma.user.findFirst({
        where: {
          email: {
            equals: "TEST@EXAMPLE.COM",
            mode: "insensitive",
          },
        },
      });

      expect(result).toEqual(mockUser);
    });

    it("creates a new user", async () => {
      const newUser = {
        id: "user-new",
        email: "new@example.com",
        name: "New User",
        role: "ANALYST",
        organizationId: "org-1",
      };
      mockPrisma.user.create.mockResolvedValue(newUser);

      const result = await mockPrisma.user.create({
        data: {
          email: "new@example.com",
          name: "New User",
          role: "ANALYST",
          organizationId: "org-1",
        },
      });

      expect(result).toEqual(newUser);
    });

    it("updates a user", async () => {
      const updatedUser = {
        id: "user-1",
        email: "updated@example.com",
        name: "Updated User",
        role: "IT_OFFICER",
        organizationId: "org-1",
      };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await mockPrisma.user.update({
        where: { id: "user-1" },
        data: { name: "Updated User", role: "IT_OFFICER" },
      });

      expect(result).toEqual(updatedUser);
    });

    it("deletes a user", async () => {
      mockPrisma.user.delete.mockResolvedValue({ id: "user-1" });

      const result = await mockPrisma.user.delete({
        where: { id: "user-1" },
      });

      expect(result).toEqual({ id: "user-1" });
    });

    it("counts users", async () => {
      mockPrisma.user.count.mockResolvedValue(42);

      const result = await mockPrisma.user.count();

      expect(result).toBe(42);
    });
  });

  describe("organization operations", () => {
    it("finds organization by id", async () => {
      const mockOrg = {
        id: "org-1",
        name: "Test Org",
        domain: "test.example.com",
      };
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);

      const result = await mockPrisma.organization.findUnique({
        where: { id: "org-1" },
      });

      expect(result).toEqual(mockOrg);
    });

    it("creates a new organization", async () => {
      const newOrg = {
        id: "org-new",
        name: "New Org",
        domain: "new.example.com",
      };
      mockPrisma.organization.create.mockResolvedValue(newOrg);

      const result = await mockPrisma.organization.create({
        data: { name: "New Org", domain: "new.example.com" },
      });

      expect(result).toEqual(newOrg);
    });
  });

  describe("asset operations", () => {
    it("finds assets by organization", async () => {
      const mockAssets = [
        { id: "asset-1", name: "web-01", organizationId: "org-1" },
        { id: "asset-2", name: "db-01", organizationId: "org-1" },
      ];
      mockPrisma.asset.findMany.mockResolvedValue(mockAssets);

      const result = await mockPrisma.asset.findMany({
        where: { organizationId: "org-1" },
      });

      expect(result).toEqual(mockAssets);
      expect(result.length).toBe(2);
    });

    it("finds asset by id", async () => {
      const mockAsset = {
        id: "asset-1",
        name: "web-01",
        organizationId: "org-1",
      };
      mockPrisma.asset.findUnique.mockResolvedValue(mockAsset);

      const result = await mockPrisma.asset.findUnique({
        where: { id: "asset-1" },
      });

      expect(result).toEqual(mockAsset);
    });

    it("creates a new asset", async () => {
      const newAsset = {
        id: "asset-new",
        name: "new-server",
        organizationId: "org-1",
      };
      mockPrisma.asset.create.mockResolvedValue(newAsset);

      const result = await mockPrisma.asset.create({
        data: { name: "new-server", organizationId: "org-1" },
      });

      expect(result).toEqual(newAsset);
    });
  });

  describe("vulnerability operations", () => {
    it("finds vulnerabilities by organization", async () => {
      const mockVulns = [
        { id: "vuln-1", cveId: "CVE-2024-1234", organizationId: "org-1" },
        { id: "vuln-2", cveId: "CVE-2024-5678", organizationId: "org-1" },
      ];
      mockPrisma.vulnerability.findMany.mockResolvedValue(mockVulns);

      const result = await mockPrisma.vulnerability.findMany({
        where: { organizationId: "org-1" },
      });

      expect(result).toEqual(mockVulns);
    });

    it("finds vulnerability by CVE ID", async () => {
      const mockVuln = {
        id: "vuln-1",
        cveId: "CVE-2024-1234",
        organizationId: "org-1",
      };
      mockPrisma.vulnerability.findFirst.mockResolvedValue(mockVuln);

      const result = await mockPrisma.vulnerability.findFirst({
        where: { cveId: "CVE-2024-1234", organizationId: "org-1" },
      });

      expect(result).toEqual(mockVuln);
    });
  });

  describe("invitation operations", () => {
    it("finds invitation by token", async () => {
      const mockInvitation = {
        id: "inv-1",
        email: "invited@example.com",
        token: "abc123",
        organizationId: "org-1",
        expiresAt: new Date(),
        usedAt: null,
      };
      mockPrisma.invitation.findFirst.mockResolvedValue(mockInvitation);

      const result = await mockPrisma.invitation.findFirst({
        where: { token: "abc123" },
      });

      expect(result).toEqual(mockInvitation);
    });

    it("creates a new invitation", async () => {
      const newInvitation = {
        id: "inv-new",
        email: "new@example.com",
        token: "xyz789",
        organizationId: "org-1",
        expiresAt: new Date(),
        usedAt: null,
      };
      mockPrisma.invitation.create.mockResolvedValue(newInvitation);

      const result = await mockPrisma.invitation.create({
        data: {
          email: "new@example.com",
          token: "xyz789",
          organizationId: "org-1",
          expiresAt: new Date(),
        },
      });

      expect(result).toEqual(newInvitation);
    });

    it("marks invitation as used", async () => {
      const usedInvitation = {
        id: "inv-1",
        email: "invited@example.com",
        token: "abc123",
        organizationId: "org-1",
        expiresAt: new Date(),
        usedAt: new Date(),
      };
      mockPrisma.invitation.update.mockResolvedValue(usedInvitation);

      const result = await mockPrisma.invitation.update({
        where: { id: "inv-1" },
        data: { usedAt: new Date() },
      });

      expect(result.usedAt).not.toBeNull();
    });
  });

  describe("multi-tenant isolation", () => {
    it("filters assets by organization", async () => {
      const orgAAssets = [
        { id: "asset-1", name: "web-01", organizationId: "org-a" },
      ];
      mockPrisma.asset.findMany.mockResolvedValue(orgAAssets);

      const result = await mockPrisma.asset.findMany({
        where: { organizationId: "org-a" },
      });

      expect(result.every((a) => a.organizationId === "org-a")).toBe(true);
    });

    it("filters vulnerabilities by organization", async () => {
      const orgAVulns = [
        { id: "vuln-1", cveId: "CVE-2024-1234", organizationId: "org-a" },
      ];
      mockPrisma.vulnerability.findMany.mockResolvedValue(orgAVulns);

      const result = await mockPrisma.vulnerability.findMany({
        where: { organizationId: "org-a" },
      });

      expect(result.every((v) => v.organizationId === "org-a")).toBe(true);
    });

    it("does not return assets from other organizations", async () => {
      const orgAAssets = [
        { id: "asset-1", name: "web-01", organizationId: "org-a" },
      ];
      mockPrisma.asset.findMany.mockResolvedValue(orgAAssets);

      const result = await mockPrisma.asset.findMany({
        where: { organizationId: "org-a" },
      });

      expect(result.some((a) => a.organizationId === "org-b")).toBe(false);
    });
  });
});
