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
}
