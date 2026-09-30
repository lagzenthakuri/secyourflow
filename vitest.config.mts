import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src"),
    },
  },
  test: {
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "src/**/__tests__/**/*.test.ts",
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.test.tsx",
      "tests/integration/**/*.test.ts",
      "apps/demo/__tests__/**/*.test.tsx",
    ],
    exclude: ["**/node_modules/**", "**/*.integration.test.ts", "tests/e2e/**"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/modules/**"],
      reporter: ["text", "html"],
      thresholds: {
        "src/lib/{api-auth,invitation-utils}.ts": {
          lines: 70,
          functions: 70,
          branches: 60,
          statements: 70,
        },
        "src/lib/{risk,workflow}/**/*.ts": {
          lines: 70,
          functions: 70,
          branches: 60,
          statements: 70,
        },
      },
    },
  },
});
