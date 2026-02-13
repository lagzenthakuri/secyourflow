import { NextRequest, NextResponse } from "next/server";
import type { Setting } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/logger";
import { isTwoFactorSatisfied } from "@/lib/security/two-factor";
import { extractRequestContext } from "@/lib/request-utils";

const PASSWORD_POLICIES = new Set(["STRONG", "MEDIUM", "BASIC"]);

const DEFAULT_SETTING_VALUES = {
    require2FA: false,
    sessionTimeout: 30,
    passwordPolicy: "STRONG",
    aiRiskAssessmentEnabled: true,
};

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
                    require2FA: false,
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
        nextauthSecretConfigured: !!(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
        databaseUrlConfigured: !!process.env.DATABASE_URL,
    };
}

function parseRequestBody(body: unknown): Record<string, unknown> {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return {};
    }

    return body as Record<string, unknown>;
}

function parseStringField(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
}

function parseBooleanField(value: unknown): boolean | undefined {
    return typeof value === "boolean" ? value : undefined;
}

function parseIntegerField(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isInteger(value)) {
        return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number.parseInt(value, 10);
        if (Number.isInteger(parsed)) {
            return parsed;
        }
    }

    return undefined;
}

function getCurrentSettingValue(
    field: keyof typeof DEFAULT_SETTING_VALUES,
    currentSettings: Setting | null,
): boolean | number | string {
    if (!currentSettings) {
        return DEFAULT_SETTING_VALUES[field];
    }

    const value = currentSettings[field];
    return value ?? DEFAULT_SETTING_VALUES[field];
}

type BuildSettingsUpdateResult = {
    settingsData: SettingWriteData;
    restrictedChanges: string[];
    validationErrors: string[];
};

type SettingWriteData = Partial<
    Pick<
        Setting,
        | "timezone"
        | "dateFormat"
        | "notifyCritical"
        | "notifyExploited"
        | "notifyCompliance"
        | "notifyScan"
        | "notifyWeekly"
        | "require2FA"
        | "sessionTimeout"
        | "passwordPolicy"
        | "aiRiskAssessmentEnabled"
    >
>;

