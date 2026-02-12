import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN = process.env.SECYOURFLOW_WAZUH_TOKEN!;

function makeAlertId(alert: any) {
    // Stable dedupe id
    const base = `${alert?.agent?.id ?? ""}|${alert?.rule?.id ?? ""}|${alert?.timestamp ?? alert?.["@timestamp"] ?? ""}|${alert?.location ?? ""}`;
    return crypto.createHash("sha256").update(base).digest("hex");
}

export async function POST(req: Request) {
    const token = req.headers.get("X-SecYourFlow-Token");

    if (!token || token !== TOKEN) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const alert = body?.alert ?? body; // support both shapes
        const level = Number(alert?.rule?.level ?? 0);

        // Server-side filter (don’t rely only on Wazuh)
        if (level < 10) {
            return NextResponse.json({ ok: true, skipped: true });
        }

        const alertId = makeAlertId(alert);
        const ruleId = String(alert?.rule?.id ?? "unknown");
        const agentId = String(alert?.agent?.id ?? "unknown");
        const timestamp = new Date(alert?.timestamp ?? alert?.["@timestamp"] ?? Date.now());

        // For multi-tenant, we need a way to link to an organization.
        // In this implementation, we take the first organization as a default.
        // In a real multi-tenant setup, the organization would be identified by a parameter or another header.
        const organization = await prisma.organization.findFirst();

        if (!organization) {
            return NextResponse.json({ ok: false, error: "No organization found" }, { status: 500 });
        }

        await prisma.wazuhAlert.upsert({
            where: { id: alertId },
            create: {
                id: alertId,
                level,
                ruleId,
                agentId,
                timestamp,
                raw: alert as any,
                organizationId: organization.id
            },
            update: {
                level,
                ruleId,
                agentId,
                timestamp,
                raw: alert as any,
                organizationId: organization.id
            }
        });

        return NextResponse.json({ ok: true, alertId });
    } catch (error) {
        console.error("Wazuh webhook error:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
