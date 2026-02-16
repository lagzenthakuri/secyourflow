import { NextResponse } from "next/server";
import crypto, { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

type WazuhAlertPayload = {
    agent?: { id?: string | number; name?: string; ip?: string };
    rule?: { id?: string | number; level?: string | number; description?: string };
    timestamp?: string;
    "@timestamp"?: string;
    location?: string;
    full_log?: string;
    log?: string;
};

function makeAlertId(alert: WazuhAlertPayload) {
    // Stable dedupe id
    const base = `${alert?.agent?.id ?? ""}|${alert?.rule?.id ?? ""}|${alert?.timestamp ?? alert?.["@timestamp"] ?? ""}|${alert?.location ?? ""}`;
    return crypto.createHash("sha256").update(base).digest("hex");
}

function transformToInternalFormat(alert: WazuhAlertPayload) {
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

function getWebhookSecret(): string | null {
    const secret = process.env.WAZUH_WEBHOOK_SECRET;
    return typeof secret === "string" && secret.trim().length > 0 ? secret.trim() : null;
}

function allowUnsignedWebhookInDev(): boolean {
    return process.env.NODE_ENV !== "production" && process.env.WAZUH_WEBHOOK_ALLOW_UNSIGNED_DEV === "true";
}

function hasValidSignature(req: Request, rawBody: string): boolean {
    const secret = getWebhookSecret();
    if (!secret) {
        return allowUnsignedWebhookInDev();
    }

    const signatureHeader = req.headers.get("x-secyourflow-signature");
    const timestampHeader = req.headers.get("x-secyourflow-timestamp");
    if (!signatureHeader || !timestampHeader) {
        return false;
    }

    const timestamp = Number(timestampHeader);
    if (!Number.isFinite(timestamp)) {
        return false;
    }

    // Reject old/replayed payloads.
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - timestamp) > 300) {
        return false;
    }

    const expected = crypto
        .createHmac("sha256", secret)
        .update(`${timestampHeader}.${rawBody}`)
        .digest("hex");

    const provided = signatureHeader.trim().toLowerCase();
    const expectedBuffer = Buffer.from(expected, "hex");
    const providedBuffer = Buffer.from(provided, "hex");
    if (expectedBuffer.length !== providedBuffer.length || expectedBuffer.length === 0) {
        return false;
    }

    return timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        if (!rawBody) {
            return NextResponse.json({ error: "Empty payload" }, { status: 400 });
        }

        if (!hasValidSignature(req, rawBody)) {
            return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
        }

        let parsedBody: unknown;
        try {
            parsedBody = JSON.parse(rawBody);
        } catch {
            return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
        }

        const bodyObject =
            parsedBody && typeof parsedBody === "object" && !Array.isArray(parsedBody)
                ? (parsedBody as Record<string, unknown>)
                : {};

        const alert = (bodyObject.alert ?? bodyObject) as WazuhAlertPayload;

        // Transform to internal format as requested
        const internalAlert = transformToInternalFormat(alert);

        const url = new URL(req.url);
        const orgId = url.searchParams.get("orgId") || req.headers.get("X-SecYourFlow-Org-Id");
        if (!orgId) {
            return NextResponse.json({ error: "Missing organization identifier" }, { status: 400 });
        }

        const level = internalAlert.severity;

        // Server-side filter
        if (level < 10) {
            return NextResponse.json({ status: "received", skipped: true });
        }

        const alertId = makeAlertId(alert);
        const ruleId = internalAlert.rule_id;
        const agentId = String(alert?.agent?.id ?? "unknown");
        const timestamp = new Date(internalAlert.timestamp);

        const organization = await prisma.organization.findUnique({
            where: { id: orgId },
            select: { id: true },
        });
        if (!organization) {
            return NextResponse.json({ error: "Invalid organization identifier" }, { status: 400 });
        }

        await prisma.wazuhAlert.upsert({
            where: { id: alertId },
            create: {
                id: alertId,
                level,
                ruleId,
                agentId,
                timestamp,
                raw: alert as unknown as object,
                organizationId: organization.id,
            },
            update: {
                level,
                ruleId,
                agentId,
                timestamp,
                raw: alert as unknown as object,
                organizationId: organization.id,
            },
        });

        return NextResponse.json({ status: "received" });
    } catch (error) {
        console.error("Top-level webhook error:", error);
        return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
    }
}
