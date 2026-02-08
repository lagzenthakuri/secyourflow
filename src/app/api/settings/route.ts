import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/logger";
import { isTwoFactorSatisfied } from "@/lib/security/two-factor";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!isTwoFactorSatisfied(session)) {
            return NextResponse.json({ error: "Two-factor authentication required" }, { status: 403 });
        }

        const org = await prisma.organization.findFirst({
            include: { settings: true }
        });
        if (!org) throw new Error("No organization found");

        if (!org.settings) {
            // Create default settings if they don't exist
            const defaultSettings = await prisma.setting.create({
                data: {
                    organizationId: org.id,
                }
            });
            return NextResponse.json({ 
                ...defaultSettings, 
                organizationName: org.name, 
                domain: org.domain,
                systemHealth: getSystemHealth(),
                serverTimestamp: new Date().toISOString()
            });
        }

        return NextResponse.json({ 
            ...org.settings, 
            organizationName: org.name, 
            domain: org.domain,
            systemHealth: getSystemHealth(),
            serverTimestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Settings GET Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch settings" },
            { status: 500 }
        );
    }
}

function getSystemHealth() {
    return {
        nvdApiKeyConfigured: !!process.env.NVD_API_KEY,
        githubTokenConfigured: !!process.env.GITHUB_TOKEN,
        openrouterConfigured: !!process.env.OPENROUTER_API_KEY,
        nextauthSecretConfigured: !!process.env.NEXTAUTH_SECRET,
        databaseUrlConfigured: !!process.env.DATABASE_URL,
    };
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!isTwoFactorSatisfied(session)) {
            return NextResponse.json({ error: "Two-factor authentication required" }, { status: 403 });
        }

        const body = await request.json();
        const org = await prisma.organization.findFirst();
        if (!org) throw new Error("No organization found");

        const { organizationName, domain, ...settingsData } = body;

        // RBAC: MAIN_OFFICER required for high-risk settings
        const isMainOfficer = session.user.role === 'MAIN_OFFICER';
        const restrictedFields = ['require2FA', 'passwordPolicy', 'sessionTimeout'];
        const hasRestrictedChanges = restrictedFields.some(field => field in settingsData);
        
        if ((organizationName || domain) && !isMainOfficer) {
            return NextResponse.json({ error: "MAIN_OFFICER role required to update organization info" }, { status: 403 });
        }

        if (hasRestrictedChanges && !isMainOfficer) {
            return NextResponse.json({ error: "MAIN_OFFICER role required for security settings" }, { status: 403 });
        }

        // Filter out client-only feature flags (these are stored in localStorage)
        const clientOnlyFields = [
            'changeControlMode', 'settingsChangeReasonRequired', 'auditLogRetentionDays', 'dataRetentionDays',
            'quietHoursEnabled', 'quietHoursStart', 'quietHoursEnd', 'notifyKevOnly', 'epssAlertThreshold',
            'aiAssistEnabled', 'aiRiskAutofillEnabled', 'aiHumanReviewRequired', 'aiDataRedactionMode', 'aiModelAllowlist'
        ];
        clientOnlyFields.forEach(field => delete settingsData[field]);

        // Update Organization name/domain if provided
        if (organizationName || domain) {
            await prisma.organization.update({
                where: { id: org.id },
                data: {
                    name: organizationName || org.name,
                    domain: domain || org.domain,
                }
            });
        }

        const updatedSettings = await prisma.setting.upsert({
            where: { organizationId: org.id },
            update: settingsData,
            create: {
                ...settingsData,
                organizationId: org.id,
            }
        });

        await logActivity(
            "Settings updated",
            "settings",
            updatedSettings.id,
            null,
            null,
            `Settings updated by ${session.user.name}`,
            session.user.id
        );

        return NextResponse.json(updatedSettings);
    } catch (error) {
        console.error("Settings POST Error:", error);
        return NextResponse.json(
            { error: "Failed to update settings" },
            { status: 400 }
        );
    }
}
