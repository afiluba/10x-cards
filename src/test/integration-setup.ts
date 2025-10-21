import { beforeAll, afterAll, afterEach, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";

// Setup test database connection
// Note: In a real integration test environment, you would connect to a test database
const testSupabaseUrl = process.env.SUPABASE_TEST_URL || "http://localhost:54321";
const testSupabaseKey = process.env.SUPABASE_TEST_ANON_KEY || "test-anon-key";

// Create test Supabase client
export const testSupabase = createClient<Database>(testSupabaseUrl, testSupabaseKey);

// Mock environment variables for integration tests
Object.defineProperty(process.env, "SUPABASE_URL", {
  value: testSupabaseUrl,
  writable: true,
});

Object.defineProperty(process.env, "SUPABASE_ANON_KEY", {
  value: testSupabaseKey,
  writable: true,
});

// Global setup for integration tests
beforeAll(async () => {
  // Verify database connection
  try {
    const { error } = await testSupabase.from("flashcards").select("count").limit(1);
    if (error && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("Integration test database not available:", error.message);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("Integration test setup warning:", error);
    }
  }
});

afterAll(async () => {
  // Cleanup connections if needed
});

afterEach(async () => {
  // Clean up test data between tests
  vi.clearAllMocks();

  // In a real integration test, you might want to clean up test data
  // For example:
  // await testSupabase.from('flashcards').delete().eq('test_marker', true);
});

// Custom matchers for integration tests
declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Assertion<T = any> {
    toBeValidDatabaseRecord(): T;
    toHaveBeenPersisted(): T;
  }
}

expect.extend({
  toBeValidDatabaseRecord(received) {
    const pass =
      received &&
      typeof received.id === "string" &&
      received.id.length > 0 &&
      typeof received.created_at === "string" &&
      typeof received.updated_at === "string";

    return {
      message: () => `Expected ${received} to be a valid database record`,
      pass,
    };
  },

  async toHaveBeenPersisted(received) {
    let pass = false;
    try {
      // Try to fetch the record from database
      const { data, error } = await testSupabase.from("flashcards").select("id").eq("id", received.id).single();

      pass = !error && !!data;
    } catch {
      pass = false;
    }

    return {
      message: () => `Expected record ${received.id} to have been persisted to database`,
      pass,
    };
  },
});
