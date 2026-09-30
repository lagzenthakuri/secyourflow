import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signInMock = vi.fn();

vi.mock("next-auth/react", () => ({
  signIn: signInMock,
}));

import { openGoogleAuthPopup } from "@/lib/auth/google-popup";
import { googleAuthPopupStorageKey } from "@/lib/auth/google-popup-storage";

describe("openGoogleAuthPopup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Restore original window if it was stubbed
    const originalWindow = (globalThis as Record<string, unknown>).__originalWindow;
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
    }
  });

  it("waits for the verified result when the browser reports the OAuth popup closed", async () => {
    const listeners = new Map<string, (event: StorageEvent) => void>();
    const stored = new Map<string, string>();
    const popup = {
      closed: false,
      close: vi.fn(),
      location: { assign: vi.fn() },
    };
    const parentLocation = { assign: vi.fn() };

    signInMock.mockResolvedValue({
      ok: true,
      url: "https://accounts.google.com/oauth/authorize",
    });

    // Save original window before stubbing
    (globalThis as Record<string, unknown>).__originalWindow = globalThis.window;
    Object.defineProperty(globalThis, "window", {
      value: {
        crypto: { randomUUID: () => "google-popup-test" },
        open: vi.fn(() => popup),
        addEventListener: vi.fn((type: string, listener: (event: StorageEvent) => void) => {
          listeners.set(type, listener);
        }),
        removeEventListener: vi.fn((type: string) => listeners.delete(type)),
        setTimeout,
        clearTimeout,
        setInterval: globalThis.setInterval ? globalThis.setInterval.bind(globalThis) : (() => 0),
        clearInterval: globalThis.clearInterval ? globalThis.clearInterval.bind(globalThis) : (() => {}),
        document: globalThis.document,
        navigator: globalThis.navigator,
        location: parentLocation,
        localStorage: {
          getItem: (key: string) => stored.get(key) ?? null,
          removeItem: (key: string) => stored.delete(key),
        },
      },
      writable: true,
      configurable: true,
    });

    const onError = vi.fn();
    openGoogleAuthPopup({ onError, onStart: vi.fn() });
    await Promise.resolve();
    await Promise.resolve();

    expect(popup.location.assign).toHaveBeenCalledWith("https://accounts.google.com/oauth/authorize");

    await vi.advanceTimersByTime(2_500);
    await Promise.resolve();
    await Promise.resolve();
    expect(onError).not.toHaveBeenCalled();

    const resultKey = googleAuthPopupStorageKey("google-popup-test");
    stored.set(resultKey, JSON.stringify({ id: "google-popup-test", status: "success" }));
    listeners.get("storage")?.({ key: resultKey, newValue: stored.get(resultKey) } as StorageEvent);

    expect(parentLocation.assign).toHaveBeenCalledWith("/dashboard");
    expect(onError).not.toHaveBeenCalled();
  });
});
