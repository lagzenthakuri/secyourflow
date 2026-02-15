/* eslint-disable no-console */
import { validateOutboundUrl } from "../src/lib/security/outbound-url";

function fail(message: string): never {
  console.error(`SECURITY VERIFY FAIL: ${message}`);
  process.exit(1);
}

async function expectBlocked(url: string) {
  const result = await validateOutboundUrl(url, { allowInsecureHttp: true, resolveDns: false });
  if (result.ok) {
    fail(`expected blocked: ${url}`);
  }
}

async function expectAllowed(url: string, opts?: Parameters<typeof validateOutboundUrl>[1]) {
  const result = await validateOutboundUrl(url, { resolveDns: false, ...(opts ?? {}) });
  if (!result.ok) {
    fail(`expected allowed: ${url} (${result.error})`);
  }
}

async function main() {
  // SSRF primitives: localhost/private IPs should be blocked.
  await expectBlocked("http://localhost:3000/api/health");
  await expectBlocked("http://127.0.0.1:3000/");
  await expectBlocked("https://10.0.0.1/");
  await expectBlocked("https://192.168.1.5/");
  await expectBlocked("https://[::1]/");
  await expectBlocked("https://example.local/");
  await expectBlocked("https://service.internal/");

  // Non-http(s) schemes and URL credentials should be blocked.
  await expectBlocked("file:///etc/passwd");
  await expectBlocked("https://user:pass@example.com/path");

  // https enforced by default
  await expectAllowed("https://1.1.1.1/");
  const httpDefault = await validateOutboundUrl("http://1.1.1.1/", { resolveDns: false });
  if (httpDefault.ok) {
    fail("expected http:// blocked by default");
  }

  // Optional hostname allowlist
  await expectAllowed("https://feeds.example.com/data.json", { allowedHosts: ["example.com"] });
  const denied = await validateOutboundUrl("https://evil.com/data.json", { allowedHosts: ["example.com"], resolveDns: false });
  if (denied.ok) {
    fail("expected allowlist deny");
  }

  console.log("SECURITY VERIFY PASS");
}

void main().catch((error) => {
  console.error("SECURITY VERIFY ERROR:", error);
  process.exit(1);
});

