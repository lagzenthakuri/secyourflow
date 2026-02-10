import type { NextRequest } from "next/server";

export interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
}

function isLikelyIpv4Address(value: string): boolean {
  const octets = value.split(".");
  if (octets.length !== 4) return false;

  return octets.every((octet) => {
    if (!/^\d{1,3}$/.test(octet)) return false;
    const numeric = Number(octet);
    return numeric >= 0 && numeric <= 255;
  });
}

function isLikelyIpv6Address(value: string): boolean {
  if (!value.includes(":")) return false;
  if (!/^[0-9a-f:]+$/i.test(value)) return false;

  const compressedSegments = value.match(/::/g);
  if (compressedSegments && compressedSegments.length > 1) {
    return false;
  }

  const segments = value.split(":");
  if (!value.includes("::") && segments.length !== 8) {
    return false;
  }
  if (segments.length > 8) {
    return false;
  }

  return segments.every((segment) => segment === "" || /^[0-9a-f]{1,4}$/i.test(segment));
}

function isLikelyIpAddress(value: string): boolean {
  return isLikelyIpv4Address(value) || isLikelyIpv6Address(value);
}

export function normalizeIpAddress(rawValue?: string | null): string | null {
  if (!rawValue) return null;

  let value = rawValue.trim();
  if (!value) return null;

  value = value.replace(/^"+|"+$/g, "").trim();
  if (!value) return null;

  if (value.toLowerCase() === "unknown") return null;

  // RFC 7239 allows obfuscated identifiers (for=_hidden), which are not usable client IPs.
  if (value.startsWith("_")) return null;

  const bracketedWithOptionalPort = value.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketedWithOptionalPort?.[1]) {
    value = bracketedWithOptionalPort[1];
  } else {
    const ipv4WithPort = value.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
    if (ipv4WithPort?.[1]) {
      value = ipv4WithPort[1];
    }
  }

  const zoneDelimiter = value.indexOf("%");
  if (zoneDelimiter >= 0) {
    value = value.slice(0, zoneDelimiter);
  }

  const ipv4MappedIpv6 = value.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (ipv4MappedIpv6?.[1]) {
    value = ipv4MappedIpv6[1];
  }

  if (value === "::1" || value.toLowerCase() === "0:0:0:0:0:0:0:1") {
    return "127.0.0.1";
  }

  return isLikelyIpAddress(value) ? value : null;
}

export function formatIpAddress(ipAddress?: string | null): string {
  return normalizeIpAddress(ipAddress) ?? "—";
}

/**
 * Extracts IP address and user agent from NextRequest headers.
 * 
 * IP extraction order (RFC 7239 compliant):
 * 1. Forwarded header (RFC 7239)
 * 2. X-Forwarded-For (de facto standard)
 * 3. X-Real-IP (nginx)
 * 4. CF-Connecting-IP (Cloudflare)
 * 5. True-Client-IP (Akamai, Cloudflare)
 * 6. request.ip (Next.js native)
 * 
 * Security note: These headers can be spoofed. Only trust them if your
 * infrastructure (load balancer/proxy) is configured to set them correctly.
 * 
 * @param request - NextRequest object from API route
 * @returns RequestContext with ipAddress and userAgent (null if unavailable)
 */
export function extractRequestContext(request: NextRequest): RequestContext {
  const ipAddress = extractIpAddress(request);
  const userAgent = request.headers.get("user-agent") || null;

  return {
    ipAddress,
    userAgent,
  };
}

/**
 * Extracts the client IP address from request headers.
 * Handles proxy headers and multiple IP chains.
 * 
 * @param request - NextRequest object
 * @returns IP address string or null if unavailable
 */
