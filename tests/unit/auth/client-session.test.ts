import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { signOut, replace } = vi.hoisted(() => ({
  signOut: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("next-auth/react", () => ({ signOut }));

beforeEach(() => {
  vi.resetModules();
  signOut.mockReset().mockResolvedValue({});
  replace.mockReset();
  vi.stubGlobal("window", {
    location: { pathname: "/dashboard", search: "?view=risk", replace },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("client session recovery", () => {
  it("clears the stale session before redirecting and preserves the destination", async () => {
    let finish!: () => void;
    signOut.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      })
    );
    const { handleSessionFailure, redirectToLogin } = await import(
      "@/lib/auth/client-session"
    );
    expect(
      await handleSessionFailure(new Response(null, { status: 401 }))
    ).toBe(true);
    expect(replace).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    await handleSessionFailure(new Response(null, { status: 401 }));
    expect(signOut).toHaveBeenCalledTimes(1);
    finish();
    await redirectToLogin();
    expect(replace).toHaveBeenCalledWith(
      "/login?callbackUrl=%2Fdashboard%3Fview%3Drisk"
    );
  });

  it("still navigates if sign-out fails", async () => {
    signOut.mockRejectedValue(new Error("network unavailable"));
    const { redirectToLogin } = await import("@/lib/auth/client-session");
    await redirectToLogin();
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("routes a two-factor challenge without logging out or consuming the response", async () => {
    const { handleSessionFailure } = await import("@/lib/auth/client-session");
    const response = Response.json(
      { error: "Two-factor authentication required" },
      { status: 403 }
    );
    expect(await handleSessionFailure(response)).toBe(true);
    expect(replace).toHaveBeenCalledWith("/auth/2fa");
    expect(signOut).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      error: "Two-factor authentication required",
    });
  });

  it.each([
    200, 403, 500, 503,
  ])("does not log out for status %s", async (status) => {
    const { handleSessionFailure } = await import("@/lib/auth/client-session");
    expect(
      await handleSessionFailure(
        Response.json({ error: "Service unavailable" }, { status })
      )
    ).toBe(false);
    expect(signOut).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
