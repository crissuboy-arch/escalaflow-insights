import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.E2E_BASE_URL ??
  "https://id-preview--50293ad0-b4d2-4adf-8446-ff77f73ad3e6.lovable.app";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    storageState: ".auth/user.json",
  },
  globalSetup: "./e2e/global.setup.ts",
  globalTeardown: "./e2e/global.teardown.ts",
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});