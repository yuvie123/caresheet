import { defineConfig } from "vitest/config";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// `pnpm test` runs the fast unit tests (no API calls).
// `pnpm eval` runs evals/*.eval.ts against the real Claude API, using the key in .env.local.
function readEnvLocal(): Record<string, string> {
  const path = fileURLToPath(new URL(".env.local", import.meta.url));
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => [m[1], m[2]]),
  );
}

export default defineConfig(({ mode }) => ({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    include: mode === "eval" ? ["evals/**/*.eval.ts"] : ["lib/**/*.test.ts"],
    env: mode === "eval" ? readEnvLocal() : {},
    testTimeout: mode === "eval" ? 180_000 : 5_000,
    fileParallelism: false,
  },
}));
