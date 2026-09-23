import type { Redis } from "ioredis";
import { getReadyRedisCommandClient, isRedisConfigured } from "@/lib/queue/connection";

/**
 * Rate limiting for authentication and 2FA.
 *
 * This is a security control, not an optimisation: it is what stands between
 * an attacker and unlimited password or TOTP guesses. The previous version
 * kept counters in a process-local Map, so with N replicas the effective limit
 * was N x maxAttempts and every restart reset it to zero.
 *
 * With REDIS_URL set the counters are shared across the fleet. Without it the
 * in-memory fallback still applies — correct for a single-process deployment,
 * and no worse than before anywhere else.
 */

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

type Bucket = { attempts: number; resetAt: number };

const memoryBuckets = new Map<string, Bucket>();

function sweepMemory(now: number) {
  if (memoryBuckets.size < 512) return;
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.resetAt <= now) {
      memoryBuckets.delete(key);
    }
  }
}

function consumeInMemory(key: string, maxAttempts: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweepMemory(now);

  const existing = memoryBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    memoryBuckets.set(key, { attempts: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(maxAttempts - 1, 0) };
  }

  if (existing.attempts >= maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1),
    };
  }

  existing.attempts += 1;
  return { allowed: true, remaining: Math.max(maxAttempts - existing.attempts, 0) };
}

const REDIS_PREFIX = "ratelimit:";

/**
 * Increments a counter and applies the window on first use.
 *
 * INCR followed by a conditional EXPIRE is atomic enough here: whichever
 * replica sees the counter hit 1 sets the TTL, and a lost race only shortens
 * the window by the round-trip, never disables the limit.
 */
async function consumeInRedis(
  redis: Redis,
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const redisKey = `${REDIS_PREFIX}${key}`;

  const attempts = await redis.incr(redisKey);
  if (attempts === 1) {
    await redis.pexpire(redisKey, windowMs);
  }

  if (attempts > maxAttempts) {
    const ttlMs = await redis.pttl(redisKey);
    // -1 means the key exists with no TTL; re-arm it rather than locking forever.
    if (ttlMs < 0) {
      await redis.pexpire(redisKey, windowMs);
    }
    return {
      allowed: false,
      retryAfterSeconds: Math.max(Math.ceil((ttlMs > 0 ? ttlMs : windowMs) / 1000), 1),
    };
  }

  return { allowed: true, remaining: Math.max(maxAttempts - attempts, 0) };
}

/** Upper bound on how long Redis may hold up a login or a 2FA challenge. */
const REDIS_READY_DEADLINE_MS = 500;
const REDIS_DEADLINE_MS = 1_500;
const REDIS_FALLBACK_LOG_INTERVAL_MS = 60_000;
let lastRedisFallbackLoggedAt = 0;

function getRedisFailureMessage(error: unknown): string {
  if (error instanceof AggregateError) {
    return error.errors.map(getRedisFailureMessage).filter(Boolean).join("; ") || "Connection failed";
  }

  return error instanceof Error && error.message ? error.message : "Connection failed";
}

/**
 * Caps a Redis round trip.
 *
 * The client is configured to reject rather than buffer, but a half-open
 * socket can still stall past its command timeout, and this code sits in front
 * of the login form: a stalled counter must degrade, never hang the request.
 */
function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Redis timed out")), REDIS_DEADLINE_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function consumeRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (!isRedisConfigured()) {
    return consumeInMemory(key, maxAttempts, windowMs);
  }

  try {
    const redis = await getReadyRedisCommandClient(REDIS_READY_DEADLINE_MS);
    if (!redis) {
      throw new Error("Redis connection is not ready");
    }

    return await withTimeout(consumeInRedis(redis, key, maxAttempts, windowMs));
  } catch (error) {
    // Falling open would remove brute-force protection entirely, so degrade to
    // the local counter instead. Rate-limit the diagnostic because every login
    // can otherwise produce another noisy stack trace while Redis is down.
    const now = Date.now();
    if (now - lastRedisFallbackLoggedAt > REDIS_FALLBACK_LOG_INTERVAL_MS) {
      lastRedisFallbackLoggedAt = now;
      console.error(`[rate-limit] Redis unavailable; using in-memory limiter: ${getRedisFailureMessage(error)}`);
    }
    return consumeInMemory(key, maxAttempts, windowMs);
  }
}

/** Clears a counter after a successful authentication. */
export async function resetRateLimit(key: string): Promise<void> {
  memoryBuckets.delete(key);

  if (!isRedisConfigured()) return;

  try {
    const redis = await getReadyRedisCommandClient(REDIS_READY_DEADLINE_MS);
    if (redis) {
      await withTimeout(redis.del(`${REDIS_PREFIX}${key}`));
    }
  } catch {
    // A successful authentication has already removed the local counter. A
    // Redis cleanup failure must never turn that success into an auth error.
  }
}
