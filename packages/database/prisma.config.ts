import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../.."
);
config({ path: resolve(repositoryRoot, ".env.local") });
config({ path: resolve(repositoryRoot, ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
