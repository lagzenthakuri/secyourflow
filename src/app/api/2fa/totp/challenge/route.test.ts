import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
    authMock,
    updateMock,
    challengeTotpMock,
    consumeRateLimitMock,
    resetRateLimitMock,
} = vi.hoisted(() => ({
    authMock: vi.fn(),
    updateMock: vi.fn(),
    challengeTotpMock: vi.fn(),
    consumeRateLimitMock: vi.fn(),
    resetRateLimitMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    auth: authMock,
    unstable_update: updateMock,
}));

vi.mock("@/lib/security/csrf", () => ({
    hasTrustedOrigin: () => true,
}));

vi.mock("@/lib/security/rate-limit", () => ({
    consumeRateLimit: consumeRateLimitMock,
    resetRateLimit: resetRateLimitMock,
}));

vi.mock("@/lib/security/prisma-totp-store", () => ({
    prismaTotpStore: {},
}));

vi.mock("@/lib/security/totp-service", async () => {
    const actual = await vi.importActual<typeof import("@/lib/security/totp-service")>("@/lib/security/totp-service");
    return {
        ...actual,
        challengeTotp: challengeTotpMock,
    };
});

import { POST } from "@/app/api/2fa/totp/challenge/route";

describe("challenge route", () => {
    beforeEach(() => {
        authMock.mockReset();
        updateMock.mockReset();
        challengeTotpMock.mockReset();
        consumeRateLimitMock.mockReset();
        resetRateLimitMock.mockReset();
    });

    it("marks session as twoFactorVerified=true on successful challenge", async () => {
        authMock.mockResolvedValue({
            user: { id: "user-1", totpEnabled: true },
            twoFactorVerified: false,
        });
        consumeRateLimitMock.mockReturnValue({ allowed: true, remaining: 7 });
        challengeTotpMock.mockResolvedValue({
            usedRecoveryCode: false,
            recoveryCodesRemaining: 9,
        });

        const request = new NextRequest("http://localhost:3000/api/2fa/totp/challenge", {
            method: "POST",
            headers: {
                origin: "http://localhost:3000",
                "content-type": "application/json",
            },
            body: JSON.stringify({ code: "123456" }),
        });

        const response = await POST(request);
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.success).toBe(true);
        expect(payload.twoFactorVerified).toBe(true);
        expect(updateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                twoFactorVerified: true,
            }),
        );
    });
});
