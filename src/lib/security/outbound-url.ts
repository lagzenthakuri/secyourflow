import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type OutboundUrlValidationOptions = {
  /**
   * Allow http:// URLs. This should generally only be enabled for local development.
   * Default: false
   */
  allowInsecureHttp?: boolean;
  /**
   * If provided, only these hostnames (and subdomains) are permitted.
   * Example: ["feeds.example.com", "raw.githubusercontent.com"]
   */
  allowedHosts?: string[];
  /**
   * If true, resolve DNS and reject hostnames that resolve to private/loopback/link-local addresses.
   * Default: true
   */
  resolveDns?: boolean;
};

export type OutboundUrlValidationResult =
  | { ok: true; url: URL }
  | { ok: false; error: string };

function normalizeAllowedHosts(list: string[] | undefined): string[] {
  if (!list) return [];
  return list
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function matchesAllowedHosts(hostname: string, allowedHosts: string[]): boolean {
  if (allowedHosts.length === 0) return true;
  const candidate = hostname.toLowerCase();
  return allowedHosts.some((allowed) => candidate === allowed || candidate.endsWith(`.${allowed}`));
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return ((nums[0] << 24) | (nums[1] << 16) | (nums[2] << 8) | nums[3]) >>> 0;
}

function inCidrV4(ip: string, base: string, maskBits: number): boolean {
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(base);
  if (ipInt === null || baseInt === null) return false;
  const mask = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

function isPrivateIpv4(ip: string): boolean {
  return (
    inCidrV4(ip, "0.0.0.0", 8) ||
    inCidrV4(ip, "10.0.0.0", 8) ||
    inCidrV4(ip, "100.64.0.0", 10) ||
    inCidrV4(ip, "127.0.0.0", 8) ||
    inCidrV4(ip, "169.254.0.0", 16) ||
    inCidrV4(ip, "172.16.0.0", 12) ||
    inCidrV4(ip, "192.0.0.0", 24) ||
    inCidrV4(ip, "192.0.2.0", 24) ||
    inCidrV4(ip, "192.168.0.0", 16) ||
    inCidrV4(ip, "198.18.0.0", 15) ||
    inCidrV4(ip, "198.51.100.0", 24) ||
    inCidrV4(ip, "203.0.113.0", 24) ||
    inCidrV4(ip, "224.0.0.0", 4) ||
    inCidrV4(ip, "240.0.0.0", 4) ||
    ip === "255.255.255.255"
  );
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::" || normalized === "::1" || normalized === "0:0:0:0:0:0:0:0" || normalized === "0:0:0:0:0:0:0:1") {
    return true;
  }

  // IPv4-mapped IPv6: ::ffff:127.0.0.1
  const mapped = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped?.[1]) {
    return isPrivateIpv4(mapped[1]);
  }

  // Unique local (fc00::/7) and link-local (fe80::/10)
  return normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
}

function isPrivateIpAddress(ip: string): boolean {
  const ipVersion = isIP(ip);
  if (ipVersion === 4) return isPrivateIpv4(ip);
  if (ipVersion === 6) return isPrivateIpv6(ip);
  return true;
}

async function resolveHostToIps(hostname: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const v4 = await lookup(hostname, { all: true, verbatim: true });
    results.push(...v4.map((entry) => entry.address));
  } catch {
    // ignore; handled by empty result
  }
  return Array.from(new Set(results));
}

export async function validateOutboundUrl(
  rawUrl: string,
  options: OutboundUrlValidationOptions = {},
): Promise<OutboundUrlValidationResult> {
  const allowInsecureHttp = options.allowInsecureHttp ?? false;
  const resolveDns = options.resolveDns ?? true;
  const allowedHosts = normalizeAllowedHosts(options.allowedHosts);

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, error: "Invalid URL." };
  }

  if (url.username || url.password) {
    return { ok: false, error: "Credentials in URL are not allowed." };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "Only http(s) URLs are allowed." };
  }

  if (url.protocol === "http:" && !allowInsecureHttp) {
    return { ok: false, error: "Insecure http:// URLs are not allowed." };
  }

  let hostname = url.hostname.trim().toLowerCase();
  if (!hostname) {
    return { ok: false, error: "URL hostname is required." };
  }

  // Node's URL.hostname for IPv6 literals includes brackets (e.g. "[::1]").
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    hostname = hostname.slice(1, -1);
  }

  // Basic hostname blocks (common SSRF targets/misconfigs).
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return { ok: false, error: "Local/internal hostnames are not allowed." };
  }

  if (!matchesAllowedHosts(hostname, allowedHosts)) {
    return { ok: false, error: "Hostname is not in the allowed list." };
  }

  // If the hostname is an IP literal, validate it directly.
  if (isIP(hostname)) {
    if (isPrivateIpAddress(hostname)) {
      return { ok: false, error: "Private or local IP addresses are not allowed." };
    }
    return { ok: true, url };
  }

  if (resolveDns) {
    const ips = await resolveHostToIps(hostname);
    if (ips.length === 0) {
      return { ok: false, error: "Hostname could not be resolved." };
    }
    if (ips.some((ip) => isPrivateIpAddress(ip))) {
      return { ok: false, error: "Hostname resolves to a private or local IP address." };
    }
  }

  return { ok: true, url };
}

export async function assertSafeOutboundUrl(
  rawUrl: string,
  options: OutboundUrlValidationOptions = {},
): Promise<URL> {
  const result = await validateOutboundUrl(rawUrl, options);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.url;
}
