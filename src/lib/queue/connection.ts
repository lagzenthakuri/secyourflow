import IORedis, { type Redis } from "ioredis";

/**
 * Redis is optional.
 *
 * With REDIS_URL set, jobs go through BullMQ and web/worker scale
 * independently. Without it — the single-container appliance build — jobs run
 * in-process instead. Every caller must therefore tolerate both modes.
 */
export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

let sharedConnection: Redis | null = null;

/**
 * Connection shared by the queue producers.
 *
 * BullMQ workers need `maxRetriesPerRequest: null` (they hold blocking reads
 * open), and re-using one client for the whole process keeps the connection
 * count proportional to replicas rather than to queues.
 */
export function getRedisConnection(): Redis {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    throw new Error("REDIS_URL is not configured");
  }

  if (!sharedConnection) {
    sharedConnection = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    sharedConnection.on("error", (error) => {
      console.error("[queue] redis error:", error.message);
    });
  }

  return sharedConnection;
}

/**
 * Client for short commands issued from the request path (rate limiting).
 *
 * Deliberately not the BullMQ connection. BullMQ requires
 * `maxRetriesPerRequest: null`, and with that option ioredis buffers commands
 * indefinitely while Redis is unreachable: the promise never settles, so a
 * caller's try/catch never runs and the HTTP request hangs instead of
 * degrading. These options make a command reject in about a second so callers
 * can fall back.
 */
let commandClient: Redis | null = null;
let lastCommandClientErrorLoggedAt = 0;

export function getRedisCommandClient(): Redis {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    throw new Error("REDIS_URL is not configured");
  }

  if (!commandClient) {
    commandClient = new IORedis(url, {
      maxRetriesPerRequest: 1,
      // Reject while disconnected rather than queueing until the socket is back.
      enableOfflineQueue: false,
      enableReadyCheck: false,
      connectTimeout: 1_000,
      commandTimeout: 1_000,
      retryStrategy: (attempt) => Math.min(attempt * 500, 10_000),
    });

    commandClient.on("error", (error) => {
      // Reconnect attempts are continuous while Redis is down; one line per
      // minute is enough to diagnose without burying every other log.
      const now = Date.now();
      if (now - lastCommandClientErrorLoggedAt > 60_000) {
        lastCommandClientErrorLoggedAt = now;
        console.error("[redis] command client unavailable:", error.message || error);
      }
    });
  }

  return commandClient;
}

/** Workers need their own blocking connection, separate from the producer's. */
export function createRedisConnection(): Redis {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    throw new Error("REDIS_URL is not configured");
  }

  const connection = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  connection.on("error", (error) => {
    console.error("[queue] redis error:", error.message);
  });

  return connection;
}

export async function closeRedisConnection(): Promise<void> {
  if (sharedConnection) {
    await sharedConnection.quit().catch(() => undefined);
    sharedConnection = null;
  }

  if (commandClient) {
    await commandClient.quit().catch(() => undefined);
    commandClient = null;
  }
}
