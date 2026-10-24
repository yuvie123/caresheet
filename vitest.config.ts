import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

// `pnpm test` runs the fast unit tests (no API calls).
// `pnpm eval` runs evals/*.eval.ts against the real Claude API.
export default defineConfig(({ mode }) => ({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    include: mode === "eval" ? ["evals/**/*.eval.ts"] : ["lib/**/*.test.ts"],
    env: loadEnv("local", process.cwd(), ""),
    testTimeout: mode === "eval" ? 180_000 : 5_000,
    fileParallelism: false,
  },
}));
