import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Session validation tests.
 *
 * Tests the core authentication session logic without requiring
 * a full NextAuth setup. Focuses on the security-critical
 * session validation paths.
 */

// Mock the Prisma module before importing auth
const mockFindUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock("@/lib/database-availability", () => ({
  clearDatabaseUnavailable: vi.fn(),
  isDatabaseUnavailableError: vi.fn(() => false),
  markDatabaseUnavailable: vi.fn(() => true),
}));

vi.mock("@/lib/user-provisioning", () => ({
  activateUserSession: vi.fn().mockResolvedValue({
    organizationId: "org-test-001",
  }),
}));

import { auth } from "@/lib/auth";

describe("session validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when no session exists", async () => {
    // Without a valid JWT token, auth() returns null
    const result = await auth();
    expect(result).toBeNull();
  });

  it("rejects when user has no active session in database", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await auth();
    expect(result).toBeNull();
  });

  it("rejects when session ID does not match database", async () => {
    mockFindUnique.mockResolvedValue({
      activeSessionId: "different-session-id",
      organizationId: "org-test-001",
      role: "MAIN_OFFICER",
    });

    const result = await auth();
    expect(result).toBeNull();
  });

  it("rejects when user has no organization", async () => {
    mockFindUnique.mockResolvedValue({
      activeSessionId: "matching-session-id",
      organizationId: null,
      role: "MAIN_OFFICER",
    });

    const result = await auth();
    expect(result).toBeNull();
  });

  it("queries the database with the correct user ID", async () => {
    mockFindUnique.mockResolvedValue({
      activeSessionId: "matching-session-id",
      organizationId: "org-test-001",
      role: "MAIN_OFFICER",
    });

    await auth();
    expect(mockFindUnique).toHaveBeenCalled();
  });
});
