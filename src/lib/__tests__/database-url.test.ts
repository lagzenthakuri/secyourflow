import { afterEach, describe, expect, it } from "vitest";
import { normalizeDatabaseUrl } from "@/lib/database-url";

const originalDbSslMode = process.env.DB_SSL_MODE;

afterEach(() => {
    if (originalDbSslMode === undefined) {
        delete process.env.DB_SSL_MODE;
    } else {
        process.env.DB_SSL_MODE = originalDbSslMode;
    }
});

describe("normalizeDatabaseUrl", () => {
    it("makes legacy pg SSL aliases explicit", () => {
        for (const mode of ["prefer", "require", "verify-ca"]) {
            const normalized = new URL(
                normalizeDatabaseUrl(`postgresql://db.example.com/app?sslmode=${mode}`),
            );

            expect(normalized.searchParams.get("sslmode")).toBe("verify-full");
        }
    });

    it("leaves explicitly secure and incompatible modes alone", () => {
        for (const mode of ["verify-full", "disable", "no-verify"]) {
            const normalized = new URL(
                normalizeDatabaseUrl(`postgresql://db.example.com/app?sslmode=${mode}`),
            );

            expect(normalized.searchParams.get("sslmode")).toBe(mode);
        }
    });

    it("preserves an explicitly requested libpq compatibility mode", () => {
        const normalized = new URL(
            normalizeDatabaseUrl(
                "postgresql://db.example.com/app?sslmode=require&uselibpqcompat=true",
            ),
        );

        expect(normalized.searchParams.get("sslmode")).toBe("require");
        expect(normalized.searchParams.get("uselibpqcompat")).toBe("true");
    });

    it("canonicalizes a legacy mode supplied through DB_SSL_MODE", () => {
        process.env.DB_SSL_MODE = "require";

        const normalized = new URL(normalizeDatabaseUrl("postgresql://db.example.com/app"));

        expect(normalized.searchParams.get("sslmode")).toBe("verify-full");
    });
});
