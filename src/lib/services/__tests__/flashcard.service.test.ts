import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";
import {
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
  listFlashcards,
  saveBatchFlashcards,
} from "../flashcard.service";

// Create a flexible mock that can handle chained calls
const createMockQuery = () => {
  const mock = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
  };
  return mock;
};

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => createMockQuery()),
} as any;

const mockUserId = "user-123";

describe("Flashcard Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createFlashcard", () => {
    it("should create a manual flashcard successfully", async () => {
      const command = {
        front_text: "What is React?",
        back_text: "A JavaScript library for building user interfaces",
        source_type: "MANUAL" as const,
      };

      const mockInsertedCard = {
        id: "card-123",
        front_text: command.front_text,
        back_text: command.back_text,
        source_type: "manual",
        ai_generation_audit_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockInsertedCard,
              error: null,
            }),
          }),
        }),
      });

      const result = await createFlashcard(mockSupabase, mockUserId, command);

      expect(result).toEqual({
        id: mockInsertedCard.id,
        front_text: mockInsertedCard.front_text,
        back_text: mockInsertedCard.back_text,
        source_type: "MANUAL",
        ai_generation_audit_id: null,
        created_at: mockInsertedCard.created_at,
        updated_at: mockInsertedCard.updated_at,
      });
    });

    it("should throw error for invalid front text length", async () => {
      const command = {
        front_text: "", // Invalid: empty string
        back_text: "Valid back text",
        source_type: "MANUAL" as const,
      };

      await expect(createFlashcard(mockSupabase, mockUserId, command)).rejects.toMatchObject({
        code: "INVALID_FRONT_TEXT",
        status: 400,
        message: "Front text must be between 1 and 500 characters",
      });
    });

    it("should throw error for invalid back text length", async () => {
      const command = {
        front_text: "Valid front text",
        back_text: "a".repeat(501), // Invalid: too long
        source_type: "MANUAL" as const,
      };

      await expect(createFlashcard(mockSupabase, mockUserId, command)).rejects.toMatchObject({
        code: "INVALID_BACK_TEXT",
        status: 400,
        message: "Back text must be between 1 and 500 characters",
      });
    });

    it("should throw error for invalid source type", async () => {
      const command = {
        front_text: "Valid front text",
        back_text: "Valid back text",
        source_type: "AI_ORIGINAL" as any, // Invalid for manual creation
      };

      await expect(createFlashcard(mockSupabase, mockUserId, command)).rejects.toMatchObject({
        code: "INVALID_SOURCE_TYPE",
        status: 400,
        message: "Manual flashcards must have MANUAL source type",
      });
    });
  });

  describe("updateFlashcard", () => {
    it("should update flashcard successfully", async () => {
      const flashcardId = "card-123";
      const command = {
        front_text: "Updated front text",
        back_text: "Updated back text",
        source_type: "MANUAL" as const,
      };

      const mockUpdatedCard = {
        id: flashcardId,
        front_text: command.front_text,
        back_text: command.back_text,
        source_type: "manual",
        ai_generation_audit_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      // Create specific mock for this test
      const mockQuery = createMockQuery();
      mockQuery.update.mockReturnValue(mockQuery);
      mockQuery.eq.mockReturnValueOnce(mockQuery).mockReturnValueOnce(mockQuery); // First eq for id, second for user_id
      mockQuery.select.mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({
        data: mockUpdatedCard,
        error: null,
      });

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await updateFlashcard(mockSupabase, mockUserId, flashcardId, command);

      expect(result).toEqual({
        id: mockUpdatedCard.id,
        front_text: mockUpdatedCard.front_text,
        back_text: mockUpdatedCard.back_text,
        source_type: "MANUAL",
        ai_generation_audit_id: null,
        created_at: mockUpdatedCard.created_at,
        updated_at: mockUpdatedCard.updated_at,
      });
    });

    it("should allow partial updates", async () => {
      const flashcardId = "card-123";
      const command = {
        front_text: "Only update front text",
      };

      const mockUpdatedCard = {
        id: flashcardId,
        front_text: command.front_text,
        back_text: "Existing back text",
        source_type: "manual",
        ai_generation_audit_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      // Create specific mock for this test
      const mockQuery = createMockQuery();
      mockQuery.update.mockReturnValue(mockQuery);
      mockQuery.eq.mockReturnValueOnce(mockQuery).mockReturnValueOnce(mockQuery);
      mockQuery.select.mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({
        data: mockUpdatedCard,
        error: null,
      });

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await updateFlashcard(mockSupabase, mockUserId, flashcardId, command);

      expect(result.front_text).toBe(command.front_text);
      expect(result.back_text).toBe("Existing back text");
    });
  });

  describe("deleteFlashcard", () => {
    it("should soft delete flashcard successfully", async () => {
      const flashcardId = "card-123";
      const command = { reason: "Test deletion" };

      const mockDeletedCard = {
        id: flashcardId,
        deleted_at: "2024-01-02T00:00:00Z",
      };

      // Create specific mock for this test
      const mockQuery = createMockQuery();
      mockQuery.update.mockReturnValue(mockQuery);
      mockQuery.eq.mockReturnValueOnce(mockQuery).mockReturnValueOnce(mockQuery);
      mockQuery.select.mockReturnValue(mockQuery);
      mockQuery.single.mockResolvedValue({
        data: mockDeletedCard,
        error: null,
      });

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await deleteFlashcard(mockSupabase, mockUserId, flashcardId, command);

      expect(result).toEqual({
        id: flashcardId,
        deleted_at: mockDeletedCard.deleted_at,
      });
    });
  });

  describe("listFlashcards", () => {
    it("should list flashcards with default parameters", async () => {
      const query = {};

      const mockCards = [
        {
          id: "card-1",
          front_text: "Front 1",
          back_text: "Back 1",
          source_type: "manual",
          ai_generation_audit_id: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      // Mock the query chain to return the expected data
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: mockCards,
                  error: null,
                  count: 1,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await listFlashcards(mockSupabase, mockUserId, query);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        id: "card-1",
        front_text: "Front 1",
        back_text: "Back 1",
        source_type: "MANUAL",
        ai_generation_audit_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });
      expect(result.pagination).toEqual({
        page: 1,
        page_size: 20,
        total_items: 1,
        total_pages: 1,
      });
    });

    it("should apply search filter", async () => {
      const query = { search: "react" };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                    count: 0,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await listFlashcards(mockSupabase, mockUserId, query);

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total_items).toBe(0);
    });

    it("should apply source type filter", async () => {
      const query = { source_type: ["MANUAL"] };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                    count: 0,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      await listFlashcards(mockSupabase, mockUserId, query);

      // Verify that 'in' filter was called with lowercase source types
      expect(mockSupabase.from().select().eq().is().in).toHaveBeenCalledWith("source_type", ["manual"]);
    });
  });

  describe("saveBatchFlashcards", () => {
    it("should save batch of AI-generated flashcards successfully", async () => {
      const command = {
        ai_generation_audit_id: "audit-123",
        cards: [
          {
            front_text: "AI Generated Front 1",
            back_text: "AI Generated Back 1",
            origin_status: "AI_ORIGINAL" as const,
          },
          {
            front_text: "AI Generated Front 2",
            back_text: "AI Generated Back 2",
            origin_status: "AI_EDITED" as const,
          },
        ],
        rejected_count: 1,
      };

      const mockAuditSession = {
        id: "audit-123",
        generated_count: 3, // 2 saved + 1 rejected = 3 total
        generation_completed_at: null,
      };

      const mockSavedCards = [{ id: "card-1" }, { id: "card-2" }];

      const mockUpdatedAudit = {
        id: "audit-123",
        generated_count: 3,
        saved_unchanged_count: 1,
        saved_edited_count: 1,
        rejected_count: 1,
        generation_completed_at: "2024-01-01T00:00:00Z",
      };

      // Mock audit session fetch
      let callCount = 0;
      mockSupabase.from.mockImplementation((table) => {
        if (table === "ai_generation_audit" && callCount === 0) {
          callCount++;
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: mockAuditSession,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }

        if (table === "flashcards" && callCount === 1) {
          callCount++;
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: mockSavedCards,
                error: null,
              }),
            }),
          };
        }

        if (table === "ai_generation_audit" && callCount === 2) {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockUpdatedAudit,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }

        return {};
      });

      const result = await saveBatchFlashcards(mockSupabase, mockUserId, command);

      expect(result.saved_card_ids).toEqual(["card-1", "card-2"]);
      expect(result.audit.saved_unchanged_count).toBe(1);
      expect(result.audit.saved_edited_count).toBe(1);
      expect(result.audit.rejected_count).toBe(1);
    });

    it("should throw error when session not found", async () => {
      const command = {
        ai_generation_audit_id: "nonexistent-audit",
        cards: [],
        rejected_count: 0,
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: "Not found" },
                }),
              }),
            }),
          }),
        }),
      });

      await expect(saveBatchFlashcards(mockSupabase, mockUserId, command)).rejects.toMatchObject({
        code: "SESSION_NOT_FOUND",
        status: 404,
        message: "AI generation session not found",
      });
    });

    it("should throw error when counts do not match", async () => {
      const command = {
        ai_generation_audit_id: "audit-123",
        cards: [{ front_text: "Front", back_text: "Back", origin_status: "AI_ORIGINAL" }],
        rejected_count: 1,
      };

      const mockAuditSession = {
        id: "audit-123",
        generated_count: 5, // Should be 2, but is 5
        generation_completed_at: null,
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockAuditSession,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      await expect(saveBatchFlashcards(mockSupabase, mockUserId, command)).rejects.toMatchObject({
        code: "INVALID_COUNTS",
        status: 400,
        message: "Sum of saved and rejected cards does not match generated count",
      });
    });
  });
});
