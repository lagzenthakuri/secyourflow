/**
 * Shared test utilities for SecYourFlow test suite.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";

// ─── Auth Helpers ────────────────────────────────────────────────────────────

export function createMockSession(overrides?: Record<string, unknown>) {
  return {
    user: {
      id: "test-user-id",
      email: "test@example.com",
      name: "Test User",
      role: "MAIN_OFFICER",
      organizationId: "test-org-id",
      totpEnabled: false,
      ...overrides,
    },
    expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

export function createMockRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {}
): Request {
  const { method = "GET", headers = {}, body } = options;
  return new Request(url, {
    method,
    headers: new Headers(headers),
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─── API Response Helpers ────────────────────────────────────────────────────

export function createApiResponse<T>(
  data: T,
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function createApiErrorResponse(
  error: string,
  status = 400
): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Component Test Helpers ──────────────────────────────────────────────────

export async function renderAndWait(
  ui: ReactElement,
  options?: Parameters<typeof render>[1]
) {
  const result = render(ui, options);
  await waitFor(() => {
    expect(result.container).toBeInTheDocument();
  });
  return result;
}

export async function fillInput(
  label: string,
  value: string
) {
  const input = screen.getByLabelText(label);
  await userEvent.clear(input);
  await userEvent.type(input, value);
}

export async function selectOption(
  label: string,
  option: string
) {
  const select = screen.getByLabelText(label);
  await userEvent.selectOptions(select, option);
}

export async function clickButton(name: string | RegExp) {
  const button = screen.getByRole("button", { name });
  await userEvent.click(button);
}

// ─── Time Helpers ────────────────────────────────────────────────────────────

export function mockDate(isoDate: string) {
  const mock = new Date(isoDate);
  vi.useFakeTimers();
  vi.setSystemTime(mock);
  return () => vi.useRealTimers();
}

// ─── Environment Helpers ────────────────────────────────────────────────────

export function setupTestEnv(env: Record<string, string>) {
  const original = { ...process.env };
  Object.assign(process.env, env);
  return () => {
    process.env = original;
  };
}

// ─── Database Helpers (for integration tests) ─────────────────────────────────

export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function generateTestEmail(): string {
  return `test-${Date.now()}@test.example.com`;
}
