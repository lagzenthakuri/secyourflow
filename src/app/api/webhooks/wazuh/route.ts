import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

function makeAlertId(alert: any) {
    // Stable dedupe id
    const base = `${alert?.agent?.id ?? ""}|${alert?.rule?.id ?? ""}|${alert?.timestamp ?? alert?.["@timestamp"] ?? ""}|${alert?.location ?? ""}`;
    return crypto.createHash("sha256").update(base).digest("hex");
}

function transformToInternalFormat(alert: any) {
    return {
        event_type: "security_alert",
        severity: Number(alert?.rule?.level ?? 0),
        rule_id: String(alert?.rule?.id ?? "unknown"),
        description: alert?.rule?.description ?? "No description",
        agent_name: alert?.agent?.name ?? "unknown",
        agent_ip: alert?.agent?.ip ?? "unknown",
        timestamp: new Date(alert?.timestamp ?? alert?.["@timestamp"] ?? Date.now()).toISOString(),
        raw_log: alert?.full_log ?? alert?.log ?? JSON.stringify(alert)
    };
}

export async function POST(req: Request) {
    try {
        // Robust JSON parsing
        let body: any;
        try {
            const rawBody = await req.text();
            if (!rawBody) {
                console.log("Empty body received");
                return new NextResponse("Handled", { status: 200 });
            }
            body = JSON.parse(rawBody);
        } catch (e) {
            console.error("Failed to parse Wazuh payload as JSON");
            return new NextResponse("Handled", { status: 200 });
        }

        console.log("Wazuh raw alert received:");
        console.log(JSON.stringify(body, null, 2));

        const alert = body?.alert ?? body;

        // Transform to internal format as requested
        const internalAlert = transformToInternalFormat(alert);
        console.log("Transformed to internal format:");
        console.log(JSON.stringify(internalAlert, null, 2));

        const url = new URL(req.url);
        const orgId = url.searchParams.get("orgId") || req.headers.get("X-SecYourFlow-Org-Id");

        const level = internalAlert.severity;

        // Server-side filter
        if (level < 10) {
            return NextResponse.json({ status: "received", skipped: true });
        }

        const alertId = makeAlertId(alert);
        const ruleId = internalAlert.rule_id;
        const agentId = String(alert?.agent?.id ?? "unknown");
        const timestamp = new Date(internalAlert.timestamp);

        // Multi-tenant identification
        let organizationId: string;
        if (orgId) {
            const org = await prisma.organization.findUnique({
                where: { id: orgId },
                select: { id: true }
            });
            organizationId = org?.id || "";
        } else {
            const fallbackOrg = await prisma.organization.findFirst({
                select: { id: true }
            });
            organizationId = fallbackOrg?.id || "";
        }

        if (organizationId) {
            await prisma.wazuhAlert.upsert({
                where: { id: alertId },
                create: {
                    id: alertId,
                    level,
                    ruleId,
                    agentId,
                    timestamp,
                    raw: alert as any,
                    organizationId
                },
                update: {
                    level,
                    ruleId,
                    agentId,
                    timestamp,
                    raw: alert as any,
                    organizationId
                }
            });
        }

        return NextResponse.json({ status: "received" });
    } catch (error) {
        console.error("Top-level webhook error:", error);
        // Always return 200 to Wazuh to satisfy the webhook manager and prevent 500 retries
        return new NextResponse("Handled", { status: 200 });
    }
}
