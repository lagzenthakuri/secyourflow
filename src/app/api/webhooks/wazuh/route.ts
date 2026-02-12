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
    const url = new URL(req.url);
    const token = req.headers.get("X-SecYourFlow-Token") || url.searchParams.get("token");

    if (!token || token !== TOKEN) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        const orgId = url.searchParams.get("orgId") || req.headers.get("X-SecYourFlow-Org-Id");

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

        // Multi-tenant identification
        let organizationId: string;

        if (orgId) {
            const org = await prisma.organization.findUnique({
                where: { id: orgId },
                select: { id: true }
            });
            if (!org) {
                return NextResponse.json({ ok: false, error: "Invalid organization ID" }, { status: 400 });
            }
            organizationId = org.id;
        } else {
            // Fallback for setups with only one organization or where header is missing
            const fallbackOrg = await prisma.organization.findFirst({
                select: { id: true }
            });

            if (!fallbackOrg) {
                return NextResponse.json({ ok: false, error: "No organization found" }, { status: 500 });
            }
            organizationId = fallbackOrg.id;
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
                organizationId: organizationId
            },
            update: {
                level,
                ruleId,
                agentId,
                timestamp,
                raw: alert as any,
                organizationId: organizationId
            }
        });

        return NextResponse.json({ ok: true, alertId });
    } catch (error) {
        console.error("Wazuh webhook error:", error);
        return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }
}