function extractIpAddress(request: NextRequest): string | null {
  // 1. Try RFC 7239 Forwarded header
  const forwarded = request.headers.get("forwarded");
  if (forwarded) {
    const forwardedEntries = forwarded.split(",");
    for (const entry of forwardedEntries) {
      const forMatch = entry.match(/(?:^|;)\s*for=(?:"([^"]+)"|([^;,\s]+))/i);
      const candidate = forMatch?.[1] ?? forMatch?.[2] ?? null;
      const normalized = normalizeIpAddress(candidate);
      if (normalized) {
        return normalized;
      }
    }
  }

  // 2. Try X-Forwarded-For (most common)
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    // Take the first valid client IP in the chain.
    const ips = xForwardedFor.split(",");
    for (const ip of ips) {
      const normalized = normalizeIpAddress(ip);
      if (normalized) {
        return normalized;
      }
    }
  }

  // 3. Try X-Real-IP (nginx)
  const xRealIp = normalizeIpAddress(request.headers.get("x-real-ip"));
  if (xRealIp) {
    return xRealIp;
  }

  // 4. Try CF-Connecting-IP (Cloudflare)
  const cfConnectingIp = normalizeIpAddress(request.headers.get("cf-connecting-ip"));
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // 5. Try True-Client-IP (Akamai, Cloudflare Enterprise)
  const trueClientIp = normalizeIpAddress(request.headers.get("true-client-ip"));
  if (trueClientIp) {
    return trueClientIp;
  }

  // 6. Try request.ip when available (runtime-dependent)
  const requestIp = normalizeIpAddress((request as NextRequest & { ip?: string | null }).ip);
  if (requestIp) {
    return requestIp;
  }

  // No IP address could be determined
  return null;
}

/**
 * Parses user agent string to extract browser, OS, and device information.
 * This is a simple parser - for production use, consider using a library like ua-parser-js.
 * 
 * @param userAgent - User agent string
 * @returns Parsed user agent information
 */
export function parseUserAgent(userAgent?: string | null): {
  browser: string;
  os: string;
  device: string;
} {
  if (!userAgent) {
    return { browser: "—", os: "—", device: "—" };
  }

  let browser = "Unknown";
  let os = "Unknown";
  let device = "Desktop";

  // Browser detection (order matters - check specific before generic)
  if (userAgent.includes("Edg/")) browser = "Edge";
  else if (userAgent.includes("Chrome/")) browser = "Chrome";
  else if (userAgent.includes("Firefox/")) browser = "Firefox";
  else if (userAgent.includes("Safari/") && !userAgent.includes("Chrome")) browser = "Safari";
  else if (userAgent.includes("Opera/") || userAgent.includes("OPR/")) browser = "Opera";

  // OS detection
  if (userAgent.includes("Windows NT 10.0")) os = "Windows 10/11";
  else if (userAgent.includes("Windows NT 6.3")) os = "Windows 8.1";
  else if (userAgent.includes("Windows NT 6.2")) os = "Windows 8";
  else if (userAgent.includes("Windows NT 6.1")) os = "Windows 7";
  else if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("iPhone") || userAgent.includes("iPad") || userAgent.includes("iPod")) {
    const iosMatch = userAgent.match(/OS ([\d_]+)/);
    os = iosMatch ? `iOS ${iosMatch[1].replace(/_/g, ".")}` : "iOS";
  } else if (userAgent.includes("Mac OS X")) {
    const macMatch = userAgent.match(/Mac OS X ([\d_]+)/);
    os = macMatch ? `macOS ${macMatch[1].replace(/_/g, ".")}` : "macOS";
  } else if (userAgent.includes("Android")) {
    const androidMatch = userAgent.match(/Android ([\d.]+)/);
    os = androidMatch ? `Android ${androidMatch[1]}` : "Android";
  } else if (userAgent.includes("Linux")) os = "Linux";

  // Device detection
  if (userAgent.includes("iPad")) {
    device = "Tablet";
  } else if (userAgent.includes("Mobile") || userAgent.includes("Android") || userAgent.includes("iPhone")) {
    device = "Mobile";
  }

  return { browser, os, device };
}
