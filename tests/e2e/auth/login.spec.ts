import { expect, test } from "@playwright/test";

/**
 * Authentication E2E tests.
 *
 * Tests the complete login flow from the user's perspective.
 * These tests require a running application and test database.
 */

test.describe("authentication", () => {
  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(LOGIN_URL);
  });

  test("shows login form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(EMAIL_LABEL)).toBeVisible();
    await expect(page.getByLabel(PASSWORD_LABEL)).toBeVisible();
    await expect(
      page.getByRole("button", { name: SIGN_IN_LABEL })
    ).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(EMAIL_LABEL).fill("invalid@example.com");
    await page.getByLabel(PASSWORD_LABEL).fill("wrongpassword");
    await page.getByRole("button", { name: SIGN_IN_LABEL }).click();
    await expect(page.getByText(INVALID_CREDENTIALS)).toBeVisible();
  });

  test("shows validation error for empty fields", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: SIGN_IN_LABEL }).click();
    expect(
      await page
        .getByLabel(EMAIL_LABEL)
        .evaluate((input: HTMLInputElement) => input.validity.valueMissing)
    ).toBe(true);
    expect(
      await page
        .getByLabel(PASSWORD_LABEL)
        .evaluate((input: HTMLInputElement) => input.validity.valueMissing)
    ).toBe(true);
  });

  test("shows validation error for invalid email format", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(EMAIL_LABEL).fill("not-an-email");
    await page.getByLabel(PASSWORD_LABEL).fill("password123");
    await page.getByRole("button", { name: SIGN_IN_LABEL }).click();
    expect(
      await page
        .getByLabel(EMAIL_LABEL)
        .evaluate((input: HTMLInputElement) => input.validity.typeMismatch)
    ).toBe(true);
  });

  test("navigates to dashboard after successful login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(EMAIL_LABEL).fill("test@example.com");
    await page.getByLabel(PASSWORD_LABEL).fill("TestPassword123!");
    await page.getByRole("button", { name: SIGN_IN_LABEL }).click();
    await expect(page).toHaveURL(DASHBOARD_URL);
  });

  test("maintains session across page navigation", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(EMAIL_LABEL).fill("test@example.com");
    await page.getByLabel(PASSWORD_LABEL).fill("TestPassword123!");
    await page.getByRole("button", { name: SIGN_IN_LABEL }).click();
    await expect(page).toHaveURL(DASHBOARD_URL);
    await page.goto("/assets");
    await expect(page).toHaveURL(ASSETS_URL);
  });

  test("logs out successfully", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(EMAIL_LABEL).fill("test@example.com");
    await page.getByLabel(PASSWORD_LABEL).fill("TestPassword123!");
    await page.getByRole("button", { name: SIGN_IN_LABEL }).click();
    await expect(page).toHaveURL(DASHBOARD_URL);
    const csrf = await page.request.get("/api/auth/csrf");
    const { csrfToken } = (await csrf.json()) as { csrfToken: string };
    await page.request.post("/api/auth/signout", {
      form: { csrfToken, callbackUrl: "/" },
    });
    await page.goto("/dashboard");
    await expect(page).toHaveURL(LOGIN_URL);
  });
});

const LOGIN_URL = /\/login/;
const EMAIL_LABEL = /email/i;
const PASSWORD_LABEL = /^password$/i;
const SIGN_IN_LABEL = /sign in/i;
const INVALID_CREDENTIALS = /invalid email or password/i;
const DASHBOARD_URL = /\/dashboard/;
const ASSETS_URL = /\/assets/;
