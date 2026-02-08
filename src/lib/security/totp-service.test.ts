import { beforeEach, describe, expect, it } from "vitest";
import { generateTotpToken } from "@/lib/security/totp";
import {
    TotpServiceError,
    TotpUserRecord,
    TotpUserStore,
    challengeTotp,
    enrollTotp,
    getTotpStatus,
    verifyTotpEnrollment,
} from "@/lib/security/totp-service";

class InMemoryTotpStore implements TotpUserStore {
    private users: Record<string, TotpUserRecord>;

    constructor(users: TotpUserRecord[]) {
        this.users = Object.fromEntries(users.map((user) => [user.id, user]));
    }

    async getById(userId: string): Promise<TotpUserRecord | null> {
        return this.users[userId] ?? null;
    }

    async updateById(userId: string, data: Partial<TotpUserRecord>): Promise<TotpUserRecord> {
        const existing = this.users[userId];
        if (!existing) {
            throw new Error("User not found");
        }

        const updated = {
            ...existing,
            ...data,
        } as TotpUserRecord;
        this.users[userId] = updated;
        return updated;
    }
}

function createUser(): TotpUserRecord {
    return {
        id: "user-1",
        email: "smoke@example.com",
        totpEnabled: false,
        totpSecretEnc: null,
        totpVerifiedAt: null,
        totpRecoveryCodesHash: null,
        totpLastUsedStep: null,
    };
}

describe("totp service integration", () => {
    beforeEach(() => {
        process.env.TOTP_ENCRYPTION_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    });

    it("enrolls then verifies and enables totp", async () => {
        const now = new Date("2026-02-08T12:00:00.000Z").getTime();
        const store = new InMemoryTotpStore([createUser()]);

        const enrollment = await enrollTotp({
            store,
            userId: "user-1",
            issuer: "SecYourFlow",
        });

        const code = generateTotpToken(enrollment.secret, now);
        const verifyResult = await verifyTotpEnrollment({
            store,
            userId: "user-1",
            code,
            nowMs: now,
        });

        expect(verifyResult.recoveryCodes).toHaveLength(10);

        const status = await getTotpStatus({ store, userId: "user-1" });
        expect(status.enabled).toBe(true);
        expect(status.recoveryCodesRemaining).toBe(10);
    });

    it("completes challenge once and blocks replay on the same step", async () => {
        const now = new Date("2026-02-08T12:00:00.000Z").getTime();
        const store = new InMemoryTotpStore([createUser()]);

        const enrollment = await enrollTotp({ store, userId: "user-1" });
        const verifyCode = generateTotpToken(enrollment.secret, now);
        await verifyTotpEnrollment({
            store,
            userId: "user-1",
            code: verifyCode,
            nowMs: now,
        });

        const nextStepTime = now + 30_000;
        const challengeCode = generateTotpToken(enrollment.secret, nextStepTime);
        const challengeResult = await challengeTotp({
            store,
            userId: "user-1",
            code: challengeCode,
            nowMs: nextStepTime,
        });

        expect(challengeResult.usedRecoveryCode).toBe(false);

        await expect(
            challengeTotp({
                store,
                userId: "user-1",
                code: challengeCode,
                nowMs: nextStepTime,
            }),
        ).rejects.toMatchObject<TotpServiceError>({ code: "replay_detected" });
    });
});
