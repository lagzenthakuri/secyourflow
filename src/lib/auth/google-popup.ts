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
    let popupClosedAt: number | undefined;
    let popupCheck: number | undefined;
    let timeout: number | undefined;
    const resultKey = googleAuthPopupStorageKey(id);

    const cleanup = () => {
        window.removeEventListener("storage", onStorage);
        if (popupCheck !== undefined) {
            window.clearInterval(popupCheck);
        }
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

    window.addEventListener("storage", onStorage);
    popupCheck = window.setInterval(() => {
        // Read the completion signal before inspecting the popup. OAuth can
        // publish its result and close in the same task, racing the storage
        // event against this polling interval.
        handleResult(window.localStorage.getItem(resultKey));
        if (finished || !popup.closed) {
            popupClosedAt = undefined;
            return;
        }

        // Some browsers briefly report a popup as closed while its browsing
        // context is being isolated/replaced. Give the callback time to
        // publish its validated result before treating this as cancellation.
        popupClosedAt ??= Date.now();
        if (Date.now() - popupClosedAt >= 2_000) {
            handleResult(window.localStorage.getItem(resultKey));
            if (!finished) fail("Google sign-in was closed before it finished.");
        }
    }, 500);
    timeout = window.setTimeout(() => {
        fail("Google sign-in timed out. Please try again.");
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
