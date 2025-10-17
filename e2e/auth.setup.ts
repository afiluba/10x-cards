import { test as setup } from "@playwright/test";
import path from "path";

/**
 * Path where the authenticated state will be saved
 * This file will be used by tests to avoid re-authenticating for each test
 */
export const STORAGE_STATE_PATH = path.resolve(process.cwd(), ".auth", "user.json");

/**
 * Setup project that authenticates once and saves the state
 * This runs as a dependency before all tests and creates an authenticated session
 * that can be reused across all test files
 */
setup("authenticate", async ({ request, baseURL }) => {
  // Get test credentials from environment variables
  const email = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error("E2E_USERNAME and E2E_PASSWORD environment variables must be set for authentication");
  }

  // Authenticate via API request
  const response = await request.post(`${baseURL}/api/auth/login`, {
    data: {
      email,
      password,
    },
  });

  // Verify successful authentication
  if (!response.ok()) {
    throw new Error(`Authentication failed with status ${response.status()}`);
  }

  const responseBody = await response.json();

  // Validate response
  if (!responseBody.user || !responseBody.session || !responseBody.session.access_token) {
    throw new Error("Invalid authentication response");
  }

  // Save the authenticated state (cookies, localStorage, etc.)
  // This will be used by all tests that need authentication
  await request.storageState({ path: STORAGE_STATE_PATH });

  // eslint-disable-next-line no-console
  console.log("✓ Authentication state saved to:", STORAGE_STATE_PATH);
});
