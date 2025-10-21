import { defineConfig, devices } from "@playwright/test";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  /* Run tests sequentially (not in parallel) */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Run tests sequentially with 1 worker */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [["html"], process.env.CI ? ["github"] : ["list"]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || "http://localhost:4321",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Take screenshot only when test fails */
    screenshot: "only-on-failure",

    /* Record video only when test fails */
    video: "retain-on-failure",
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project - runs authentication before all tests
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      teardown: "teardown",
    },
    // Teardown project - cleans up test data after all tests
    {
      name: "teardown",
      testMatch: /global\.teardown\.ts/,
    },
    // Tests that require authentication
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Use saved authentication state from global setup
        storageState: path.resolve(process.cwd(), ".auth", "user.json"),
      },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
    // Tests that should run without authentication (e.g., login/register flows)
    {
      name: "chromium-unauthenticated",
      use: {
        ...devices["Desktop Chrome"],
        // No storage state - starts unauthenticated
      },
      testMatch: /auth\.spec\.ts/,
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run dev -- --port 4321",
    url: "http://localhost:4321",
    reuseExistingServer: true, // Always reuse existing server in development
    timeout: 60 * 1000, // Increased timeout for slower machines
  },

  /* Global test timeout */
  timeout: 30 * 1000,

  /* Expect timeout */
  expect: {
    timeout: 10 * 1000,
  },
});
