"use client";

import { signIn } from "next-auth/react";
import {
    GOOGLE_AUTH_POPUP_NAME_PREFIX,
    googleAuthPopupStorageKey,
    type GoogleAuthPopupResult,
} from "./google-popup-storage";

interface GoogleAuthPopupOptions {
    onError: (message: string) => void;
    onStart: () => void;
    redirectTo?: string;
}

const POPUP_TIMEOUT_MS = 2 * 60 * 1000;

export function openGoogleAuthPopup({
    onError,
    onStart,
    redirectTo = "/dashboard",
}: GoogleAuthPopupOptions): void {
    const id = window.crypto.randomUUID();
    const popup = window.open(
        "about:blank",
        `${GOOGLE_AUTH_POPUP_NAME_PREFIX}${id}`,
        "popup,width=520,height=680,resizable=yes,scrollbars=yes",
    );

    if (!popup) {
        onError("Allow pop-ups for this site to continue with Google.");
        return;
    }

    onStart();
    let finished = false;
    let timeout: number | undefined;
    const resultKey = googleAuthPopupStorageKey(id);

    const cleanup = () => {
        window.removeEventListener("storage", onStorage);
        if (timeout !== undefined) {
            window.clearTimeout(timeout);
        }
    };

    const fail = (message: string) => {
        if (finished) {
            return;
        }
        finished = true;
        cleanup();
        if (!popup.closed) {
            popup.close();
        }
        onError(message);
    };

    const handleResult = (serialized: string | null) => {
        if (!serialized || finished) return;
        let result: GoogleAuthPopupResult;
        try {
            result = JSON.parse(serialized) as GoogleAuthPopupResult;
        } catch {
            return;
        }

        if (result.id !== id) {
            return;
        }

        finished = true;
        cleanup();
        window.localStorage.removeItem(resultKey);

        if (result.status === "success") {
            window.location.assign(redirectTo);
            return;
        }

        if (!popup.closed) {
            popup.close();
        }
        onError("Google sign-in could not be completed. Please try again.");
    };

    const onStorage = (event: StorageEvent) => {
        if (event.key === resultKey) handleResult(event.newValue);
    };

    // Do not use WindowProxy.closed to infer cancellation. Browsers can sever
    // the opener relationship when OAuth crosses origins and report the
    // Google window as closed even while it is still returning to this app.
    // The same-origin completion page publishes the verified result instead.
    window.addEventListener("storage", onStorage);
    timeout = window.setTimeout(() => {
        handleResult(window.localStorage.getItem(resultKey));
        if (!finished) fail("Google sign-in timed out. Please try again.");
    }, POPUP_TIMEOUT_MS);

    void signIn("google", {
        redirect: false,
        redirectTo: `/auth/popup-complete?state=${encodeURIComponent(id)}`,
    })
        .then((response) => {
            if (!response?.ok || !response.url) {
                fail("Google sign-in could not be started. Please try again.");
                return;
            }
            popup.location.assign(response.url);
        })
        .catch(() => {
            fail("Google sign-in could not be started. Please try again.");
        });
}
