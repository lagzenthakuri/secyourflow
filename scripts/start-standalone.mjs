import { spawn } from "node:child_process";
import { access, cp } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneDirectory = resolve(projectRoot, ".next/standalone");
const standaloneServer = resolve(standaloneDirectory, "server.js");

loadEnv({
  path: [resolve(projectRoot, ".env.local"), resolve(projectRoot, ".env")],
});

try {
  await access(standaloneServer);
} catch {
  console.error(
    "Standalone server not found. Run `bun run build` before starting the app."
  );
  process.exit(1);
}

// Next.js intentionally leaves public assets outside the standalone trace.
// Copy them beside server.js so `bun run start` serves the same client bundle
// and public files as the Docker image.
const copies = [
  [
    resolve(projectRoot, ".next/static"),
    resolve(standaloneDirectory, ".next/static"),
  ],
  [resolve(projectRoot, "public"), resolve(standaloneDirectory, "public")],
];

for (const [source, destination] of copies) {
  try {
    await access(source);
    await cp(source, destination, { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }
}

const server = spawn(process.execPath, [standaloneServer], {
  cwd: standaloneDirectory,
  env: process.env,
  stdio: "inherit",
});

server.on("error", (error) => {
  console.error("Could not start the standalone server:", error);
  process.exitCode = 1;
});

server.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}
