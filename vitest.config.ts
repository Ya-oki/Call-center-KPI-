import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Engine tests are pure unit tests — no DOM, no network.
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