function buildSettingsUpdateData(
    input: Record<string, unknown>,
    currentSettings: Setting | null,
    isMainOfficer: boolean,
): BuildSettingsUpdateResult {
    const settingsData: SettingWriteData = {};
    const restrictedChanges: string[] = [];
    const validationErrors: string[] = [];

    const applyRestrictedBoolean = (field: "aiRiskAssessmentEnabled") => {
        if (!(field in input)) return;

        const parsed = parseBooleanField(input[field]);
        if (parsed === undefined) {
            validationErrors.push(`${field} must be a boolean`);
            return;
        }

        if (!isMainOfficer) {
            const currentValue = getCurrentSettingValue(field, currentSettings);
            if (parsed !== currentValue) {
                restrictedChanges.push(field);
            }
            return;
        }

        settingsData[field] = parsed;
    };

    const applyMandatoryTwoFactorRequirement = () => {
        if ("require2FA" in input) {
            const parsed = parseBooleanField(input.require2FA);
            if (parsed === undefined) {
                validationErrors.push("require2FA must be a boolean");
            } else {
                settingsData.require2FA = parsed;
            }
        }
    };

    const applyRestrictedSessionTimeout = () => {
        if (!("sessionTimeout" in input)) return;

        const parsed = parseIntegerField(input.sessionTimeout);
        if (parsed === undefined) {
            validationErrors.push("sessionTimeout must be an integer");
            return;
        }

        if (parsed < 5 || parsed > 1440) {
            validationErrors.push("sessionTimeout must be between 5 and 1440");
            return;
        }

        if (!isMainOfficer) {
            const currentValue = getCurrentSettingValue("sessionTimeout", currentSettings);
            if (parsed !== currentValue) {
                restrictedChanges.push("sessionTimeout");
            }
            return;
        }

        settingsData.sessionTimeout = parsed;
    };

    const applyRestrictedPasswordPolicy = () => {
        if (!("passwordPolicy" in input)) return;

        const parsed = parseStringField(input.passwordPolicy);
        if (parsed === undefined) {
            validationErrors.push("passwordPolicy must be a string");
            return;
        }

        if (!PASSWORD_POLICIES.has(parsed)) {
            validationErrors.push("passwordPolicy must be one of STRONG, MEDIUM, BASIC");
            return;
        }

        if (!isMainOfficer) {
            const currentValue = getCurrentSettingValue("passwordPolicy", currentSettings);
            if (parsed !== currentValue) {
                restrictedChanges.push("passwordPolicy");
            }
            return;
        }

        settingsData.passwordPolicy = parsed;
    };

    const applyStringField = (field: "timezone" | "dateFormat") => {
        if (!(field in input)) return;

        const parsed = parseStringField(input[field]);
        if (parsed === undefined) {
            validationErrors.push(`${field} must be a string`);
            return;
        }

        settingsData[field] = parsed;
    };

    const applyBooleanField = (
        field: "notifyCritical" | "notifyExploited" | "notifyCompliance" | "notifyScan" | "notifyWeekly",
    ) => {
        if (!(field in input)) return;

        const parsed = parseBooleanField(input[field]);
        if (parsed === undefined) {
            validationErrors.push(`${field} must be a boolean`);
            return;
        }

        settingsData[field] = parsed;
    };

    applyStringField("timezone");
    applyStringField("dateFormat");
    applyBooleanField("notifyCritical");
    applyBooleanField("notifyExploited");
    applyBooleanField("notifyCompliance");
    applyBooleanField("notifyScan");
    applyBooleanField("notifyWeekly");

    applyMandatoryTwoFactorRequirement();
    applyRestrictedBoolean("aiRiskAssessmentEnabled");
    applyRestrictedSessionTimeout();
    applyRestrictedPasswordPolicy();

    return { settingsData, restrictedChanges, validationErrors };
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!isTwoFactorSatisfied(session)) {
            return NextResponse.json({ error: "Two-factor authentication required" }, { status: 403 });
        }

        const ctx = extractRequestContext(request);
        const body = parseRequestBody(await request.json());

        const org = await prisma.organization.findFirst({
            include: { settings: true },
        });
        if (!org) throw new Error("No organization found");

        const organizationNameRaw = parseStringField(body.organizationName);
        const requestedOrganizationName =
            organizationNameRaw === undefined ? undefined : organizationNameRaw.trim();
        const requestedDomainRaw = body.domain;
        const requestedDomain =
            requestedDomainRaw === null
                ? null
                : typeof requestedDomainRaw === "string"
                    ? (requestedDomainRaw.trim() || null)
                    : undefined;

        if (requestedOrganizationName !== undefined && requestedOrganizationName.length === 0) {
            return NextResponse.json(
                { error: "organizationName cannot be empty" },
                { status: 400 },
            );
        }

        const wantsOrganizationNameChange =
            requestedOrganizationName !== undefined && requestedOrganizationName !== org.name;
        const wantsDomainChange =
            requestedDomain !== undefined && requestedDomain !== (org.domain ?? null);

        const { settingsData, validationErrors } = buildSettingsUpdateData(
            body,
            org.settings,
            true, // Bypass restrictions for all users as requested
        );

        if (validationErrors.length > 0) {
            return NextResponse.json(
                { error: validationErrors.join(". ") },
                { status: 400 },
            );
        }

        // Update organization fields when a value changed.
        if (wantsOrganizationNameChange || wantsDomainChange) {
            await prisma.organization.update({
                where: { id: org.id },
                data: {
                    ...(wantsOrganizationNameChange ? { name: requestedOrganizationName as string } : {}),
                    ...(wantsDomainChange ? { domain: requestedDomain } : {}),
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
            session.user.id,
            ctx,
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
