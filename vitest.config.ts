import { defineConfig } from "vitest/config";

/**
 * Root vitest configuration shared across all packages.
 * Each package references this via its own vitest.config.ts.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/index.ts"],
      reporter: ["text", "lcov"],
    },
  },
});
