type RuntimeModuleApi = {
  createRequire: (filename: string) => (specifier: string) => unknown;
};

type SentrySdk = {
  init: (options: Record<string, unknown>) => void;
  consoleLoggingIntegration: (options: { levels: string[] }) => unknown;
  captureRequestError: (
    error: unknown,
    request: unknown,
    context: unknown,
  ) => unknown;
};

function loadSentry(): SentrySdk {
  const moduleApi = process.getBuiltinModule?.("module") as
    | RuntimeModuleApi
    | undefined;
  if (!moduleApi) throw new Error("The Node.js module loader is unavailable");

  const require = moduleApi.createRequire(`${process.cwd()}/package.json`);
  const packageName = ["@", "sentry", "nextjs"].join("/");
  return require(packageName) as SentrySdk;
}

export function initializeNodeSentry(dsn: string) {
  const sentry = loadSentry();
  sentry.init({
    dsn,
    enableLogs: true,
    tracesSampleRate: 1,
    debug: false,
    includeLocalVariables: true,
    integrations: [
      sentry.consoleLoggingIntegration({ levels: ["log", "error", "warn"] }),
    ],
  });
}

export function captureNodeRequestError(
  error: unknown,
  request: unknown,
  context: unknown,
) {
  return loadSentry().captureRequestError(error, request, context);
}
