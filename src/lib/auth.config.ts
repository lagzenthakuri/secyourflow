import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

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
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith("/dashboard") ||
                nextUrl.pathname.startsWith("/vulnerabilities") ||
                nextUrl.pathname.startsWith("/assets") ||
                nextUrl.pathname.startsWith("/threats") ||
                nextUrl.pathname.startsWith("/compliance") ||
                nextUrl.pathname.startsWith("/reports") ||
                nextUrl.pathname.startsWith("/settings") ||
                nextUrl.pathname.startsWith("/users") ||
                nextUrl.pathname.startsWith("/scanners");
            const isOnLoginPage = nextUrl.pathname.startsWith("/login");

            if (isOnDashboard) {
                if (isLoggedIn) return true;
                return false; // Redirect unauthenticated users to login page
            } else if (isOnLoginPage) {
                if (isLoggedIn) {
                    return Response.redirect(new URL("/dashboard", nextUrl));
                }
            }
            return true;
        },
        async redirect({ url, baseUrl }) {
            // After sign in, redirect to dashboard
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            if (new URL(url).origin === baseUrl) return url;
            return `${baseUrl}/dashboard`;
        },
    },
} satisfies NextAuthConfig;
