import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Multi-tenant isolation tests.
 *
 * CRITICAL: These tests verify that users cannot access resources
 * belonging to other organizations. This is a fundamental security
 * requirement for the SecYourFlow platform.
 */

const mockAuth = vi.hoisted(() => vi.fn());
const mockIsTwoFactorSatisfied = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/security/two-factor", () => ({
  isTwoFactorSatisfied: mockIsTwoFactorSatisfied,
}));

import { requireSessionWithOrg } from "@/lib/api-auth";

describe("multi-tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsTwoFactorSatisfied.mockReturnValue(true);
  });

  it("attaches the correct organization ID from the session", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-org-a",
        organizationId: "org-a-001",
        role: "MAIN_OFFICER",
      },
    });

    const request = new Request("http://localhost:3000/api/assets");
    const result = await requireSessionWithOrg(request);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.organizationId).toBe("org-a-001");
    }
  });

  it("does not accept organization ID from request parameters", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-org-a",
        organizationId: "org-a-001",
        role: "MAIN_OFFICER",
      },
    });

    // Attempt to pass a different org ID via query parameter
    const request = new Request(
      "http://localhost:3000/api/assets?organizationId=org-b-002"
    );
    const result = await requireSessionWithOrg(request);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // The session org ID should be used, not the query parameter
      expect(result.context.organizationId).toBe("org-a-001");
    }
  });

  it("does not accept organization ID from request body", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-org-a",
        organizationId: "org-a-001",
        role: "MAIN_OFFICER",
      },
    });

    const request = new Request("http://localhost:3000/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: "org-b-002", name: "test" }),
    });
    const result = await requireSessionWithOrg(request);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.organizationId).toBe("org-a-001");
    }
  });

  it("does not accept organization ID from headers", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-org-a",
        organizationId: "org-a-001",
        role: "MAIN_OFFICER",
      },
    });

    const request = new Request("http://localhost:3000/api/assets", {
      headers: { "X-Organization-Id": "org-b-002" },
    });
    const result = await requireSessionWithOrg(request);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.organizationId).toBe("org-a-001");
    }
  });

  it("rejects requests when user has no organization", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-no-org",
        organizationId: null,
        role: "MAIN_OFFICER",
      },
    });

    const request = new Request("http://localhost:3000/api/assets");
    const result = await requireSessionWithOrg(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("maintains isolation across different users from different orgs", async () => {
    // User from Org A
    mockAuth.mockResolvedValue({
      user: {
        id: "user-a",
        organizationId: "org-a-001",
        role: "MAIN_OFFICER",
      },
    });

    const requestA = new Request("http://localhost:3000/api/assets");
    const resultA = await requireSessionWithOrg(requestA);

    // User from Org B
    mockAuth.mockResolvedValue({
      user: {
        id: "user-b",
        organizationId: "org-b-002",
        role: "MAIN_OFFICER",
      },
    });

    const requestB = new Request("http://localhost:3000/api/assets");
    const resultB = await requireSessionWithOrg(requestB);

    expect(resultA.ok).toBe(true);
    expect(resultB.ok).toBe(true);

    if (resultA.ok && resultB.ok) {
      expect(resultA.context.organizationId).toBe("org-a-001");
      expect(resultB.context.organizationId).toBe("org-b-002");
      expect(resultA.context.organizationId).not.toBe(
        resultB.context.organizationId
      );
    }
  });
});
