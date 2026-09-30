import { describe, expect, it } from "vitest";
import { getWorkspaceAccess } from "@/modules/marketing/ui/workspace-access";

describe("workspace access calls to action", () => {
  it("offers account creation while registration is enabled", () => {
    expect(getWorkspaceAccess(true)).toMatchObject({ href: "/signup", label: "Create a workspace" });
  });

  it("points to contact when access is invitation-only", () => {
    expect(getWorkspaceAccess(false)).toMatchObject({ href: "/contact", label: "Request access" });
    expect(getWorkspaceAccess(false).description).toContain("by invitation");
  });
});
