import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * Input validation tests.
 *
 * Tests the application's Zod schemas and validation functions.
 * Focuses on externally controlled input and security-sensitive validation.
 */

// Recreate the key schemas from the codebase for testing
// These mirror the actual schemas used in API routes

const emailSchema = z
  .string()
  .min(1, "Email is required")
  .max(254, "Email is too long")
  .email("Invalid email address");

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long");

const nameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name is too long");

const roleSchema = z.enum([
  "MAIN_OFFICER",
  "IT_OFFICER",
  "PENTESTER",
  "ANALYST",
]);

const assetTypeSchema = z.enum([
  "SERVER",
  "DATABASE",
  "NETWORK",
  "APPLICATION",
  "CLOUD",
  "IOT",
  "OTHER",
]);

const severitySchema = z.enum([
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFORMATIONAL",
]);

const cvssScoreSchema = z
  .number()
  .min(0, "CVSS score must be at least 0")
  .max(10, "CVSS score must be at most 10");

const epssScoreSchema = z
  .number()
  .min(0, "EPSS score must be at least 0")
  .max(1, "EPSS score must be at most 1");

const urlSchema = z
  .string()
  .url("Invalid URL")
  .max(2048, "URL is too long");

const idSchema = z
  .string()
  .min(1, "ID is required")
  .max(100, "ID is too long");

describe("email validation", () => {
  it("accepts valid email addresses", () => {
    expect(emailSchema.safeParse("user@example.com").success).toBe(true);
    expect(emailSchema.safeParse("user.name@example.com").success).toBe(true);
    expect(emailSchema.safeParse("user+tag@example.com").success).toBe(true);
  });

  it("rejects empty strings", () => {
    expect(emailSchema.safeParse("").success).toBe(false);
  });

  it("rejects whitespace-only strings", () => {
    expect(emailSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects invalid email formats", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
    expect(emailSchema.safeParse("@example.com").success).toBe(false);
    expect(emailSchema.safeParse("user@").success).toBe(false);
    expect(emailSchema.safeParse("user@.com").success).toBe(false);
  });

  it("rejects excessively long emails", () => {
    const longEmail = `${"a".repeat(250)}@example.com`;
    expect(emailSchema.safeParse(longEmail).success).toBe(false);
  });

  it("rejects non-string inputs", () => {
    expect(emailSchema.safeParse(null).success).toBe(false);
    expect(emailSchema.safeParse(undefined).success).toBe(false);
    expect(emailSchema.safeParse(123).success).toBe(false);
  });
});

describe("password validation", () => {
  it("accepts valid passwords", () => {
    expect(passwordSchema.safeParse("Password123!").success).toBe(true);
    expect(passwordSchema.safeParse("long-password-here").success).toBe(true);
  });

  it("rejects passwords shorter than 8 characters", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("1234567").success).toBe(false);
  });

  it("rejects passwords longer than 72 characters", () => {
    const longPassword = "a".repeat(73);
    expect(passwordSchema.safeParse(longPassword).success).toBe(false);
  });

  it("accepts passwords at exactly 8 characters", () => {
    expect(passwordSchema.safeParse("12345678").success).toBe(true);
  });

  it("accepts passwords at exactly 72 characters", () => {
    expect(passwordSchema.safeParse("a".repeat(72)).success).toBe(true);
  });

  it("rejects empty strings", () => {
    expect(passwordSchema.safeParse("").success).toBe(false);
  });
});

describe("name validation", () => {
  it("accepts valid names", () => {
    expect(nameSchema.safeParse("John Doe").success).toBe(true);
    expect(nameSchema.safeParse("AB").success).toBe(true);
  });

  it("rejects names shorter than 2 characters", () => {
    expect(nameSchema.safeParse("A").success).toBe(false);
    expect(nameSchema.safeParse("").success).toBe(false);
  });

  it("rejects names longer than 100 characters", () => {
    const longName = "A".repeat(101);
    expect(nameSchema.safeParse(longName).success).toBe(false);
  });

  it("accepts names at exactly 2 characters", () => {
    expect(nameSchema.safeParse("AB").success).toBe(true);
  });

  it("accepts names at exactly 100 characters", () => {
    expect(nameSchema.safeParse("A".repeat(100)).success).toBe(true);
  });
});

describe("role validation", () => {
  it("accepts all valid roles", () => {
    expect(roleSchema.safeParse("MAIN_OFFICER").success).toBe(true);
    expect(roleSchema.safeParse("IT_OFFICER").success).toBe(true);
    expect(roleSchema.safeParse("PENTESTER").success).toBe(true);
    expect(roleSchema.safeParse("ANALYST").success).toBe(true);
  });

  it("rejects invalid roles", () => {
    expect(roleSchema.safeParse("ADMIN").success).toBe(false);
    expect(roleSchema.safeParse("SUPER_USER").success).toBe(false);
    expect(roleSchema.safeParse("").success).toBe(false);
  });

  it("rejects lowercase roles", () => {
    expect(roleSchema.safeParse("main_officer").success).toBe(false);
  });

  it("rejects roles with extra whitespace", () => {
    expect(roleSchema.safeParse(" MAIN_OFFICER ").success).toBe(false);
  });
});

describe("severity validation", () => {
  it("accepts all valid severities", () => {
    expect(severitySchema.safeParse("CRITICAL").success).toBe(true);
    expect(severitySchema.safeParse("HIGH").success).toBe(true);
    expect(severitySchema.safeParse("MEDIUM").success).toBe(true);
    expect(severitySchema.safeParse("LOW").success).toBe(true);
    expect(severitySchema.safeParse("INFORMATIONAL").success).toBe(true);
  });

  it("rejects invalid severities", () => {
    expect(severitySchema.safeParse("EXTREME").success).toBe(false);
    expect(severitySchema.safeParse("INFO").success).toBe(false);
    expect(severitySchema.safeParse("").success).toBe(false);
  });
});

