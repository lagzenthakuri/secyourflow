/** Return a same-origin app path, rejecting URL forms browsers normalize externally. */
export function getSafeCallbackUrl(
  callbackUrl: string | null | undefined,
  origin: string,
): string {
  if (
    !callbackUrl ||
    !callbackUrl.startsWith("/") ||
    callbackUrl.startsWith("//") ||
    callbackUrl.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(callbackUrl)
  ) {
    return "/dashboard";
  }

  try {
    const parsed = new URL(callbackUrl, origin);
    return parsed.origin === origin ? `${parsed.pathname}${parsed.search}${parsed.hash}` : "/dashboard";
  } catch {
    return "/dashboard";
  }
}
