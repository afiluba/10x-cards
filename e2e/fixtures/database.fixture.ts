import { test as base } from "@playwright/test";
import { cleanTestDatabase } from "../utils/database.utils";

/**
 * Database cleanup fixture that runs before each test
 * This ensures every test starts with a fresh database state
 */
export const test = base.extend({
  // This fixture runs automatically before each test
  // @ts-expect-error - Playwright fixture typing limitation
  cleanDatabase: [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, no-empty-pattern
    async ({}, use: any) => {
      // eslint-disable-next-line no-console
      console.log("🧹 Cleaning database before test...");

      try {
        await cleanTestDatabase();
        // eslint-disable-next-line no-console
        console.log("✓ Database cleaned successfully");
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("✗ Failed to clean database:", error);
        throw error;
      }

      // Continue with the test
      await use();
    },
    { auto: true },
  ], // This makes the fixture run automatically before each test
});

export { expect } from "@playwright/test";
