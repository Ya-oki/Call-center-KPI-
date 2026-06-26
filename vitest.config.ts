import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Map "@/..." (tsconfig paths) to the repo root so engine + fixture imports
// resolve under vitest without an extra plugin.
const root = fileURLToPath(new URL(".", import.meta.url)).replace(/\/$/, "");

export default defineConfig({
  resolve: {
    alias: { "@": root },
  },
  test: {
    // Engine tests are pure unit tests — no DOM, no network.
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
