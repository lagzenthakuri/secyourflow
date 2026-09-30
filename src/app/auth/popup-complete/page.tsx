"use client";

import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { useEffect } from "react";
import { publishGoogleAuthPopupResult } from "@/lib/auth/google-popup-storage";

export default function GoogleAuthPopupCompletePage() {
  useEffect(() => {
    const state = new URLSearchParams(window.location.search).get("state");

    if (state) {
      const params = new URLSearchParams(window.location.search);
      const status =
        params.has("error") || params.has("code") ? "error" : "success";

      // Auth.js only returns here after its OAuth callback has completed
      // and written the session cookie. Verify the callback URL itself
      // instead of making a second session request that can stall after
      // authentication has already succeeded.
      publishGoogleAuthPopupResult({ id: state, status });
      window.setTimeout(() => window.close(), 100);
      return;
    }

    window.location.replace("/login");
  }, []);

  return (
    <main className="grid min-h-svh place-items-center bg-background p-6 text-foreground">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-2 p-6 text-center">
          <Spinner
            aria-label="Finishing Google sign-in"
            className="mx-auto size-5 text-primary"
          />
          <h1 className="font-semibold text-lg">Finishing Google sign-in</h1>
          <p className="text-muted-foreground text-sm">
            This window will close automatically.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
