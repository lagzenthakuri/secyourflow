import { describe, expect, it } from "vitest";
import { canOAuthSignIn, isPublicRegistrationEnabled } from "@/lib/auth/registration-policy";

describe("public registration policy", () => {
  it("requires an explicit true flag", () => {
    expect(isPublicRegistrationEnabled("true")).toBe(true);
    expect(isPublicRegistrationEnabled(undefined)).toBe(false);
    expect(isPublicRegistrationEnabled("false")).toBe(false);
    expect(isPublicRegistrationEnabled("TRUE")).toBe(false);
  });

  it("keeps existing OAuth accounts usable when new registration is closed", () => {
    expect(canOAuthSignIn(false, true)).toBe(true);
    expect(canOAuthSignIn(false, false)).toBe(false);
    expect(canOAuthSignIn(true, false)).toBe(true);
  });
});
