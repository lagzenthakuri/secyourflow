import { describe, expect, it } from "vitest";
import { generateTotpSecret, generateTotpToken, verifyTotpToken } from "@/lib/security/totp";

describe("totp verification", () => {
    it("accepts valid TOTP and rejects invalid ones", () => {
        const now = new Date("2026-02-08T12:00:00.000Z").getTime();
        const secret = generateTotpSecret();
        const validCode = generateTotpToken(secret, now);

        expect(verifyTotpToken(secret, validCode, null, now).valid).toBe(true);
        expect(verifyTotpToken(secret, "000000", null, now).valid).toBe(false);
    });

    it("rejects reused steps (replay protection)", () => {
        const now = new Date("2026-02-08T12:00:00.000Z").getTime();
        const secret = generateTotpSecret();
        const code = generateTotpToken(secret, now);
        const firstResult = verifyTotpToken(secret, code, null, now);

        expect(firstResult.valid).toBe(true);
        if (!firstResult.valid) {
            return;
        }

        const secondResult = verifyTotpToken(secret, code, firstResult.matchedStep, now);
        expect(secondResult).toEqual({ valid: false, reason: "replay" });
    });
});
