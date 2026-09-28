import { describe, expect, it } from "vitest";
import { validateOutboundUrl } from "@/lib/security/outbound-url";

/**
 * The SSRF guard protects every user-supplied outbound URL: AI endpoints,
 * threat-feed URLs, scanner endpoints.
 */
describe("validateOutboundUrl", () => {
  it("rejects loopback and private ranges by default", async () => {
    for (const url of [
      "https://127.0.0.1/x",
      "https://10.0.0.5/x",
      "https://192.168.1.1/x",
      "https://169.254.169.254/latest/meta-data",
    ]) {
      const result = await validateOutboundUrl(url);
      expect(result.ok, `${url} should be rejected`).toBe(false);
    }
  });

  it("rejects local hostnames by default", async () => {
    for (const url of ["https://localhost/x", "https://db.internal/x", "https://box.local/x"]) {
      expect((await validateOutboundUrl(url)).ok, url).toBe(false);
    }
  });

  it("rejects non-http schemes and embedded credentials", async () => {
    expect((await validateOutboundUrl("file:///etc/passwd")).ok).toBe(false);
    expect((await validateOutboundUrl("gopher://example.com/")).ok).toBe(false);
    expect((await validateOutboundUrl("https://user:pass@example.com/")).ok).toBe(false);
  });

  it("rejects plain http unless explicitly allowed", async () => {
    expect((await validateOutboundUrl("http://example.com/")).ok).toBe(false);
    expect((await validateOutboundUrl("http://example.com/", { allowInsecureHttp: true })).ok).toBe(true);
  });

  it("permits loopback only when a caller opts in", async () => {
    // Self-hosted Ollama defaults to http://127.0.0.1:11434, so without this
    // opt-in the on-premise AI provider could never be configured at all.
    const denied = await validateOutboundUrl("http://127.0.0.1:11434", { allowInsecureHttp: true });
    expect(denied.ok).toBe(false);

    const allowed = await validateOutboundUrl("http://127.0.0.1:11434", {
      allowInsecureHttp: true,
      allowPrivateAddresses: true,
      resolveDns: false,
    });
    expect(allowed.ok).toBe(true);
  });

  it("still honours an allow-list when private addresses are permitted", async () => {
    const result = await validateOutboundUrl("http://127.0.0.1:11434", {
      allowInsecureHttp: true,
      allowPrivateAddresses: true,
      resolveDns: false,
      allowedHosts: ["ollama.internal"],
    });
    expect(result.ok).toBe(false);
  });
});
