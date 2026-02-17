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

class AccountSuspendedError extends CredentialsSignin {
    code = "account_suspended";
}

class OrgInactiveError extends CredentialsSignin {
    code = "org_inactive";
}

class LicenseExpiredError extends CredentialsSignin {
    code = "license_expired";
}

class UserLimitExceededError extends CredentialsSignin {
    code = "user_limit_exceeded";
}

class AccountNotActivatedError extends CredentialsSignin {
    code = "account_not_activated";
}

const authSecret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    (process.env.NODE_ENV !== "production" ? "local-dev-auth-secret" : undefined);


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
    secret: authSecret,
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
        maxAge: 2 * 24 * 60 * 60, // 2 days
        updateAge: 1 * 60 * 60, // 1 hour - update session every hour if active
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

                let user = await prisma.user.findFirst({
                    where: {
                        email: {
                            equals: email,
                            mode: "insensitive",
                        },
                    },
                    include: {
                        organization: {
                            include: {
                                productKey: true,
                                _count: {
                                    select: { users: true }
                                }
                            }
                        }
                    }
                });

                if (!user) {
                    return null;
                }

                const bootstrapSuperAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
                if (
                    bootstrapSuperAdminEmail &&
                    user.email.toLowerCase() === bootstrapSuperAdminEmail &&
                    (user.role !== "SUPER_ADMIN" || user.status !== "ACTIVE")
                ) {
                    const recovered = await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            role: "SUPER_ADMIN",
                            status: "ACTIVE",
                            emailVerified: user.emailVerified ?? new Date(),
                        },
                        include: {
                            organization: {
                                include: {
                                    productKey: true,
                                    _count: {
                                        select: { users: true },
                                    },
                                },
                            },
                        },
                    });
                    user = recovered;
                }

                if (user.status === "PENDING") {
                    throw new AccountNotActivatedError();
                }

                if (user.status === "SUSPENDED") {
                    throw new AccountSuspendedError();
                }



                // License validation
                const isSuperAdmin = user.role === "SUPER_ADMIN";
                const isMainOfficer = user.role === "MAIN_OFFICER";

                if (isSuperAdmin) {
                    // Super Admins bypass license checks
                } else if (!user.organization || !user.organization.isActive) {
                    throw new OrgInactiveError();
                } else {
                    const organization = user.organization;
                    const license = organization.productKey;
                    if (!license || license.status !== "ACTIVATED") {
                        if (!isMainOfficer) {
                            throw new LicenseExpiredError();
                        }
                    } else {
                        const now = new Date();
                        if (license.expiry < now) {
                            if (!isMainOfficer) {
                                throw new LicenseExpiredError();
                            }
                        }

                        if (organization._count.users > license.userLimit) {
                            if (!isMainOfficer) {
                                throw new UserLimitExceededError();
                            }
                        }
                    }
                }

                if (!user.password) {
                    return null;
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
        async jwt({ token, user, account, trigger, session }) {
            // Initial sign in
            if (account && user) {
                const signInUser = user as typeof user & {
                    role?: string;
                    totpEnabled?: boolean;
                    loginIp?: string | null;
                };

                token.id = user.id;
                token.name = user.name;
                token.role = signInUser.role || "ANALYST";
                token.totpEnabled = Boolean(signInUser.totpEnabled);

                const activeSessionId = randomUUID();
                const activeSessionIp = normalizeIpAddress(signInUser.loginIp);

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

                return token;
            }

            // Validate 2FA-related secrets only when this session can actually use 2FA.
            if (process.env.NODE_ENV === "production" && token.totpEnabled === true) {
                assertTotpEncryptionKeyConfigured();
                assertTwoFactorSessionUpdateKeyConfigured();
            }

            if (trigger === "update" && session) {
                const updateSession = session as {
                    __twoFactorSessionUpdateKey?: string;
                    twoFactorVerified?: boolean;
                    twoFactorVerifiedAt?: number | null;
                    authenticatedAt?: number;
                    totpEnabled?: boolean;
                    name?: string;
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

                // Allow name updates from client (handled separately to avoid type narrowing issues)
                if (typeof updateSession.name === "string") {
                    token.name = updateSession.name;
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
                session.user.name = token.name as string | null | undefined;
                session.user.role = (token.role as string) || "ANALYST";
                session.user.totpEnabled = Boolean(token.totpEnabled);
                session.twoFactorVerified = token.twoFactorVerified === true;
                session.twoFactorVerifiedAt =
                    typeof token.twoFactorVerifiedAt === "number" ? token.twoFactorVerifiedAt : null;
                session.authenticatedAt = typeof token.authenticatedAt === "number" ? token.authenticatedAt : null;
                session.accessToken = token.accessToken as string | undefined;
                session.error = token.error as string | undefined;
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
        accessToken?: string;
        error?: string;
    }
}
