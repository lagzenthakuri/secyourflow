import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * API authentication flow integration tests.
 *
 * Tests the complete authentication flow through API routes.
 * These tests verify the interaction between auth middleware,
 * session validation, and API route handlers.
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

describe("API authentication flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsTwoFactorSatisfied.mockReturnValue(true);
  });

  it("allows authenticated user to access protected endpoint", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        role: "MAIN_OFFICER",
        organizationId: "org-1",
        totpEnabled: false,
      },
    });

    const request = new Request("http://localhost:3000/api/assets");
    const result = await requireSessionWithOrg(request);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.userId).toBe("user-1");
      expect(result.context.organizationId).toBe("org-1");
      expect(result.context.role).toBe("MAIN_OFFICER");
    }
  });

  it("rejects unauthenticated request to protected endpoint", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/assets");
    const result = await requireSessionWithOrg(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("rejects request when user has no organization", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        role: "MAIN_OFFICER",
        organizationId: null,
        totpEnabled: false,
      },
    });

    const request = new Request("http://localhost:3000/api/assets");
    const result = await requireSessionWithOrg(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("rejects request when 2FA is not satisfied for non-MAIN_OFFICER role", async () => {
    mockIsTwoFactorSatisfied.mockReturnValue(false);
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        role: "IT_OFFICER",
        organizationId: "org-1",
        totpEnabled: true,
      },
    });

    const request = new Request("http://localhost:3000/api/assets");
    const result = await requireSessionWithOrg(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("allows MAIN_OFFICER to bypass 2FA check", async () => {
    mockIsTwoFactorSatisfied.mockReturnValue(false);
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        role: "MAIN_OFFICER",
        organizationId: "org-1",
        totpEnabled: true,
      },
    });

    const request = new Request("http://localhost:3000/api/assets");
    const result = await requireSessionWithOrg(request);

    expect(result.ok).toBe(true);
  });

  it("enforces role-based access control", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        role: "ANALYST",
        organizationId: "org-1",
        totpEnabled: false,
      },
    });

    const request = new Request("http://localhost:3000/api/admin/users");
    const result = await requireSessionWithOrg(request, {
      allowedRoles: ["MAIN_OFFICER"],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("allows access when role is in allowed list", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        role: "IT_OFFICER",
        organizationId: "org-1",
        totpEnabled: false,
      },
    });

    const request = new Request("http://localhost:3000/api/assets");
    const result = await requireSessionWithOrg(request, {
      allowedRoles: ["MAIN_OFFICER", "IT_OFFICER"],
    });

    expect(result.ok).toBe(true);
  });

  it("allows access when no role restriction is specified", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        role: "ANALYST",
        organizationId: "org-1",
        totpEnabled: false,
      },
    });

    const request = new Request("http://localhost:3000/api/reports");
    const result = await requireSessionWithOrg(request);

    expect(result.ok).toBe(true);
  });

  it("maintains organization context across requests", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "user@example.com",
        name: "Test User",
        role: "MAIN_OFFICER",
        organizationId: "org-1",
        totpEnabled: false,
      },
    });

    const request1 = new Request("http://localhost:3000/api/assets");
    const result1 = await requireSessionWithOrg(request1);

    const request2 = new Request("http://localhost:3000/api/vulnerabilities");
    const result2 = await requireSessionWithOrg(request2);

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);

    if (result1.ok && result2.ok) {
      expect(result1.context.organizationId).toBe(
        result2.context.organizationId
      );
    }
  });

  it("does not leak organization ID in error responses", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/assets");
    const result = await requireSessionWithOrg(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const body = await result.response.json();
      expect(body.error).toBe("Unauthorized");
      // Should not contain any organization information
      expect(JSON.stringify(body)).not.toContain("org");
    }
  });
});
