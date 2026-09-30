// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";

const mockSignIn = vi.hoisted(() => vi.fn());
vi.mock("next-auth/react", () => ({ signIn: mockSignIn }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {
        /* No browser layout or timer work is needed in this test double. */
      }
      unobserve() {
        /* No browser layout or timer work is needed in this test double. */
      }
      disconnect() {
        /* No browser layout or timer work is needed in this test double. */
      }
    }
  );
  mockSignIn.mockReset();
  // Auth.js handles successful redirects; keep the mock inert during the test.
  mockSignIn.mockResolvedValue(undefined);
  window.history.replaceState(null, "", "/login");
});

const emailLabel = /email/i;
const passwordLabel = /^password$/i;
const submitLabel = /^sign in$/i;
async function submitCredentials(
  email = "test@example.com",
  password = "password123"
) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(emailLabel), email);
  await user.type(screen.getByLabelText(passwordLabel), password);
  await user.click(screen.getByRole("button", { name: submitLabel }));
}

describe("LoginPage", () => {
  it("renders the credential fields and submit button", () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(emailLabel)).toBeRequired();
    expect(screen.getByLabelText(passwordLabel)).toBeRequired();
    expect(screen.getByRole("button", { name: submitLabel })).toBeEnabled();
  });

  it("blocks empty credentials using native form validation", async () => {
    render(<LoginPage />);
    await userEvent.click(screen.getByRole("button", { name: submitLabel }));
    expect(screen.getByLabelText(emailLabel)).toBeInvalid();
    expect(screen.getByLabelText(passwordLabel)).toBeInvalid();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("blocks a missing password", async () => {
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText(emailLabel), "test@example.com");
    await userEvent.click(screen.getByRole("button", { name: submitLabel }));
    expect(screen.getByLabelText(passwordLabel)).toBeInvalid();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("blocks invalid email syntax", async () => {
    render(<LoginPage />);
    await submitCredentials("not-an-email");
    expect(screen.getByLabelText(emailLabel)).toBeInvalid();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("sends credentials and the dashboard redirect to Auth.js", async () => {
    render(<LoginPage />);
    await submitCredentials();
    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "test@example.com",
      password: "password123",
      redirectTo: "/dashboard",
    });
  });

  it("shows a safe error when credentials are rejected", async () => {
    window.history.replaceState(null, "", "/login?error=CredentialsSignin");
    render(<LoginPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid email or password."
    );
  });

  it("disables submission while authentication is pending", async () => {
    mockSignIn.mockImplementation(
      () =>
        new Promise(() => {
          /* No browser layout or timer work is needed in this test double. */
        })
    );
    render(<LoginPage />);
    await submitCredentials();
    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
  });

  it("recovers when the authentication request throws", async () => {
    mockSignIn.mockRejectedValue(new Error("Network unavailable"));
    render(<LoginPage />);
    await submitCredentials();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to sign in right now."
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: submitLabel })).toBeEnabled()
    );
  });

  it("shows an OAuth error and removes technical query parameters", () => {
    window.history.replaceState(null, "", "/login?error=Configuration");
    render(<LoginPage />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Sign-in is temporarily unavailable."
    );
    expect(window.location.search).toBe("");
  });
});
