"use client";

import { useEffect, useState } from "react";

export function useAuthProviders(): { googleEnabled: boolean } {
    const [googleEnabled, setGoogleEnabled] = useState(false);

    useEffect(() => {
        let cancelled = false;

        fetch("/api/auth/providers", { cache: "no-store" })
            .then((response) => (response.ok ? response.json() : null))
            .then((providers: Record<string, unknown> | null) => {
                if (!cancelled && providers && "google" in providers) {
                    setGoogleEnabled(true);
                }
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, []);

    return { googleEnabled };
}
