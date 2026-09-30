import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3100";
const serverURL = new URL(baseURL);

export default defineConfig({
  testDir: "./tests/e2e",
  // Accounts allow one active session; parallel logins would invalidate each other.
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "on-first-retry", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node node_modules/next/dist/bin/next dev --turbopack --hostname ${serverURL.hostname} --port ${serverURL.port || "3100"}`,
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NODE_ENV: "development",
      NEXT_DIST_DIR: ".next-e2e",
      AUTH_URL: baseURL,
      NEXTAUTH_URL: baseURL,
      AUTH_TRUST_HOST: "true",
      REDIS_URL: "",
    },
  },
});
