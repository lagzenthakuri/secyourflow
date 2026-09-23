import { prisma } from "@/lib/prisma";

interface ActivateUserSessionInput {
    userId: string;
    name?: string | null;
    email?: string | null;
    activeSessionId: string;
    activeSessionIp: string | null;
}

export function buildDefaultOrganizationName(name?: string | null, email?: string | null): string {
    const displayName = name?.trim().slice(0, 100);
    if (displayName) {
        return `${displayName}'s organization`;
    }

    const domainLabel = email
        ?.trim()
        .toLowerCase()
        .split("@")[1]
        ?.split(".")[0]
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 63);

    return domainLabel ? `${domainLabel} workspace` : "New organization";
}

/**
 * Completes sign-in in one transaction.
 *
 * OAuth users created by the Prisma adapter do not pass through the public
 * registration form, so they can otherwise reach the dashboard without an
 * organization and fail every tenant-scoped request. This assigns a private
 * workspace to org-less OAuth users while preserving invitations and existing
 * organization membership.
 */
export async function activateUserSession({
    userId,
    name,
    email,
    activeSessionId,
    activeSessionIp,
}: ActivateUserSessionInput): Promise<{ organizationId: string }> {
    return prisma.$transaction(async (transaction) => {
        const user = await transaction.user.findUnique({
            where: { id: userId },
            select: {
                organizationId: true,
                name: true,
                email: true,
            },
        });

        if (!user) {
            throw new Error("Authenticated user no longer exists");
        }

        const organizationId =
            user.organizationId ??
            (
                await transaction.organization.create({
                    data: {
                        name: buildDefaultOrganizationName(name || user.name, email || user.email),
                    },
                    select: { id: true },
                })
            ).id;

        await transaction.user.update({
            where: { id: userId },
            data: {
                organizationId,
                activeSessionId,
                activeSessionIp,
                lastLogin: new Date(),
            },
        });

        return { organizationId };
    });
}
