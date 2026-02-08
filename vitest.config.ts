import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/modules/cve-search/__tests__/**/*.test.ts", "src/modules/cve-search/__tests__/**/*.test.tsx"],
    coverage: {
      enabled: false,
      provider: "v8",
      include: ["src/modules/cve-search/**/*.{ts,tsx}"],
      exclude: ["src/modules/cve-search/**/types.ts"],
      reporter: ["text", "html"],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
