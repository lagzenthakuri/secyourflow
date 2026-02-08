import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
    matcher: [
        "/login",
        "/dashboard/:path*",
        "/vulnerabilities/:path*",
        "/assets/:path*",
        "/threats/:path*",
        "/compliance/:path*",
        "/reports/:path*",
        "/settings/:path*",
        "/users/:path*",
        "/scanners/:path*",
        "/cves/:path*",
    ],
};
