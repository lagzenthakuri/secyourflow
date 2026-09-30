import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * Rate limiting tests.
 *
 * Tests the rate limiting implementation that protects authentication
 * endpoints from brute-force attacks.
 */

const mockIsRedisConfigured = vi.fn();
const mockGetReadyRedisCommandClient = vi.fn();

vi.mock("@/lib/queue/connection", () => ({
  isRedisConfigured: mockIsRedisConfigured,
  getReadyRedisCommandClient: mockGetReadyRedisCommandClient,
}));

import { consumeRateLimit, resetRateLimit } from "@/lib/security/rate-limit";

describe("consumeRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRedisConfigured.mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests below the limit", async () => {
    const result = await consumeRateLimit("test-key", 5, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("tracks attempts correctly", async () => {
    const key = "test-tracking";
    const result1 = await consumeRateLimit(key, 5, 60000);
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(4);

    const result2 = await consumeRateLimit(key, 5, 60000);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(3);

    const result3 = await consumeRateLimit(key, 5, 60000);
    expect(result3.allowed).toBe(true);
    expect(result3.remaining).toBe(2);
  });

  it("rejects requests above the limit", async () => {
    const key = "test-reject";
    // Consume all allowed attempts
    for (let i = 0; i < 5; i++) {
      await consumeRateLimit(key, 5, 60000);
    }
    // Next request should be rejected
    const result = await consumeRateLimit(key, 5, 60000);
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("resets after window expires", async () => {
    vi.useFakeTimers();
    const key = "test-reset";
    // Consume all attempts
    for (let i = 0; i < 5; i++) {
      await consumeRateLimit(key, 5, 60000);
    }
    // Should be rejected
    const rejected = await consumeRateLimit(key, 5, 60000);
    expect(rejected.allowed).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(61000);
    // Should be allowed again
    const allowed = await consumeRateLimit(key, 5, 60000);
    expect(allowed.allowed).toBe(true);
  });

  it("handles different keys independently", async () => {
    const key1 = "test-key-1";
    const key2 = "test-key-2";
    // Consume all attempts for key1
    for (let i = 0; i < 5; i++) {
      await consumeRateLimit(key1, 5, 60000);
    }
    // key1 should be rejected
    const result1 = await consumeRateLimit(key1, 5, 60000);
    expect(result1.allowed).toBe(false);
    // key2 should still be allowed
    const result2 = await consumeRateLimit(key2, 5, 60000);
    expect(result2.allowed).toBe(true);
  });

  it("handles zero max attempts by rejecting", async () => {
    // With maxAttempts=0, the first request creates a bucket with attempts=1
    // which is > 0, so it should be rejected
    const result = await consumeRateLimit("test-zero", 0, 60000);
    expect(result.allowed).toBe(false);
  });

  it("handles negative max attempts by rejecting", async () => {
    const result = await consumeRateLimit("test-negative", -1, 60000);
    expect(result.allowed).toBe(false);
  });

  it("handles very large max attempts", async () => {
    const result = await consumeRateLimit("test-large", 1000000, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(999999);
  });

  it("handles empty key", async () => {
    const result = await consumeRateLimit("", 5, 60000);
    expect(result.allowed).toBe(true);
  });

  it("handles very long key", async () => {
    const longKey = "a".repeat(1000);
    const result = await consumeRateLimit(longKey, 5, 60000);
    expect(result.allowed).toBe(true);
  });

  it("handles special characters in key", async () => {
    const specialKey = "test:key/with@special#chars";
    const result = await consumeRateLimit(specialKey, 5, 60000);
    expect(result.allowed).toBe(true);
  });

  it("handles unicode in key", async () => {
    const unicodeKey = "test-key-测试-🔒";
    const result = await consumeRateLimit(unicodeKey, 5, 60000);
    expect(result.allowed).toBe(true);
  });
});

describe("resetRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRedisConfigured.mockReturnValue(false);
  });

  it("clears the rate limit for a key", async () => {
    const key = "test-reset";
    // Consume all attempts
    for (let i = 0; i < 5; i++) {
      await consumeRateLimit(key, 5, 60000);
    }
    // Should be rejected
    const rejected = await consumeRateLimit(key, 5, 60000);
    expect(rejected.allowed).toBe(false);

    // Reset the limit
    await resetRateLimit(key);
    // Should be allowed again
    const allowed = await consumeRateLimit(key, 5, 60000);
    expect(allowed.allowed).toBe(true);
  });

  it("does not throw when resetting non-existent key", async () => {
    await expect(resetRateLimit("non-existent-key")).resolves.not.toThrow();
  });

  it("does not throw when Redis is configured but unavailable", async () => {
    mockIsRedisConfigured.mockReturnValue(true);
    mockGetReadyRedisCommandClient.mockRejectedValue(new Error("Connection failed"));
    await expect(resetRateLimit("test-key")).resolves.not.toThrow();
  });
});

describe("rate limit with Redis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRedisConfigured.mockReturnValue(true);
  });

  it("uses Redis when configured", async () => {
    const mockRedis = {
      incr: vi.fn().mockResolvedValue(1),
      pexpire: vi.fn().mockResolvedValue(1),
      pttl: vi.fn().mockResolvedValue(60000),
      del: vi.fn().mockResolvedValue(1),
    };
    mockGetReadyRedisCommandClient.mockResolvedValue(mockRedis);

    const result = await consumeRateLimit("test-key", 5, 60000);
    expect(result.allowed).toBe(true);
    expect(mockRedis.incr).toHaveBeenCalled();
    expect(mockRedis.pexpire).toHaveBeenCalled();
  });

  it("falls back to in-memory when Redis fails", async () => {
    mockGetReadyRedisCommandClient.mockRejectedValue(new Error("Connection failed"));

    const result = await consumeRateLimit("test-key", 5, 60000);
    expect(result.allowed).toBe(true);
  });

  it("falls back to in-memory when Redis is not ready", async () => {
    mockGetReadyRedisCommandClient.mockResolvedValue(null);

    const result = await consumeRateLimit("test-key", 5, 60000);
    expect(result.allowed).toBe(true);
  });

  it("handles Redis timeout", async () => {
    const mockRedis = {
      incr: vi.fn().mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000))
      ),
      pexpire: vi.fn().mockResolvedValue(1),
      pttl: vi.fn().mockResolvedValue(60000),
      del: vi.fn().mockResolvedValue(1),
    };
    mockGetReadyRedisCommandClient.mockResolvedValue(mockRedis);

    const result = await consumeRateLimit("test-key", 5, 60000);
    // Should fall back to in-memory
    expect(result.allowed).toBe(true);
  });
});
