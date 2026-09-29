export const GOOGLE_AUTH_POPUP_STORAGE_PREFIX = "secyourflow:google-auth-popup:";
export const GOOGLE_AUTH_POPUP_NAME_PREFIX = "secyourflow-google-auth:";

export function googleAuthPopupStorageKey(id: string): string {
    return `${GOOGLE_AUTH_POPUP_STORAGE_PREFIX}${id}`;
}

export interface GoogleAuthPopupResult {
    id: string;
    status: "success" | "error";
}

export function publishGoogleAuthPopupResult(result: GoogleAuthPopupResult): void {
    window.localStorage.setItem(googleAuthPopupStorageKey(result.id), JSON.stringify(result));
}
