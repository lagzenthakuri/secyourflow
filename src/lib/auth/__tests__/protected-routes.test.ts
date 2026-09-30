import { describe, expect, it } from "vitest";
import { isProtectedAppRoute } from "@/lib/auth/protected-routes";

describe("isProtectedAppRoute", () => {
  it.each([
    "/dashboard",
    "/dashboard/views",
    "/risk-appetite",
    "/policies/123",
    "/vendors",
    "/vendors/123",
    "/data",
    "/nis2/governance",
    "/licensing",
  ])("protects %s", (pathname) => {
    expect(isProtectedAppRoute(pathname)).toBe(true);
  });

  it.each([
    "/",
    "/login",
    "/signup",
    "/features/assets",
    "/vendor-guides",
    "/data-policy",
  ])("leaves %s public", (pathname) => {
    expect(isProtectedAppRoute(pathname)).toBe(false);
  });
});
