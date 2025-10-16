import { describe, it, expect, beforeAll } from "vitest";
import { testSupabase } from "@/test/integration-setup";
import { createFlashcard, listFlashcards } from "@/lib/services/flashcard.service";

// Note: These are integration tests that require a running Supabase instance
// They are separated from unit tests and should be run in a proper test environment

describe.skip("Flashcards API Integration", () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create a test user for integration tests
    // In a real scenario, this would be handled by authentication mocks
    testUserId = "integration-test-user-" + Date.now();
  });

  describe("POST /api/flashcards", () => {
    it("should create a flashcard via API", async () => {
      const flashcardData = {
        front_text: "Integration Test Question",
        back_text: "Integration Test Answer",
        source_type: "MANUAL" as const,
      };

      const result = await createFlashcard(testSupabase, testUserId, flashcardData);

      expect(result).toBeValidDatabaseRecord();
      expect(result.front_text).toBe(flashcardData.front_text);
      expect(result.back_text).toBe(flashcardData.back_text);
      expect(result.source_type).toBe("MANUAL");

      // Verify it was actually persisted
      await expect(result).toHaveBeenPersisted();
    });

    it("should handle validation errors", async () => {
      const invalidData = {
        front_text: "", // Invalid: empty
        back_text: "Valid answer",
        source_type: "MANUAL" as const,
      };

      await expect(createFlashcard(testSupabase, testUserId, invalidData)).rejects.toMatchObject({
        code: "INVALID_FRONT_TEXT",
        status: 400,
      });
    });
  });

  describe("GET /api/flashcards", () => {
    beforeAll(async () => {
      // Create some test data
      await createFlashcard(testSupabase, testUserId, {
        front_text: "Search Test Front",
        back_text: "Search Test Back",
        source_type: "MANUAL",
      });

      await createFlashcard(testSupabase, testUserId, {
        front_text: "Another Test Front",
        back_text: "Another Test Back",
        source_type: "MANUAL",
      });
    });

    it("should list flashcards with pagination", async () => {
      const query = {
        page: 1,
        page_size: 10,
      };

      const result = await listFlashcards(testSupabase, testUserId, query);

      expect(result.data).toBeInstanceOf(Array);
      expect(result.pagination).toEqual({
        page: 1,
        page_size: 10,
        total_items: expect.any(Number),
        total_pages: expect.any(Number),
      });
    });

    it("should filter flashcards by source type", async () => {
      const query = {
        source_type: ["MANUAL"],
      };

      const result = await listFlashcards(testSupabase, testUserId, query);

      expect(result.data.every((card) => card.source_type === "MANUAL")).toBe(true);
    });

    it("should search flashcards by text content", async () => {
      const query = {
        search: "Search Test",
      };

      const result = await listFlashcards(testSupabase, testUserId, query);

      expect(result.data.length).toBeGreaterThan(0);
      expect(
        result.data.every(
          (card) =>
            card.front_text.toLowerCase().includes("search test") ||
            card.back_text.toLowerCase().includes("search test")
        )
      ).toBe(true);
    });

    it("should sort flashcards correctly", async () => {
      const queryAsc = {
        sort: "created_at:asc" as const,
      };

      const queryDesc = {
        sort: "created_at:desc" as const,
      };

      const resultAsc = await listFlashcards(testSupabase, testUserId, queryAsc);
      const resultDesc = await listFlashcards(testSupabase, testUserId, queryDesc);

      // Results should be in different orders (if there are multiple items)
      if (resultAsc.data.length > 1) {
        expect(resultAsc.data[0].created_at).not.toBe(resultDesc.data[0].created_at);
      }
    });
  });

  describe("Flashcard CRUD operations", () => {
    let createdFlashcardId: string;

    it("should perform full CRUD cycle", async () => {
      // CREATE
      const createData = {
        front_text: "CRUD Test Front",
        back_text: "CRUD Test Back",
        source_type: "MANUAL" as const,
      };

      const created = await createFlashcard(testSupabase, testUserId, createData);
      createdFlashcardId = created.id;
      expect(created).toBeValidDatabaseRecord();

      // READ (via list)
      const listResult = await listFlashcards(testSupabase, testUserId, {
        search: "CRUD Test",
      });
      expect(listResult.data.length).toBeGreaterThan(0);

      // UPDATE
      const { updateFlashcard } = await import("@/lib/services/flashcard.service");
      const updated = await updateFlashcard(testSupabase, testUserId, createdFlashcardId, {
        front_text: "Updated CRUD Test Front",
      });
      expect(updated.front_text).toBe("Updated CRUD Test Front");
      expect(updated.id).toBe(createdFlashcardId);

      // DELETE
      const { deleteFlashcard } = await import("@/lib/services/flashcard.service");
      const deleted = await deleteFlashcard(testSupabase, testUserId, createdFlashcardId, {});
      expect(deleted.id).toBe(createdFlashcardId);
      expect(deleted.deleted_at).toBeTruthy();

      // Verify soft delete (should not appear in normal list)
      const listAfterDelete = await listFlashcards(testSupabase, testUserId, {});
      const foundDeleted = listAfterDelete.data.find((card) => card.id === createdFlashcardId);
      expect(foundDeleted).toBeUndefined();

      // But should appear when including deleted
      const listWithDeleted = await listFlashcards(testSupabase, testUserId, {
        include_deleted: true,
      });
      const foundWithDeleted = listWithDeleted.data.find((card) => card.id === createdFlashcardId);
      expect(foundWithDeleted).toBeDefined();
    });
  });
});
