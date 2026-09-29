"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import { publishGoogleAuthPopupResult } from "@/lib/auth/google-popup-storage";

export default function GoogleAuthPopupCompletePage() {
    useEffect(() => {
        const state = new URLSearchParams(window.location.search).get("state");

        if (state) {
            try {
                publishGoogleAuthPopupResult({ id: state, status: "success" });
            } finally {
                window.setTimeout(() => window.close(), 100);
            }
            return;
        }

        window.location.replace("/login");
    }, []);

    return (
        <main className="grid min-h-svh place-items-center bg-background p-6 text-foreground">
            <Card className="w-full max-w-sm">
                <CardContent className="space-y-2 p-6 text-center">
                    <h1 className="text-lg font-semibold">Finishing Google sign-in</h1>
                    <p className="text-sm text-muted-foreground">
                        This window will close automatically when sign-in is complete.
                    </p>
                </CardContent>
            </Card>
        </main>
    );
}
