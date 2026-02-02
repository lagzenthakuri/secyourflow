import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
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
            return NextResponse.json({ ...defaultSettings, organizationName: org.name, domain: org.domain });
        }

        return NextResponse.json({ ...org.settings, organizationName: org.name, domain: org.domain });
    } catch (error) {
        console.error("Settings GET Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch settings" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const org = await prisma.organization.findFirst();
        if (!org) throw new Error("No organization found");

        const { organizationName, domain, ...settingsData } = body;

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

        return NextResponse.json(updatedSettings);
    } catch (error) {
        console.error("Settings POST Error:", error);
        return NextResponse.json(
            { error: "Failed to update settings" },
            { status: 400 }
        );
    }
}