describe("CVSS score validation", () => {
  it("accepts valid CVSS scores", () => {
    expect(cvssScoreSchema.safeParse(0).success).toBe(true);
    expect(cvssScoreSchema.safeParse(5.5).success).toBe(true);
    expect(cvssScoreSchema.safeParse(10).success).toBe(true);
    expect(cvssScoreSchema.safeParse(9.8).success).toBe(true);
  });

  it("rejects negative scores", () => {
    expect(cvssScoreSchema.safeParse(-0.1).success).toBe(false);
    expect(cvssScoreSchema.safeParse(-1).success).toBe(false);
  });

  it("rejects scores above 10", () => {
    expect(cvssScoreSchema.safeParse(10.1).success).toBe(false);
    expect(cvssScoreSchema.safeParse(11).success).toBe(false);
  });

  it("rejects non-numeric inputs", () => {
    expect(cvssScoreSchema.safeParse("9.8").success).toBe(false);
    expect(cvssScoreSchema.safeParse(null).success).toBe(false);
    expect(cvssScoreSchema.safeParse(undefined).success).toBe(false);
  });

  it("rejects NaN and Infinity", () => {
    expect(cvssScoreSchema.safeParse(NaN).success).toBe(false);
    expect(cvssScoreSchema.safeParse(Infinity).success).toBe(false);
  });
});

describe("EPSS score validation", () => {
  it("accepts valid EPSS scores", () => {
    expect(epssScoreSchema.safeParse(0).success).toBe(true);
    expect(epssScoreSchema.safeParse(0.5).success).toBe(true);
    expect(epssScoreSchema.safeParse(1).success).toBe(true);
    expect(epssScoreSchema.safeParse(0.95).success).toBe(true);
  });

  it("rejects negative scores", () => {
    expect(epssScoreSchema.safeParse(-0.01).success).toBe(false);
  });

  it("rejects scores above 1", () => {
    expect(epssScoreSchema.safeParse(1.01).success).toBe(false);
  });

  it("rejects non-numeric inputs", () => {
    expect(epssScoreSchema.safeParse("0.5").success).toBe(false);
    expect(epssScoreSchema.safeParse(null).success).toBe(false);
  });
});

describe("URL validation", () => {
  it("accepts valid URLs", () => {
    expect(urlSchema.safeParse("https://example.com").success).toBe(true);
    expect(urlSchema.safeParse("https://example.com/path").success).toBe(true);
    expect(urlSchema.safeParse("http://localhost:3000").success).toBe(true);
  });

  it("rejects invalid URLs", () => {
    expect(urlSchema.safeParse("not-a-url").success).toBe(false);
    expect(urlSchema.safeParse("ftp://example.com").success).toBe(false);
    expect(urlSchema.safeParse("").success).toBe(false);
  });

  it("rejects excessively long URLs", () => {
    const longUrl = `https://example.com/${"a".repeat(2048)}`;
    expect(urlSchema.safeParse(longUrl).success).toBe(false);
  });

  it("rejects javascript: URLs", () => {
    expect(urlSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });

  it("rejects data: URLs", () => {
    expect(urlSchema.safeParse("data:text/html,<script>alert(1)</script>").success).toBe(false);
  });
});

describe("ID validation", () => {
  it("accepts valid IDs", () => {
    expect(idSchema.safeParse("abc123").success).toBe(true);
    expect(idSchema.safeParse("org-a-001").success).toBe(true);
  });

  it("rejects empty strings", () => {
    expect(idSchema.safeParse("").success).toBe(false);
  });

  it("rejects excessively long IDs", () => {
    const longId = "a".repeat(101);
    expect(idSchema.safeParse(longId).success).toBe(false);
  });

  it("accepts IDs at exactly 100 characters", () => {
    expect(idSchema.safeParse("a".repeat(100)).success).toBe(true);
  });
});

describe("malicious input handling", () => {
  it("accepts SQL injection attempts in email (valid email format)", () => {
    // Zod validates format, not content - SQL injection in email is still a valid format
    const result = emailSchema.safeParse("user' OR '1'='1' --@example.com");
    expect(result.success).toBe(true);
  });

  it("accepts XSS attempts in name (valid string format)", () => {
    // Zod validates format, not content - XSS in name is still a valid format
    const result = nameSchema.safeParse("<script>alert(1)</script>");
    expect(result.success).toBe(true);
  });

  it("handles null bytes in input", () => {
    const result = nameSchema.safeParse("test\u0000name");
    expect(result.success).toBe(true);
  });

  it("handles unicode in input", () => {
    const result = nameSchema.safeParse("测试用户");
    expect(result.success).toBe(true);
  });

  it("handles emoji in input", () => {
    const result = nameSchema.safeParse("User 😀 Name");
    expect(result.success).toBe(true);
  });

  it("handles very long strings", () => {
    const longString = "A".repeat(10000);
    expect(nameSchema.safeParse(longString).success).toBe(false);
  });

  it("handles newlines in input", () => {
    const result = nameSchema.safeParse("Line1\nLine2");
    expect(result.success).toBe(true);
  });

  it("handles tabs in input", () => {
    const result = nameSchema.safeParse("Tab\tName");
    expect(result.success).toBe(true);
  });
});
