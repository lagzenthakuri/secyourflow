import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";
import { assertTotpEncryptionKeyConfigured } from "@/lib/crypto/totpSecret";

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
                const password = typeof credentials?.password === "string" ? credentials.password : "";

                if (!email || !password) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: { email },
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

                if (!user?.password) {
                    return null;
                }

                const isValidPassword = await bcrypt.compare(password, user.password);
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
            }

            if (user) {
                const signInUser = user as typeof user & {
                    role?: string;
                    totpEnabled?: boolean;
                };

                token.id = user.id;
                token.role = signInUser.role || "ANALYST";
                token.totpEnabled = Boolean(signInUser.totpEnabled);
                token.twoFactorVerified = token.totpEnabled ? false : true;
                token.twoFactorVerifiedAt = token.totpEnabled ? null : Date.now();
                token.authenticatedAt = Date.now();

                void prisma.user.update({
                    where: { id: user.id },
                    data: { lastLogin: new Date() },
                }).catch(() => undefined);

                void import("./logger").then(({ logActivity }) => {
                    return logActivity("User login", "auth", user.email || "unknown", null, null, "User logged in");
                }).catch(() => undefined);
            }

            if (trigger === "update" && session) {
                const updateSession = session as {
                    twoFactorVerified?: boolean;
                    twoFactorVerifiedAt?: number | null;
                    authenticatedAt?: number;
                    totpEnabled?: boolean;
                    user?: {
                        totpEnabled?: boolean;
                    };
                };
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

            if (typeof token.totpEnabled !== "boolean") {
                token.totpEnabled = false;
            }

            if (!token.totpEnabled) {
                token.twoFactorVerified = true;
                if (typeof token.twoFactorVerifiedAt !== "number") {
                    token.twoFactorVerifiedAt = Date.now();
                }
            } else if (typeof token.twoFactorVerified !== "boolean") {
                token.twoFactorVerified = false;
                token.twoFactorVerifiedAt = null;
            } else if (token.twoFactorVerified !== true) {
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
                session.twoFactorVerified = session.user.totpEnabled ? token.twoFactorVerified === true : true;
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
