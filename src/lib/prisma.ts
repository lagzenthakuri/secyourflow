import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { normalizeDatabaseUrl } from "./database-url";

const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: pg.Pool | undefined;
};

// Reuse connection pool
const pool = globalForPrisma.pool ?? new pg.Pool({
  connectionString,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  // A remote database over the public internet sees latency spikes that a
  // 2s budget turns into hard failures. Long-running background work (scan
  // triage) is the main victim, so allow a realistic window.
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 15000),
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

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

// Graceful shutdown
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
    await pool.end();
  });
}

export default prisma;
