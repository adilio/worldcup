import { defineConfig } from "vitest/config";

// Tests are plain TypeScript (merge + status logic) — no JSX, no preact plugin
// needed, which keeps this config free of the app's Vite plugin chain.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
