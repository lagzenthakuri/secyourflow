import { describe, expect, it } from "vitest";
import { isDatabaseUnavailableError } from "@/lib/database-availability";

describe("isDatabaseUnavailableError", () => {
    it("recognises Prisma connectivity codes even when the message is generic", () => {
        const error = Object.assign(new Error("database connection failed"), { code: "P1001" });

        expect(isDatabaseUnavailableError(error)).toBe(true);
    });

    it("recognises socket failures emitted by the PostgreSQL adapter", () => {
        for (const code of ["EHOSTUNREACH", "ECONNREFUSED", "ETIMEDOUT"]) {
            const error = Object.assign(new Error("connection failed"), { code });
            expect(isDatabaseUnavailableError(error), code).toBe(true);
        }
    });

    it("walks nested error causes", () => {
        const error = new Error("login failed", {
            cause: Object.assign(new Error("upstream unavailable"), { code: "ECONNRESET" }),
        });

        expect(isDatabaseUnavailableError(error)).toBe(true);
    });

    it("does not classify application errors as database outages", () => {
        expect(isDatabaseUnavailableError(new Error("invalid email or password"))).toBe(false);
        expect(isDatabaseUnavailableError({ code: "P2002", message: "Unique constraint failed" })).toBe(false);
    });
});
