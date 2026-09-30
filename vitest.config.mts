import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/__tests__/**/*.test.ts"],
    // Integration tests need a database and are opted into explicitly.
    exclude: ["**/node_modules/**", "**/*.integration.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/modules/**"],
      reporter: ["text", "html"],
    },
  },
});
