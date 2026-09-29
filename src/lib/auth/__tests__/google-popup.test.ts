import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ signIn: vi.fn() }));

vi.mock("next-auth/react", () => ({ signIn: mocks.signIn }));

import { openGoogleAuthPopup } from "@/lib/auth/google-popup";
import { googleAuthPopupStorageKey } from "@/lib/auth/google-popup-storage";

describe("openGoogleAuthPopup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("waits for the verified result when the browser reports the OAuth popup closed", async () => {
    const listeners = new Map<string, (event: StorageEvent) => void>();
    const stored = new Map<string, string>();
    const popup = {
      closed: true,
      close: vi.fn(),
      location: { assign: vi.fn() },
    };
    const parentLocation = { assign: vi.fn() };

    mocks.signIn.mockResolvedValue({
      ok: true,
      url: "https://accounts.google.com/oauth/authorize",
    });

    vi.stubGlobal("window", {
      crypto: { randomUUID: () => "google-popup-test" },
      open: vi.fn(() => popup),
      addEventListener: vi.fn((type: string, listener: (event: StorageEvent) => void) => {
        listeners.set(type, listener);
      }),
      removeEventListener: vi.fn((type: string) => listeners.delete(type)),
      setTimeout,
      clearTimeout,
      localStorage: {
        getItem: (key: string) => stored.get(key) ?? null,
        removeItem: (key: string) => stored.delete(key),
      },
      location: parentLocation,
    });

    const onError = vi.fn();
    openGoogleAuthPopup({ onError, onStart: vi.fn() });
    await Promise.resolve();
    await Promise.resolve();

    expect(popup.location.assign).toHaveBeenCalledWith("https://accounts.google.com/oauth/authorize");

    await vi.advanceTimersByTimeAsync(2_500);
    expect(onError).not.toHaveBeenCalled();

    const resultKey = googleAuthPopupStorageKey("google-popup-test");
    stored.set(resultKey, JSON.stringify({ id: "google-popup-test", status: "success" }));
    listeners.get("storage")?.({ key: resultKey, newValue: stored.get(resultKey) } as StorageEvent);

    expect(parentLocation.assign).toHaveBeenCalledWith("/dashboard");
    expect(onError).not.toHaveBeenCalled();
  });
});
