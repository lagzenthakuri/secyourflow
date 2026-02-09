import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

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

export const authConfig = {
    providers: [
        GitHub({
            clientId: process.env.AUTH_GITHUB_ID || process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.AUTH_GITHUB_SECRET || process.env.GITHUB_CLIENT_SECRET,
        }),
        Google({
            clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],
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

            if (token.twoFactorVerified !== true) {
                token.twoFactorVerifiedAt = null;
            } else if (typeof token.twoFactorVerifiedAt !== "number") {
                token.twoFactorVerifiedAt = Date.now();
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
            const twoFactorVerified = (auth as { twoFactorVerified?: boolean } | null)?.twoFactorVerified === true;

            if (!hasTotpEnabled || !twoFactorVerified) {
                if (isTwoFactorPage) {
                    return true;
                }

                if (isProtectedRoute || isLoginPage) {
                    return Response.redirect(new URL("/auth/2fa", nextUrl));
                }
            }

            if (isTwoFactorPage && twoFactorVerified) {
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
