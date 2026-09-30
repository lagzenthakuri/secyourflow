import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

/**
 * RBAC authorization tests.
 *
 * Tests the role-based access control implementation in api-auth.ts.
 * Verifies that roles are correctly enforced for different operations.
 */

const mockAuth = vi.fn();
const mockIsTwoFactorSatisfied = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/security/two-factor", () => ({
  isTwoFactorSatisfied: mockIsTwoFactorSatisfied,
}));

import {
  requireSessionWithOrg,
  requireMainOfficer,
  isAdminTokenAuthorized,
  ROLE_ALL,
  ROLE_VULNERABILITY_WRITE,
  ROLE_VULNERABILITY_DELETE,
} from "@/lib/api-auth";

describe("RBAC role definitions", () => {
  it("includes all four roles in ROLE_ALL", () => {
    expect(ROLE_ALL).toContain("MAIN_OFFICER");
    expect(ROLE_ALL).toContain("IT_OFFICER");
    expect(ROLE_ALL).toContain("PENTESTER");
    expect(ROLE_ALL).toContain("ANALYST");
  });

  it("restricts vulnerability write to non-analyst roles", () => {
    expect(ROLE_VULNERABILITY_WRITE).toContain("MAIN_OFFICER");
    expect(ROLE_VULNERABILITY_WRITE).toContain("IT_OFFICER");
    expect(ROLE_VULNERABILITY_WRITE).toContain("PENTESTER");
    expect(ROLE_VULNERABILITY_WRITE).not.toContain("ANALYST");
  });

  it("restricts vulnerability delete to MAIN_OFFICER and IT_OFFICER only", () => {
    expect(ROLE_VULNERABILITY_DELETE).toContain("MAIN_OFFICER");
    expect(ROLE_VULNERABILITY_DELETE).toContain("IT_OFFICER");
    expect(ROLE_VULNERABILITY_DELETE).not.toContain("PENTESTER");
    expect(ROLE_VULNERABILITY_DELETE).not.toContain("ANALYST");
  });
});

describe("requireSessionWithOrg", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsTwoFactorSatisfied.mockReturnValue(true);
  });

  it("rejects unauthenticated requests with 401", async () => {
    mockAuth.mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/test");
    const result = await requireSessionWithOrg(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("rejects when user has no organization with 403", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        organizationId: null,
        role: "MAIN_OFFICER",
      },
    });

    const request = new Request("http://localhost:3000/api/test");
    const result = await requireSessionWithOrg(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("rejects when 2FA is not satisfied with 403", async () => {
    mockIsTwoFactorSatisfied.mockReturnValue(false);
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        organizationId: "org-1",
        role: "MAIN_OFFICER",
      },
    });

    const request = new Request("http://localhost:3000/api/test");
    const result = await requireSessionWithOrg(request);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("rejects when role is not in allowedRoles with 403", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        organizationId: "org-1",
        role: "ANALYST",
      },
    });

    const request = new Request("http://localhost:3000/api/test");
    const result = await requireSessionWithOrg(request, {
      allowedRoles: ["MAIN_OFFICER"],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("allows access when all conditions are met", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        organizationId: "org-1",
        role: "MAIN_OFFICER",
      },
    });

    const request = new Request("http://localhost:3000/api/test");
    const result = await requireSessionWithOrg(request);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.userId).toBe("user-1");
      expect(result.context.organizationId).toBe("org-1");
      expect(result.context.role).toBe("MAIN_OFFICER");
    }
  });

  it("defaults role to ANALYST when not provided", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        organizationId: "org-1",
        role: null,
      },
    });

    const request = new Request("http://localhost:3000/api/test");
    const result = await requireSessionWithOrg(request);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.role).toBe("ANALYST");
    }
  });
});

describe("requireMainOfficer", () => {
  it("returns null for MAIN_OFFICER role", () => {
    const result = requireMainOfficer("MAIN_OFFICER");
    expect(result).toBeNull();
  });

  it("returns 403 response for non-MAIN_OFFICER roles", () => {
    for (const role of ["IT_OFFICER", "PENTESTER", "ANALYST"]) {
      const result = requireMainOfficer(role);
      expect(result).not.toBeNull();
      expect(result?.status).toBe(403);
    }
  });
});

describe("isAdminTokenAuthorized", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns false when ADMIN_API_TOKEN is not set", () => {
    delete process.env.ADMIN_API_TOKEN;
    const request = new Request("http://localhost:3000/api/test", {
      headers: { authorization: "Bearer some-token" },
    });
    expect(isAdminTokenAuthorized(request)).toBe(false);
  });

  it("returns false when authorization header is missing", () => {
    process.env.ADMIN_API_TOKEN = "test-admin-token";
    const request = new Request("http://localhost:3000/api/test");
    expect(isAdminTokenAuthorized(request)).toBe(false);
  });

  it("returns false when token does not match", () => {
    process.env.ADMIN_API_TOKEN = "test-admin-token";
    const request = new Request("http://localhost:3000/api/test", {
      headers: { authorization: "Bearer wrong-token" },
    });
    expect(isAdminTokenAuthorized(request)).toBe(false);
  });

  it("returns true when token matches", () => {
    process.env.ADMIN_API_TOKEN = "test-admin-token";
    const request = new Request("http://localhost:3000/api/test", {
      headers: { authorization: "Bearer test-admin-token" },
    });
    expect(isAdminTokenAuthorized(request)).toBe(true);
  });

  it("uses constant-time comparison (does not throw on length mismatch)", () => {
    process.env.ADMIN_API_TOKEN = "short";
    const request = new Request("http://localhost:3000/api/test", {
      headers: { authorization: "Bearer a-very-long-token-value" },
    });
    expect(isAdminTokenAuthorized(request)).toBe(false);
  });
});
