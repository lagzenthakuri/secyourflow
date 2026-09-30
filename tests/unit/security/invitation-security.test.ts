import { describe, expect, it } from "vitest";

/**
 * Invitation security tests.
 *
 * Tests the invitation token generation, validation, and expiration logic.
 * These are security-critical functions that protect the invitation flow.
 */

import {
  generateInvitationToken,
  getInvitationExpiry,
  isInvitationExpired,
  isInvitationUsed,
  isValidInvitationTokenFormat,
} from "@/lib/invitation-utils";

describe("generateInvitationToken", () => {
  it("generates a token with sufficient entropy", () => {
    const token = generateInvitationToken();
    // 32 bytes base64url encoded = ~43 characters
    expect(token.length).toBeGreaterThanOrEqual(43);
  });

  it("generates unique tokens", () => {
    const tokens = new Set(
      Array.from({ length: 100 }, () => generateInvitationToken())
    );
    expect(tokens.size).toBe(100);
  });

  it("only uses base64url characters", () => {
    const token = generateInvitationToken();
    expect(token).toMatch(BASE64URL_PATTERN);
  });

  it("does not contain padding characters", () => {
    const token = generateInvitationToken();
    expect(token).not.toContain("=");
  });
});

describe("getInvitationExpiry", () => {
  it("defaults to 48 hours from now", () => {
    const before = new Date();
    const expiry = getInvitationExpiry();
    const after = new Date();

    const expectedMin = new Date(before.getTime() + 48 * 60 * 60 * 1000);
    const expectedMax = new Date(after.getTime() + 48 * 60 * 60 * 1000);

    expect(expiry.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
    expect(expiry.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
  });

  it("accepts custom hours", () => {
    const before = new Date();
    const expiry = getInvitationExpiry(24);
    const after = new Date();

    const expectedMin = new Date(before.getTime() + 24 * 60 * 60 * 1000);
    const expectedMax = new Date(after.getTime() + 24 * 60 * 60 * 1000);

    expect(expiry.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
    expect(expiry.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
  });

  it("accepts 1 hour minimum", () => {
    const expiry = getInvitationExpiry(1);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    expect(diff).toBeGreaterThan(0);
    expect(diff).toBeLessThanOrEqual(60 * 60 * 1000 + 1000);
  });

  it("accepts 168 hours (7 days) maximum", () => {
    const expiry = getInvitationExpiry(168);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    expect(diff).toBeGreaterThan(0);
    expect(diff).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000 + 1000);
  });
});

describe("isInvitationExpired", () => {
  it("returns false for future dates", () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(isInvitationExpired(future)).toBe(false);
  });

  it("returns true for past dates", () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(isInvitationExpired(past)).toBe(true);
  });

  it("returns false for current time (not yet expired)", () => {
    const now = new Date();
    // At the exact same millisecond, it should not be expired (uses > not >=)
    expect(isInvitationExpired(now)).toBe(false);
  });

  it("returns true for dates just in the past", () => {
    const justPast = new Date(Date.now() - 1);
    expect(isInvitationExpired(justPast)).toBe(true);
  });
});

describe("isInvitationUsed", () => {
  it("returns false when usedAt is null", () => {
    expect(isInvitationUsed(null)).toBe(false);
  });

  it("returns true when usedAt is set", () => {
    expect(isInvitationUsed(new Date())).toBe(true);
  });

  it("returns true even for past usedAt dates", () => {
    expect(
      isInvitationUsed(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
    ).toBe(true);
  });
});

describe("isValidInvitationTokenFormat", () => {
  it("accepts valid base64url tokens", () => {
    expect(
      isValidInvitationTokenFormat(
        "aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890AbCdEfGhIj"
      )
    ).toBe(true);
  });

  it("rejects tokens that are too short", () => {
    expect(isValidInvitationTokenFormat("short")).toBe(false);
    expect(isValidInvitationTokenFormat("")).toBe(false);
  });

  it("rejects tokens with invalid characters", () => {
    expect(
      isValidInvitationTokenFormat("aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890Ab!")
    ).toBe(false);
    expect(
      isValidInvitationTokenFormat("aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890Ab@")
    ).toBe(false);
    expect(
      isValidInvitationTokenFormat("aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890Ab#")
    ).toBe(false);
  });

  it("rejects non-string inputs", () => {
    expect(isValidInvitationTokenFormat(null as unknown as string)).toBe(false);
    expect(isValidInvitationTokenFormat(undefined as unknown as string)).toBe(
      false
    );
    expect(isValidInvitationTokenFormat(123 as unknown as string)).toBe(false);
  });

  it("rejects tokens with padding", () => {
    expect(
      isValidInvitationTokenFormat("aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890Ab=")
    ).toBe(false);
  });

  it("accepts tokens with hyphens and underscores", () => {
    expect(
      isValidInvitationTokenFormat(
        "aBc-DeFg_HiJkLmNoPqRsTuVwXyZ1234567890AbCdEfGhIj"
      )
    ).toBe(true);
  });

  it("rejects tokens at exactly 42 characters (below minimum)", () => {
    const token = "a".repeat(42);
    expect(isValidInvitationTokenFormat(token)).toBe(false);
  });

  it("accepts tokens at exactly 43 characters (minimum)", () => {
    const token = "a".repeat(43);
    expect(isValidInvitationTokenFormat(token)).toBe(true);
  });
});

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
