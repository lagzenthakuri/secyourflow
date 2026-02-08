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
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
        }),
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],
    pages: {
        signIn: "/login",
        error: "/login",
    },
    callbacks: {
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
            const twoFactorEnabled = Boolean(user?.totpEnabled);
            const twoFactorVerified = (auth as { twoFactorVerified?: boolean } | null)?.twoFactorVerified === true;

            if (twoFactorEnabled && !twoFactorVerified) {
                if (isTwoFactorPage) {
                    return true;
                }

                if (isProtectedRoute || isLoginPage) {
                    return Response.redirect(new URL("/auth/2fa", nextUrl));
                }
            }

            if (isTwoFactorPage) {
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
