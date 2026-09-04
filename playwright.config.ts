import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.RCSCA_BROWSER_TEST_PORT ?? "3200");
const baseURL = process.env.RCSCA_E2E_BASE_URL ?? `http://localhost:${port}`;
const usesLocalServer = !process.env.RCSCA_E2E_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: usesLocalServer
    ? {
        command: `npm run start -- --hostname localhost --port ${port}`,
        url: `${baseURL}/api/health`,
        reuseExistingServer: false,
        timeout: 30_000,
      }
    : undefined,
});
