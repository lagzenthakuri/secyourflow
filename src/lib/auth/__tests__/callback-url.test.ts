import { describe, expect, it } from "vitest";
import { getSafeCallbackUrl } from "@/lib/auth/callback-url";

describe("getSafeCallbackUrl", () => {
  const origin = "https://secyourflow.example";

  it("preserves same-origin paths with query strings", () => {
    expect(getSafeCallbackUrl("/policies?tab=active", origin)).toBe("/policies?tab=active");
  });

  it.each(["//evil.example", "/\\evil.example", "https://evil.example", "/\n//evil.example"])(
    "rejects unsafe callback URL %s",
    (callbackUrl) => {
      expect(getSafeCallbackUrl(callbackUrl, origin)).toBe("/dashboard");
    },
  );
});
