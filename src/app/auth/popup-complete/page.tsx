"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { publishGoogleAuthPopupResult } from "@/lib/auth/google-popup-storage";

export default function GoogleAuthPopupCompletePage() {
  useEffect(() => {
    const state = new URLSearchParams(window.location.search).get("state");

    if (state) {
            const controller = new AbortController();
            const timeout = window.setTimeout(() => controller.abort(), 5000);

            void fetch("/api/auth/popup-status", {
                cache: "no-store",
                credentials: "same-origin",
                signal: controller.signal,
            })
                .then((response) => response.ok ? response.json() : Promise.reject())
                .then((result: { authenticated?: boolean }) => {
                    publishGoogleAuthPopupResult({ id: state, status: result.authenticated ? "success" : "error" });
                })
                .catch(() => {
                    publishGoogleAuthPopupResult({ id: state, status: "error" });
                })
                .finally(() => {
                    window.clearTimeout(timeout);
                    window.setTimeout(() => window.close(), 100);
                });
            return;
        }

    window.location.replace("/login");
  }, []);

    return (
        <main className="grid min-h-svh place-items-center bg-background p-6 text-foreground">
            <Card className="w-full max-w-sm">
                <CardContent className="space-y-2 p-6 text-center">
                    <Spinner aria-label="Verifying Google sign-in" className="mx-auto size-5 text-primary" />
                    <h1 className="text-lg font-semibold">Finishing Google sign-in</h1>
                    <p className="text-sm text-muted-foreground">
                        Confirming your account. This window will close automatically.
                    </p>
                </CardContent>
            </Card>
        </main>
    );
}
