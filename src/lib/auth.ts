import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";
import { assertTotpEncryptionKeyConfigured } from "@/lib/crypto/totpSecret";
import { normalizeIpAddress } from "@/lib/request-utils";
import {
    assertTwoFactorSessionUpdateKeyConfigured,
    isTrustedTwoFactorSessionUpdate,
} from "@/lib/security/two-factor-session";
import { hasRecentTwoFactorVerification, TWO_FACTOR_REVERIFY_INTERVAL_MS } from "@/lib/security/two-factor";

class OAuthOnlyCredentialsSigninError extends CredentialsSignin {
    code = "oauth_only";
}

function extractIpFromForwardedHeader(headerValue: string): string | null {
    const forwardedEntries = headerValue.split(",");
    for (const entry of forwardedEntries) {
        const forMatch = entry.match(/(?:^|;)\s*for=(?:"([^"]+)"|([^;,\s]+))/i);
        const candidate = forMatch?.[1] ?? forMatch?.[2] ?? null;
        const normalized = normalizeIpAddress(candidate);
        if (normalized) {
            return normalized;
        }
    }

    return null;
}

function extractLoginIpFromRequest(request?: Request): string | null {
    if (!request) {
        return null;
    }

    const headers = request.headers;

    const forwarded = headers.get("forwarded");
    if (forwarded) {
        const forwardedIp = extractIpFromForwardedHeader(forwarded);
        if (forwardedIp) {
            return forwardedIp;
        }
    }

    const xForwardedFor = headers.get("x-forwarded-for");
    if (xForwardedFor) {
        const candidates = xForwardedFor.split(",");
        for (const candidate of candidates) {
            const normalized = normalizeIpAddress(candidate);
            if (normalized) {
                return normalized;
            }
        }
    }

    const directHeaderCandidates = [
        headers.get("x-real-ip"),
        headers.get("cf-connecting-ip"),
        headers.get("true-client-ip"),
    ];

    for (const candidate of directHeaderCandidates) {
        const normalized = normalizeIpAddress(candidate);
        if (normalized) {
            return normalized;
        }
    }

    return null;
}

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials, request) {
                const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
                const password = typeof credentials?.password === "string" ? credentials.password : "";

                if (!email || !password) {
                    return null;
                }

                const loginIp = extractLoginIpFromRequest(request);

                const user = await prisma.user.findFirst({
                    where: {
                        email: {
                            equals: email,
                            mode: "insensitive",
                        },
                    },
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        password: true,
                        image: true,
                        totpEnabled: true,
                    },
                });

                if (!user) {
                    return null;
                }

                if (!user.password) {
                    throw new OAuthOnlyCredentialsSigninError();
                }

                let isValidPassword = false;
                try {
                    isValidPassword = await bcrypt.compare(password, user.password);
                } catch {
                    return null;
                }

                if (!isValidPassword) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    role: user.role,
                    totpEnabled: user.totpEnabled,
                    loginIp,
                };
            },
        }),
        ...authConfig.providers,
    ],
    callbacks: {
        ...authConfig.callbacks,
        async jwt({ token, user, trigger, session }) {
            if (process.env.NODE_ENV === "production") {
                assertTotpEncryptionKeyConfigured();
                assertTwoFactorSessionUpdateKeyConfigured();
            }

            if (user) {
                const signInUser = user as typeof user & {
                    role?: string;
                    totpEnabled?: boolean;
                    loginIp?: string | null;
                };
                const activeSessionId = randomUUID();
                const activeSessionIp = normalizeIpAddress(signInUser.loginIp);

                token.id = user.id;
                token.role = signInUser.role || "ANALYST";
                token.totpEnabled = Boolean(signInUser.totpEnabled);
                token.activeSessionId = activeSessionId;
                // Always require a fresh 2FA flow after login.
                token.twoFactorVerified = false;
                token.twoFactorVerifiedAt = null;
                token.authenticatedAt = Date.now();

                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        lastLogin: new Date(),
                        activeSessionId,
                        activeSessionIp,
                    },
                });

                void import("./logger").then(({ logActivity }) => {
                    return logActivity("User login", "auth", user.email || "unknown", null, null, "User logged in", user.id);
                }).catch(() => undefined);
            }

            if (trigger === "update" && session) {
                const updateSession = session as {
                    __twoFactorSessionUpdateKey?: string;
                    twoFactorVerified?: boolean;
                    twoFactorVerifiedAt?: number | null;
                    authenticatedAt?: number;
                    totpEnabled?: boolean;
                    user?: {
                        totpEnabled?: boolean;
                    };
                };

                // Prevent client-controlled session updates from mutating sensitive 2FA state.
                if (isTrustedTwoFactorSessionUpdate(updateSession)) {
                    if (typeof updateSession.twoFactorVerified === "boolean") {
                        token.twoFactorVerified = updateSession.twoFactorVerified;
                    }

                    if (
                        typeof updateSession.twoFactorVerifiedAt === "number" ||
                        updateSession.twoFactorVerifiedAt === null
                    ) {
                        token.twoFactorVerifiedAt = updateSession.twoFactorVerifiedAt;
                    }

                    const updatedTotpEnabled =
                        typeof updateSession.user?.totpEnabled === "boolean"
                            ? updateSession.user.totpEnabled
                            : typeof updateSession.totpEnabled === "boolean"
                                ? updateSession.totpEnabled
                                : undefined;

                    if (typeof updatedTotpEnabled === "boolean") {
                        token.totpEnabled = updatedTotpEnabled;
                    }

                    if (typeof updateSession.authenticatedAt === "number") {
                        token.authenticatedAt = updateSession.authenticatedAt;
                    }
                }
            }

            if (typeof token.id === "string") {
                const sessionState = await prisma.user.findUnique({
                    where: { id: token.id },
                    select: { activeSessionId: true },
                });

                if (
                    !sessionState?.activeSessionId ||
                    typeof token.activeSessionId !== "string" ||
                    token.activeSessionId !== sessionState.activeSessionId
                ) {
                    return null;
                }
            }

            if (typeof token.totpEnabled !== "boolean") {
                token.totpEnabled = false;
            }

            if (!token.totpEnabled) {
                token.twoFactorVerified = false;
                token.twoFactorVerifiedAt = null;
            } else if (typeof token.twoFactorVerified !== "boolean") {
                token.twoFactorVerified = false;
                token.twoFactorVerifiedAt = null;
            } else if (token.twoFactorVerified !== true) {
                token.twoFactorVerifiedAt = null;
            } else if (
                !hasRecentTwoFactorVerification(
                    true,
                    typeof token.twoFactorVerifiedAt === "number" ? token.twoFactorVerifiedAt : null,
                    TWO_FACTOR_REVERIFY_INTERVAL_MS,
                )
            ) {
                // Require 2FA re-verification after the allowed interval.
                token.twoFactorVerified = false;
                token.twoFactorVerifiedAt = null;
            }

            if (typeof token.authenticatedAt !== "number") {
                token.authenticatedAt = Date.now();
            }

            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = (token.role as string) || "ANALYST";
                session.user.totpEnabled = Boolean(token.totpEnabled);
                session.twoFactorVerified = token.twoFactorVerified === true;
                session.twoFactorVerifiedAt =
                    typeof token.twoFactorVerifiedAt === "number" ? token.twoFactorVerifiedAt : null;
                session.authenticatedAt = typeof token.authenticatedAt === "number" ? token.authenticatedAt : null;
            }

            return session;
        },
    },
    trustHost: true,
    debug: process.env.NODE_ENV !== "production",
});

declare module "next-auth" {
    interface User {
        role?: string;
        totpEnabled?: boolean;
        loginIp?: string | null;
    }

    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role?: string;
            totpEnabled?: boolean;
        };
        twoFactorVerified?: boolean;
        twoFactorVerifiedAt?: number | null;
        authenticatedAt?: number | null;
    }
}
