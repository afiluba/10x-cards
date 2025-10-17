import { test as teardown } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/db/database.types";

/**
 * Global teardown that cleans up test data after all tests have run
 * This deletes all database records for the e2e test user
 */
teardown("cleanup test database", async () => {
  // eslint-disable-next-line no-console
  console.log("🧹 Cleaning up test database...");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const testUserId = process.env.E2E_USERNAME_ID;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and SUPABASE_KEY environment variables must be set for teardown");
  }

  if (!testUserId) {
    throw new Error("E2E_USERNAME_ID environment variable must be set for teardown");
  }

  // Create Supabase client for cleanup operations
  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  try {
    // Delete flashcards for test user
    // This will automatically handle the foreign key relationship with ai_generation_audit
    const { error: flashcardsError } = await supabase.from("flashcards").delete().eq("user_id", testUserId);

    if (flashcardsError) {
      throw new Error(`Failed to delete flashcards: ${flashcardsError.message}`);
    }

    // Delete AI generation audit records for test user
    const { error: auditError } = await supabase.from("ai_generation_audit").delete().eq("user_id", testUserId);

    if (auditError) {
      throw new Error(`Failed to delete AI generation audit records: ${auditError.message}`);
    }

    // eslint-disable-next-line no-console
    console.log("✓ Test database cleaned up successfully");
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("✗ Failed to clean up test database:", error);
    throw error;
  }
});
