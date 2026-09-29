"use client";

import { signIn } from "next-auth/react";
import {
    GOOGLE_AUTH_POPUP_NAME_PREFIX,
    GOOGLE_AUTH_POPUP_STORAGE_KEY,
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
    let popupCheck: number | undefined;
    let timeout: number | undefined;

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

    const onStorage = (event: StorageEvent) => {
        if (event.key !== GOOGLE_AUTH_POPUP_STORAGE_KEY || !event.newValue) {
            return;
        }

        let result: GoogleAuthPopupResult;
        try {
            result = JSON.parse(event.newValue) as GoogleAuthPopupResult;
        } catch {
            return;
        }

        if (result.id !== id || finished) {
            return;
        }

        finished = true;
        cleanup();
        window.localStorage.removeItem(GOOGLE_AUTH_POPUP_STORAGE_KEY);

        if (result.status === "success") {
            window.location.assign(redirectTo);
            return;
        }

        if (!popup.closed) {
            popup.close();
        }
        onError("Google sign-in could not be completed. Please try again.");
    };

    window.addEventListener("storage", onStorage);
    popupCheck = window.setInterval(() => {
        if (!popup.closed) {
            return;
        }
        fail("Google sign-in was closed before it finished.");
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
