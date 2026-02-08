type Bucket = {
    attempts: number;
    resetAt: number;
};

const buckets = new Map<string, Bucket>();

function cleanupExpired(now: number) {
    if (buckets.size < 512) {
        return;
    }

    for (const [key, bucket] of buckets.entries()) {
        if (bucket.resetAt <= now) {
            buckets.delete(key);
        }
    }
}

export function consumeRateLimit(
    key: string,
    maxAttempts: number,
    windowMs: number,
): { allowed: true; remaining: number } | { allowed: false; retryAfterSeconds: number } {
    const now = Date.now();
    cleanupExpired(now);

    const existing = buckets.get(key);
    if (!existing || existing.resetAt <= now) {
        buckets.set(key, {
            attempts: 1,
            resetAt: now + windowMs,
        });
        return { allowed: true, remaining: Math.max(maxAttempts - 1, 0) };
    }

    if (existing.attempts >= maxAttempts) {
        return {
            allowed: false,
            retryAfterSeconds: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1),
        };
    }

    existing.attempts += 1;
    buckets.set(key, existing);

    return { allowed: true, remaining: Math.max(maxAttempts - existing.attempts, 0) };
}

export function resetRateLimit(key: string): void {
    buckets.delete(key);
}
