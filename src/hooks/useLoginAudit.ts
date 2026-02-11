import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

/**
 * Hook to audit user login events with IP and user agent information.
 * 
 * This hook calls the audit-login API endpoint once per session to log
 * the user's login with their IP address and user agent.
 * 
 * Deduplication: Uses sessionStorage to ensure we only log once per session.
 */
export function useLoginAudit() {
  const { data: session, status } = useSession();
  const hasLoggedRef = useRef(false);

  useEffect(() => {
    // Only proceed if authenticated and haven't logged yet
    if (status !== "authenticated" || !session?.user || hasLoggedRef.current) {
      return;
    }

    // Check sessionStorage to prevent duplicate logs across page navigations
    const sessionKey = `login-audited-${session.user.id}`;
    const alreadyLogged = sessionStorage.getItem(sessionKey);

    if (alreadyLogged) {
      hasLoggedRef.current = true;
      return;
    }

    // Call the audit endpoint
    fetch("/api/auth/audit-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (response.ok) {
          // Mark as logged in sessionStorage
          sessionStorage.setItem(sessionKey, "true");
          hasLoggedRef.current = true;
        }
      })
      .catch((error) => {
        console.error("Failed to audit login:", error);
      });
  }, [session, status]);
}
