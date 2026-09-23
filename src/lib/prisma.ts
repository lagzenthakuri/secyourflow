import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { normalizeDatabaseUrl } from "./database-url";

const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL);
const runningInServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

function positiveIntegerFromEnv(name: string, fallback: number): number {
    const parsed = Number.parseInt(process.env[name] ?? "", 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

// A Vercel function can create many independent pools across concurrent
// instances. Twenty direct connections per instance will exhaust a normal
// PostgreSQL server, so serverless deployments default to one connection and
// should point DATABASE_URL at the provider's pooled endpoint.
const poolMax = positiveIntegerFromEnv("DB_POOL_MAX", runningInServerless ? 1 : 20);
const connectionTimeoutMs = positiveIntegerFromEnv(
    "DB_CONNECT_TIMEOUT_MS",
    runningInServerless ? 5_000 : 15_000,
);
const idleTimeoutMs = positiveIntegerFromEnv("DB_IDLE_TIMEOUT_MS", runningInServerless ? 10_000 : 30_000);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

// Reuse connection pool
const pool = globalForPrisma.pool ?? new pg.Pool({
  connectionString,
  max: poolMax,
  idleTimeoutMillis: idleTimeoutMs,
  // Fail inside the Vercel function budget instead of letting Auth.js turn a
  // timed-out connection into a late CallbackRouteError/Configuration redirect.
  connectionTimeoutMillis: connectionTimeoutMs,
  allowExitOnIdle: runningInServerless,
  // Keepalives stop idle pooled sockets from being silently dropped by
  // intermediate NAT/firewalls, which surfaces as EHOSTUNREACH on reuse.
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// A pool-level error would otherwise be an unhandled rejection and take the
// process down when a backend connection dies mid-flight.
pool.on("error", (error) => {
  console.error("[prisma] idle client error:", error.message);
});

const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' 
    ? ['error', 'warn'] 
    : ['error'],
  errorFormat: 'minimal',
});

// Cached in every environment, not just development.
//
// The guard used to be `NODE_ENV !== "production"`, which is the dev-HMR idiom
// applied backwards: in production each module-graph instantiation built a
// fresh PrismaClient and a fresh 20-connection pool, so connection use grew
// with the number of loaded route bundles rather than with replicas.
globalForPrisma.prisma = prisma;
globalForPrisma.pool = pool;

// Graceful shutdown.
//
// `beforeExit` does not fire on SIGTERM, which is exactly how a container is
// stopped, and registering it per module instantiation also tripped
// MaxListenersExceededWarning.
const globalForShutdown = globalThis as unknown as { __prismaShutdownBound?: boolean };

if (typeof window === "undefined" && !globalForShutdown.__prismaShutdownBound) {
  globalForShutdown.__prismaShutdownBound = true;

  const disconnect = async () => {
    await prisma.$disconnect().catch(() => undefined);
    await pool.end().catch(() => undefined);
  };

  process.once("SIGTERM", () => void disconnect());
  process.once("SIGINT", () => void disconnect());
}

export default prisma;
