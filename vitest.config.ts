import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    // Above the 5s `asyncUtilTimeout` set in vitest.setup.ts, so a component
    // that never renders fails on its own assertion — naming what it was
    // waiting for — rather than on the bare "test timed out" that a lower
    // ceiling here would produce first.
    testTimeout: 15_000,
    // e2e specs live under e2e/ and are run by Playwright, not Vitest.
    exclude: ["node_modules/**", "e2e/**", ".next/**"],
  },
});
