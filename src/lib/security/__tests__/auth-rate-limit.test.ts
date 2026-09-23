import { beforeEach, describe, expect, it, vi } from "vitest";

const consumeRateLimit = vi.hoisted(() => vi.fn());

vi.mock("@/lib/security/rate-limit", () => ({
    consumeRateLimit,
}));

import { consumeAuthRateLimit } from "@/lib/security/auth-rate-limit";

beforeEach(() => {
    consumeRateLimit.mockReset();
});

describe("consumeAuthRateLimit", () => {
    it("normalizes the email key and checks both IP and email limits", async () => {
        consumeRateLimit
            .mockResolvedValueOnce({ allowed: true, remaining: 9 })
            .mockResolvedValueOnce({ allowed: true, remaining: 4 });

        await expect(
            consumeAuthRateLimit("registration", {
                ipAddress: "192.0.2.10",
                email: " User@Example.COM ",
            }),
        ).resolves.toEqual({ allowed: true });

        expect(consumeRateLimit).toHaveBeenNthCalledWith(
            1,
            "auth:registration:ip:192.0.2.10",
            10,
            600_000,
        );
        expect(consumeRateLimit).toHaveBeenNthCalledWith(
            2,
            "auth:registration:email:user@example.com",
            3,
            600_000,
        );
    });

    it("returns the IP retry window without consuming an email bucket", async () => {
        consumeRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 42 });

        await expect(
            consumeAuthRateLimit("credentials", {
                ipAddress: "192.0.2.10",
                email: "user@example.com",
            }),
        ).resolves.toEqual({
            allowed: false,
            retryAfterSeconds: 42,
            scope: "ip",
        });

        expect(consumeRateLimit).toHaveBeenCalledTimes(1);
    });

    it("supports IP-only limiting when no email is available", async () => {
        consumeRateLimit.mockResolvedValueOnce({ allowed: true, remaining: 9 });

        await expect(
            consumeAuthRateLimit("credentials", {
                ipAddress: null,
                email: null,
            }),
        ).resolves.toEqual({ allowed: true });

        expect(consumeRateLimit).toHaveBeenCalledWith(
            "auth:credentials:ip:unknown",
            10,
            600_000,
        );
    });
});
