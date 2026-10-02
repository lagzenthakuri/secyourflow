"use client";

import { signOut } from "next-auth/react";

let loginRedirect: Promise<void> | null = null;

/** Clear stale cookies before navigating, including sessions revoked on the server. */
export function redirectToLogin(): Promise<void> {
  if (!loginRedirect) {
    const callbackUrl = window.location.pathname + window.location.search;
    const loginUrl = `/login?${new URLSearchParams({ callbackUrl })}`;
    loginRedirect = signOut({ redirect: false })
      .then(() => window.location.replace(loginUrl))
      .catch(() => {
        window.location.replace(loginUrl);
      });
  }
  return loginRedirect;
}

/** Only authentication failures should send users through authentication again. */
export async function handleSessionFailure(
  response: Response
): Promise<boolean> {
  if (response.status === 401) {
    redirectToLogin();
    return true;
  }

  if (response.status === 403) {
    const payload = await response
      .clone()
      .json()
      .catch(() => null);
    if (payload?.error === "Two-factor authentication required") {
      window.location.replace("/auth/2fa");
      return true;
    }
  }

  return false;
}
