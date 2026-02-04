import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    callbacks: {
        ...authConfig.callbacks,
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role || "ANALYST";
                // Log login
                // We do this fire-and-forget to avoid slowing down auth
                import("./logger").then(({ logActivity }) => {
                    logActivity("User login", "auth", user.email || "unknown", null, null, "User logged in");
                });
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
            }
            return session;
        },
    },
    trustHost: true,
});

// Type augmentation for session
declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role?: string;
        };
    }
}
