const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

export async function register() {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_RUNTIME !== "nodejs" ||
    !sentryDsn
  ) return;

  const { initializeNodeSentry } = await import(
    "./src/lib/observability/sentry-node"
  );
  initializeNodeSentry(sentryDsn);
}

export async function onRequestError(
  error: unknown,
  request: unknown,
  context: unknown,
) {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_RUNTIME !== "nodejs" ||
    !sentryDsn
  ) return;

  const { captureNodeRequestError } = await import(
    "./src/lib/observability/sentry-node"
  );
  return captureNodeRequestError(error, request, context);
}
