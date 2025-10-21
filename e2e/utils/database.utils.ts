import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/db/database.types";

/**
 * Validates and returns required environment variables for database operations
 */
export function getRequiredEnvVars() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const testUserId = process.env.E2E_USERNAME_ID;
  const testEmail = process.env.E2E_USERNAME;
  const testPassword = process.env.E2E_PASSWORD;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and SUPABASE_KEY environment variables must be set");
  }

  if (!testUserId) {
    throw new Error("E2E_USERNAME_ID environment variable must be set");
  }

  if (!testEmail || !testPassword) {
    throw new Error("E2E_USERNAME and E2E_PASSWORD environment variables must be set");
  }

  return {
    supabaseUrl,
    supabaseKey,
    testUserId,
    testEmail,
    testPassword,
  };
}

/**
 * Creates and returns an authenticated Supabase client for test operations
 */
export async function createAuthenticatedTestClient() {
  const { supabaseUrl, supabaseKey, testEmail, testPassword } = getRequiredEnvVars();

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (signInError) {
    throw signInError;
  }

  return supabase;
}

/**
 * Cleans up all test data for the test user
 * Deletes flashcards and AI generation audit records
 */
export async function cleanTestDatabase() {
  const { testUserId } = getRequiredEnvVars();
  const supabase = await createAuthenticatedTestClient();

  // Delete flashcards for test user
  const { error: flashcardsError } = await supabase.from("flashcards").delete().eq("user_id", testUserId);

  if (flashcardsError) {
    throw new Error(`Failed to delete flashcards: ${flashcardsError.message}`);
  }

  // Delete AI generation audit records for test user
  const { error: auditError } = await supabase.from("ai_generation_audit").delete().eq("user_id", testUserId);

  if (auditError) {
    throw new Error(`Failed to delete AI generation audit records: ${auditError.message}`);
  }
}
