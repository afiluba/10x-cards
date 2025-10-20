import { test as teardown } from "@playwright/test";
import { cleanTestDatabase } from "./utils/database.utils";

/**
 * Global teardown that cleans up test data after all tests have run
 * This deletes all database records for the e2e test user
 */
teardown("cleanup test database", async () => {
  // eslint-disable-next-line no-console
  console.log("🧹 Cleaning up test database...");

  try {
    await cleanTestDatabase();
    // eslint-disable-next-line no-console
    console.log("✓ Test database cleaned up successfully");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("✗ Failed to clean up test database:", error);
    throw error;
  }
});
