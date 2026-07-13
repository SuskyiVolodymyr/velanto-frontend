import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Uses a non-default port (3100) so this doesn't collide with a `next dev`
 * instance a developer may already have running on 3000 locally.
 */
export default defineConfig({
  testDir: "./e2e",
  // Starts one shared mock backend on :3001 for the whole run (see
  // e2e/global-setup.ts), so port-dependent specs don't race to bind it under
  // parallel workers.
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
