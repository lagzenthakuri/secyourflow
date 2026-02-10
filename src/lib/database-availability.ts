const DEFAULT_DB_COOLDOWN_MS = 30_000;

const globalState = globalThis as typeof globalThis & {
  __dbUnavailableUntil?: number;
};

const dbUnavailablePatterns = [
  "planlimitreached",
  "failed to identify your database",
  "connection terminated",
  "connection timeout",
  "connection terminated unexpectedly",
  "can't reach database server",
  "server closed the connection unexpectedly",
];

function getCooldownWindowMs(): number {
  const parsed = Number.parseInt(process.env.DATABASE_UNAVAILABLE_COOLDOWN_MS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DB_COOLDOWN_MS;
}

function extractErrorText(error: unknown): string {
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();
  const fragments: string[] = [];

  while (queue.length > 0) {
    const value = queue.shift();
    if (value == null) {
      continue;
    }

    if (typeof value === "string") {
      fragments.push(value.toLowerCase());
      continue;
    }

    if (typeof value !== "object") {
      continue;
    }

    if (seen.has(value)) {
      continue;
    }
    seen.add(value);

    if (value instanceof Error) {
      if (value.message) {
        fragments.push(value.message.toLowerCase());
      }

      const cause = (value as Error & { cause?: unknown }).cause;
      if (cause !== undefined) {
        queue.push(cause);
      }

      continue;
    }

    const candidate = value as Record<string, unknown>;
    for (const key of ["message", "detail", "hint", "code", "severity", "routine"]) {
      const fieldValue = candidate[key];
      if (typeof fieldValue === "string") {
        fragments.push(fieldValue.toLowerCase());
      }
    }

    if ("cause" in candidate) {
      queue.push(candidate.cause);
    }
  }

  return fragments.join(" ");
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  const text = extractErrorText(error);
  if (!text) {
    return false;
  }

  return dbUnavailablePatterns.some((pattern) => text.includes(pattern));
}

export function isDatabaseUnavailableInCooldown(): boolean {
  return (globalState.__dbUnavailableUntil ?? 0) > Date.now();
}

export function markDatabaseUnavailable(): boolean {
  const now = Date.now();
  const wasUnavailable = (globalState.__dbUnavailableUntil ?? 0) > now;
  globalState.__dbUnavailableUntil = now + getCooldownWindowMs();
  return !wasUnavailable;
}

export function clearDatabaseUnavailable(): void {
  globalState.__dbUnavailableUntil = 0;
}
