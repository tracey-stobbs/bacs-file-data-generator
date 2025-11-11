import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // include all tests under tests/ and src/ where applicable
    include: ["tests/**/*.spec.ts", "tests/**/*.test.ts", "src/**/*.test.ts"],
    setupFiles: path.resolve(__dirname, "tests", "setup", "cleanup.ts"),
    coverage: {
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["**/*.test.ts", "tests/**"],
    },
  },
});
