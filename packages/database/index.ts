import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { normalizeDatabaseUrl } from "./database-url";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  pool?: pg.Pool;
  prismaShutdownBound?: boolean;
};

const runningInServerless = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
);
const developmentPoolSize = process.env.NODE_ENV === "development" ? 3 : 5;
const positiveIntegerFromEnv = (name: string, fallback: number) => {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const pool =
  globalForPrisma.pool ??
  new pg.Pool({
    connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL),
    // Prisma Postgres uses a managed pool in front of the database. A large
    // per-process client pool can overwhelm that shared pool, especially in
    // Next dev where several route workers may be active at once.
    max: positiveIntegerFromEnv(
      "DB_POOL_MAX",
      runningInServerless ? 1 : developmentPoolSize
    ),
    idleTimeoutMillis: positiveIntegerFromEnv(
      "DB_IDLE_TIMEOUT_MS",
      runningInServerless ? 10_000 : 30_000
    ),
    connectionTimeoutMillis: positiveIntegerFromEnv(
      "DB_CONNECT_TIMEOUT_MS",
      5000
    ),
    allowExitOnIdle: runningInServerless,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });

if (!globalForPrisma.pool) {
  pool.on("error", (error) => {
    console.error("[prisma] idle client error:", error.message);
  });
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    errorFormat: "minimal",
  });

globalForPrisma.prisma = prisma;
globalForPrisma.pool = pool;

if (typeof window === "undefined" && !globalForPrisma.prismaShutdownBound) {
  globalForPrisma.prismaShutdownBound = true;
  const disconnect = async () => {
    await prisma.$disconnect().catch(() => undefined);
    await pool.end().catch(() => undefined);
  };
  process.once("SIGTERM", () => void disconnect());
  process.once("SIGINT", () => void disconnect());
}

export { prisma as database };
export * from "@prisma/client";
