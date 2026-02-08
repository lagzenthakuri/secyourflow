import { describe, expect, it } from "vitest";
import { authConfig } from "@/lib/auth.config";

type AuthorizedCallback = NonNullable<NonNullable<typeof authConfig.callbacks>["authorized"]>;
type AuthorizedArgs = Parameters<AuthorizedCallback>[0];

describe("2FA route authorization", () => {
    it("redirects protected routes to /auth/2fa when second factor is pending", () => {
        const authorized = authConfig.callbacks?.authorized;
        if (!authorized) {
            throw new Error("Missing authorized callback");
        }

        const result = authorized({
            auth: {
                user: { id: "u1", email: "u@example.com", totpEnabled: true },
                twoFactorVerified: false,
            },
            request: { nextUrl: new URL("http://localhost:3000/settings") },
        } as unknown as AuthorizedArgs);

        expect(result).toBeInstanceOf(Response);
        if (result instanceof Response) {
            expect(result.headers.get("location")).toBe("http://localhost:3000/auth/2fa");
        }
    });

    it("allows protected routes when second factor is already verified", () => {
        const authorized = authConfig.callbacks?.authorized;
        if (!authorized) {
            throw new Error("Missing authorized callback");
        }

        const result = authorized({
            auth: {
                user: { id: "u1", email: "u@example.com", totpEnabled: true },
                twoFactorVerified: true,
            },
            request: { nextUrl: new URL("http://localhost:3000/settings") },
        } as unknown as AuthorizedArgs);

        expect(result).toBe(true);
    });
});
