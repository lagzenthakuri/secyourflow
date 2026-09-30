import type { NextAuthConfig } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFindUnique, captureConfig } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  captureConfig: vi.fn(),
}));

vi.mock("next-auth", () => ({
  default: (config: NextAuthConfig) => {
    captureConfig(config);
    return {};
  },
  CredentialsSignin: class extends Error {},
}));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: () => ({}) }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mockFindUnique } },
}));
vi.mock("@/lib/database-availability", () => ({
  clearDatabaseUnavailable: vi.fn(),
  isDatabaseUnavailableError: vi.fn(() => false),
  markDatabaseUnavailable: vi.fn(() => true),
}));
vi.mock("@/lib/user-provisioning", () => ({ activateUserSession: vi.fn() }));

import "@/lib/auth";

const config = captureConfig.mock.calls[0][0] as NextAuthConfig;
const jwt = config.callbacks?.jwt;
if (!jwt) {
  throw new Error("The authentication JWT callback must be configured");
}
const validateSession = () =>
  jwt({
    token: { id: "user-1", activeSessionId: "matching-session-id" },
  } as Parameters<typeof jwt>[0]);

describe("session validation", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
  });

  it("rejects when the user no longer exists", async () => {
    mockFindUnique.mockResolvedValue(null);
    expect(await validateSession()).toBeNull();
  });

  it("rejects when the database has no active session", async () => {
    mockFindUnique.mockResolvedValue({ activeSessionId: null });
    expect(await validateSession()).toBeNull();
  });

  it("rejects when the session ID does not match", async () => {
    mockFindUnique.mockResolvedValue({
      activeSessionId: "different-session-id",
    });
    expect(await validateSession()).toBeNull();
  });

  it("preserves missing organization for the API authorization gate to reject", async () => {
    mockFindUnique.mockResolvedValue({
      activeSessionId: "matching-session-id",
      organizationId: null,
      role: "ANALYST",
    });
    expect(await validateSession()).toMatchObject({ organizationId: null });
  });

  it("queries the token user and refreshes their organization and role", async () => {
    mockFindUnique.mockResolvedValue({
      activeSessionId: "matching-session-id",
      organizationId: "org-1",
      role: "MAIN_OFFICER",
    });
    expect(await validateSession()).toMatchObject({
      organizationId: "org-1",
      role: "MAIN_OFFICER",
    });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { activeSessionId: true, organizationId: true, role: true },
    });
  });
});
