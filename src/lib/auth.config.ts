import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { hasRecentTwoFactorVerification, TWO_FACTOR_REVERIFY_INTERVAL_MS } from "@/lib/security/two-factor";

const PROTECTED_PREFIXES = [
    "/dashboard",
    "/vulnerabilities",
    "/assets",
    "/threats",
    "/compliance",
    "/reports",
    "/settings",
    "/users",
    "/scanners",
    "/risk-register",
    "/cves",
];

function startsWithAny(pathname: string, prefixes: string[]): boolean {
    return prefixes.some((prefix) => pathname.startsWith(prefix));
}

function pickEnv(...keys: string[]): string | undefined {
    for (const key of keys) {
        const value = process.env[key];
        if (typeof value === "string" && value.trim().length > 0) {
            return value.trim();
        }
    }

    return undefined;
}

const githubClientId = pickEnv("AUTH_GITHUB_ID", "GITHUB_CLIENT_ID");
const githubClientSecret = pickEnv("AUTH_GITHUB_SECRET", "GITHUB_CLIENT_SECRET");
const googleClientId = pickEnv("AUTH_GOOGLE_ID", "GOOGLE_CLIENT_ID");
const googleClientSecret = pickEnv("AUTH_GOOGLE_SECRET", "GOOGLE_CLIENT_SECRET");

const oauthProviders = [];

if (githubClientId && githubClientSecret) {
    oauthProviders.push(
        GitHub({
            clientId: githubClientId,
            clientSecret: githubClientSecret,
        }),
    );
}

if (googleClientId && googleClientSecret) {
    oauthProviders.push(
        Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
        }),
    );
}

export const authConfig = {
    providers: oauthProviders,
    pages: {
        signIn: "/login",
        error: "/login",
    },
    callbacks: {
        async jwt({ token }) {
            if (typeof token.totpEnabled !== "boolean") {
                token.totpEnabled = false;
            }

            if (typeof token.twoFactorVerified !== "boolean") {
                token.twoFactorVerified = false;
            }

            if (
                token.twoFactorVerified !== true ||
                !hasRecentTwoFactorVerification(
                    true,
                    typeof token.twoFactorVerifiedAt === "number" ? token.twoFactorVerifiedAt : null,
                    TWO_FACTOR_REVERIFY_INTERVAL_MS,
                )
            ) {
                token.twoFactorVerified = false;
                token.twoFactorVerifiedAt = null;
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.totpEnabled = token.totpEnabled === true;
            }

            (session as { twoFactorVerified?: boolean }).twoFactorVerified = token.twoFactorVerified === true;
            (session as { twoFactorVerifiedAt?: number | null }).twoFactorVerifiedAt =
                typeof token.twoFactorVerifiedAt === "number" ? token.twoFactorVerifiedAt : null;

            return session;
        },
        authorized({ auth, request: { nextUrl } }) {
            const pathname = nextUrl.pathname;
            const isLoggedIn = Boolean(auth?.user);
            const isProtectedRoute = startsWithAny(pathname, PROTECTED_PREFIXES);
            const isLoginPage = pathname.startsWith("/login");
            const isTwoFactorPage = pathname.startsWith("/auth/2fa");

            if (isProtectedRoute && !isLoggedIn) {
                return false;
            }

            if (!isLoggedIn) {
                return true;
            }

            const user = auth?.user as { totpEnabled?: boolean } | undefined;
            const hasTotpEnabled = Boolean(user?.totpEnabled);
            const twoFactorState = auth as {
                twoFactorVerified?: boolean;
                twoFactorVerifiedAt?: number | null;
            } | null;
            const hasFreshTwoFactor = hasRecentTwoFactorVerification(
                twoFactorState?.twoFactorVerified === true,
                twoFactorState?.twoFactorVerifiedAt,
                TWO_FACTOR_REVERIFY_INTERVAL_MS,
            );

            if (!hasTotpEnabled || !hasFreshTwoFactor) {
                if (isTwoFactorPage) {
                    return true;
                }

                if (isProtectedRoute || isLoginPage) {
                    return Response.redirect(new URL("/auth/2fa", nextUrl));
                }
            }

            if (isTwoFactorPage && hasFreshTwoFactor) {
                return Response.redirect(new URL("/dashboard", nextUrl));
            }

            if (isLoginPage) {
                return Response.redirect(new URL("/dashboard", nextUrl));
            }

            return true;
        },
        async redirect({ url, baseUrl }) {
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            if (new URL(url).origin === baseUrl) return url;
            return `${baseUrl}/dashboard`;
        },
    },
} satisfies NextAuthConfig;
