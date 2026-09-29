export const GOOGLE_AUTH_POPUP_STORAGE_KEY = "secyourflow:google-auth-popup";
export const GOOGLE_AUTH_POPUP_NAME_PREFIX = "secyourflow-google-auth:";

export interface GoogleAuthPopupResult {
    id: string;
    status: "success" | "error";
}

export function publishGoogleAuthPopupResult(result: GoogleAuthPopupResult): void {
    window.localStorage.setItem(GOOGLE_AUTH_POPUP_STORAGE_KEY, JSON.stringify(result));
}
