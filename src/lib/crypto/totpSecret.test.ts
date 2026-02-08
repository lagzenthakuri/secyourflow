import { beforeEach, describe, expect, it } from "vitest";
import { decryptTotpSecret, encryptTotpSecret } from "@/lib/crypto/totpSecret";

describe("totp secret encryption", () => {
    beforeEach(() => {
        process.env.TOTP_ENCRYPTION_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    });

    it("encrypts and decrypts secrets round-trip", () => {
        const plaintext = "JBSWY3DPEHPK3PXP";
        const encrypted = encryptTotpSecret(plaintext);

        expect(encrypted).not.toContain(plaintext);
        expect(decryptTotpSecret(encrypted)).toBe(plaintext);
    });
});
