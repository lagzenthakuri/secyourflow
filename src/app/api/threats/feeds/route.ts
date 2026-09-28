import { NextResponse } from "next/server";
import { requireThreatIntelContext } from "@/modules/threat-intel/auth";
import { ThreatIntelRepository, coerceFeedFormat, coerceFeedType } from "@/modules/threat-intel/persistence/repository";
import { encryptSecret } from "@/lib/crypto/sealed-secrets";
import { validateOutboundUrl } from "@/lib/security/outbound-url";

function sanitizeFeed<T extends { apiKey?: string | null }>(feed: T): Omit<T, "apiKey"> & { hasApiKey: boolean } {
  const { apiKey, ...rest } = feed;
  return {
    ...rest,
    hasApiKey: Boolean(apiKey),
  };
}

export async function GET(request: Request) {
  const authResult = await requireThreatIntelContext(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const repository = new ThreatIntelRepository();
    const feeds = await repository.listFeeds(authResult.context.organizationId);
    return NextResponse.json({ data: feeds.map((feed) => sanitizeFeed(feed)) });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch feeds",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authResult = await requireThreatIntelContext(request, { requireMainOfficer: true });
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    let bodyRaw: unknown;
    try {
      bodyRaw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    const body =
      bodyRaw && typeof bodyRaw === "object" && !Array.isArray(bodyRaw) ? (bodyRaw as Record<string, unknown>) : {};
    const repository = new ThreatIntelRepository();

    const rawUrl = body["url"] ? String(body["url"]) : null;
    if (rawUrl) {
      const validated = await validateOutboundUrl(rawUrl, {
        allowInsecureHttp: process.env.NODE_ENV !== "production",
        allowedHosts: process.env.THREAT_INTEL_CUSTOM_FEED_ALLOWED_HOSTS
          ? process.env.THREAT_INTEL_CUSTOM_FEED_ALLOWED_HOSTS.split(",")
          : undefined,
      });
      if (!validated.ok) {
        return NextResponse.json({ error: "Invalid feed URL", message: validated.error }, { status: 400 });
      }
    }

    const feed = await repository.upsertFeed(authResult.context.organizationId, {
      name: String(body["name"] || "Custom Feed"),
      source: String(body["source"] || "CUSTOM"),
      type: coerceFeedType(String(body["type"] || "IOC")),
      format: coerceFeedFormat(String(body["format"] || "JSON")),
      url: rawUrl,
      apiKey: encryptSecret(body["apiKey"] ? String(body["apiKey"]) : null),
      syncInterval: body["syncInterval"] ? Number(body["syncInterval"]) : undefined,
      isActive: body["isActive"] !== undefined ? Boolean(body["isActive"]) : true,
      metadata:
        body["metadata"] && typeof body["metadata"] === "object" && !Array.isArray(body["metadata"])
          ? (body["metadata"] as Record<string, unknown>)
          : null,
    });

    return NextResponse.json({ data: sanitizeFeed(feed) }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to create feed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const authResult = await requireThreatIntelContext(request, { requireMainOfficer: true });
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    let bodyRaw: unknown;
    try {
      bodyRaw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
    const body =
      bodyRaw && typeof bodyRaw === "object" && !Array.isArray(bodyRaw) ? (bodyRaw as Record<string, unknown>) : {};
    const feedId = String(body["id"] || "");
    if (!feedId) {
      return NextResponse.json({ error: "Feed ID is required" }, { status: 400 });
    }

    const rawUrl =
      body["url"] !== undefined ? (body["url"] === null ? null : String(body["url"])) : undefined;
    if (typeof rawUrl === "string") {
      const validated = await validateOutboundUrl(rawUrl, {
        allowInsecureHttp: process.env.NODE_ENV !== "production",
        allowedHosts: process.env.THREAT_INTEL_CUSTOM_FEED_ALLOWED_HOSTS
          ? process.env.THREAT_INTEL_CUSTOM_FEED_ALLOWED_HOSTS.split(",")
          : undefined,
      });
      if (!validated.ok) {
        return NextResponse.json({ error: "Invalid feed URL", message: validated.error }, { status: 400 });
      }
    }

    const repository = new ThreatIntelRepository();
    const feed = await repository.updateFeed(authResult.context.organizationId, feedId, {
      isActive: body["isActive"] !== undefined ? Boolean(body["isActive"]) : undefined,
      syncInterval: body["syncInterval"] !== undefined ? Number(body["syncInterval"]) : undefined,
      checkpoint:
        body["checkpoint"] !== undefined
          ? (body["checkpoint"] === null ? null : String(body["checkpoint"]))
          : undefined,
      apiKey:
        body["apiKey"] !== undefined
          ? body["apiKey"] === null
            ? null
            : encryptSecret(String(body["apiKey"]))
          : undefined,
      url: rawUrl,
      format: body["format"] !== undefined ? coerceFeedFormat(String(body["format"])) : undefined,
    });

    return NextResponse.json({ data: sanitizeFeed(feed) });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to update feed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }
}
