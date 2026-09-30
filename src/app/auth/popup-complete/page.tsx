"use client";

import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { getSession } from "next-auth/react";
import { useEffect } from "react";
import { publishGoogleAuthPopupResult } from "@/lib/auth/google-popup-storage";

export default function GoogleAuthPopupCompletePage() {
  useEffect(() => {
    const state = new URLSearchParams(window.location.search).get("state");

    if (state) {
      void getSession()
        .then((session) => {
          publishGoogleAuthPopupResult({
            id: state,
            status: session?.user?.id ? "success" : "error",
          });
        })
        .catch(() => {
          publishGoogleAuthPopupResult({ id: state, status: "error" });
        })
        .finally(() => {
          window.setTimeout(() => window.close(), 250);
        });
      return;
    }

    window.location.replace("/login");
  }, []);

  return (
    <main className="grid min-h-svh place-items-center bg-background p-6 text-foreground">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-2 p-6 text-center">
          <Spinner
            aria-label="Verifying Google sign-in"
            className="mx-auto size-5 text-primary"
          />
          <h1 className="font-semibold text-lg">Verifying Google sign-in</h1>
          <p className="text-muted-foreground text-sm">
            Checking the sign-in response. This window will close when
            verification finishes.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
