import { execFileSync, spawnSync } from "node:child_process";

const base = process.env.LINT_BASE;
if (!(base && /^[a-f0-9]{40}$/i.test(base))) {
  throw new Error("LINT_BASE must be the full base commit SHA");
}
const files = execFileSync(
  "git",
  ["diff", "--name-only", "--diff-filter=ACMR", "-z", base, "HEAD"],
  { encoding: "utf8" }
)
  .split("\0")
  .filter(Boolean);
if (files.length === 0) {
  console.log("No changed files to lint.");
} else {
  const batchSize = 40;
  let failed = false;
  for (let index = 0; index < files.length; index += batchSize) {
    const batch = files.slice(index, index + batchSize);
    const result = spawnSync(
      "bun",
      ["x", "biome", "check", "--no-errors-on-unmatched", ...batch],
      { stdio: "inherit" }
    );
    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      failed = true;
    }
  }
  if (failed) {
    process.exitCode = 1;
  }
}
