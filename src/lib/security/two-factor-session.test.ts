import { afterEach, describe, expect, it } from "vitest";
import {
    assertTwoFactorSessionUpdateKeyConfigured,
    buildTrustedTwoFactorSessionUpdate,
    isTrustedTwoFactorSessionUpdate,
} from "./two-factor-session";

const originalTwoFactorKey = process.env.TWO_FACTOR_SESSION_UPDATE_KEY;
const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;
const originalTotpKey = process.env.TOTP_ENCRYPTION_KEY;

function resetEnv() {
    if (originalTwoFactorKey === undefined) {
        delete process.env.TWO_FACTOR_SESSION_UPDATE_KEY;
    } else {
        process.env.TWO_FACTOR_SESSION_UPDATE_KEY = originalTwoFactorKey;
    }

    if (originalNextAuthSecret === undefined) {
        delete process.env.NEXTAUTH_SECRET;
    } else {
        process.env.NEXTAUTH_SECRET = originalNextAuthSecret;
    }

    if (originalTotpKey === undefined) {
        delete process.env.TOTP_ENCRYPTION_KEY;
    } else {
        process.env.TOTP_ENCRYPTION_KEY = originalTotpKey;
    }
}

afterEach(() => {
    resetEnv();
});

describe("two-factor-session", () => {
    it("builds trusted payload with explicit TWO_FACTOR_SESSION_UPDATE_KEY", () => {
        process.env.TWO_FACTOR_SESSION_UPDATE_KEY = "trusted-key";
        process.env.NEXTAUTH_SECRET = "";
        process.env.TOTP_ENCRYPTION_KEY = "";

        const payload = buildTrustedTwoFactorSessionUpdate({
            twoFactorVerified: true,
            twoFactorVerifiedAt: 1234567890,
            user: { totpEnabled: true },
        });

        expect(payload.__twoFactorSessionUpdateKey).toBe("trusted-key");
        expect(isTrustedTwoFactorSessionUpdate(payload)).toBe(true);
    });

    it("uses NEXTAUTH_SECRET fallback when explicit key is absent", () => {
        delete process.env.TWO_FACTOR_SESSION_UPDATE_KEY;
        process.env.NEXTAUTH_SECRET = "nextauth-secret";
        process.env.TOTP_ENCRYPTION_KEY = "";

        const payload = buildTrustedTwoFactorSessionUpdate({
            twoFactorVerified: true,
        });

        expect(payload.__twoFactorSessionUpdateKey).toBe("nextauth-secret");
        expect(isTrustedTwoFactorSessionUpdate(payload)).toBe(true);
        expect(
            isTrustedTwoFactorSessionUpdate({
                ...payload,
                __twoFactorSessionUpdateKey: "forged",
            }),
        ).toBe(false);
    });

    it("throws when no session update key material is configured", () => {
        delete process.env.TWO_FACTOR_SESSION_UPDATE_KEY;
        delete process.env.NEXTAUTH_SECRET;
        delete process.env.TOTP_ENCRYPTION_KEY;

        expect(() => assertTwoFactorSessionUpdateKeyConfigured()).toThrow();
        expect(() =>
            buildTrustedTwoFactorSessionUpdate({
                twoFactorVerified: true,
            }),
        ).toThrow();
        expect(
            isTrustedTwoFactorSessionUpdate({
                __twoFactorSessionUpdateKey: "any",
            }),
        ).toBe(false);
    });
});
