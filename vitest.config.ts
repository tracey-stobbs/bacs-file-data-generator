import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Only include co-located unit tests that live beside source files and use the .test.ts suffix
    include: ["src/**/*.test.ts"],
    coverage: {
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      // Exclude test files from coverage
      exclude: ["**/*.test.ts"],
    },
  },
});
