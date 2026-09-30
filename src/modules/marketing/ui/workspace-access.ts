import { isPublicRegistrationEnabled } from "@/lib/auth/registration-policy";

export function getWorkspaceAccess(registrationEnabled = isPublicRegistrationEnabled()) {
  return registrationEnabled
    ? { href: "/signup", label: "Create a workspace", description: "Create an account to use the workspace." }
    : { href: "/contact", label: "Request access", description: "Workspace access is by invitation. Contact Shyena Technologies to request one." };
}
