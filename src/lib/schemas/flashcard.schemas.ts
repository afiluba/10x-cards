import { z } from "zod";

/**
 * Validation schema for individual flashcard within batch save operation.
 * Enforces text length constraints (1-500 characters) and origin status.
 */
export const FlashcardBatchSaveCardSchema = z.object({
  front_text: z
    .string()
    .min(1, "Front text cannot be empty")
    .max(500, "Front text must not exceed 500 characters")
    .trim(),
  back_text: z.string().min(1, "Back text cannot be empty").max(500, "Back text must not exceed 500 characters").trim(),
  origin_status: z.enum(["AI_ORIGINAL", "AI_EDITED"], {
    errorMap: () => ({ message: "Origin status must be AI_ORIGINAL or AI_EDITED" }),
  }),
});

/**
 * Validation schema for batch flashcard save request.
 * Enforces:
 * - Valid UUID for ai_generation_audit_id
 * - Non-empty cards array
 * - Non-negative rejected_count
 */
export const FlashcardBatchSaveSchema = z.object({
  ai_generation_audit_id: z.string().uuid("Invalid UUID format for ai_generation_audit_id"),
  cards: z.array(FlashcardBatchSaveCardSchema).nonempty("Cards array cannot be empty"),
  rejected_count: z.number().int("Rejected count must be an integer").min(0, "Rejected count cannot be negative"),
});

/**
 * TypeScript type inferred from the Zod schema.
 */
export type FlashcardBatchSaveInput = z.infer<typeof FlashcardBatchSaveSchema>;

/**
 * Validation schema for GET /api/flashcards query parameters.
 * Enforces:
 * - Valid pagination parameters (page >= 1, page_size: 1-100)
 * - Valid source type filtering (AI_ORIGINAL, AI_EDITED, MANUAL)
 * - Valid ISO-8601 timestamp for updated_after
 * - Valid sort parameter format (field:direction)
 */
export const FlashcardListQuerySchema = z.object({
  page: z.coerce.number().int().min(1, "Page must be at least 1").default(1),
  page_size: z.coerce
    .number()
    .int()
    .min(1, "Page size must be at least 1")
    .max(100, "Page size must not exceed 100")
    .default(20),
  source_type: z
    .union([z.enum(["AI_ORIGINAL", "AI_EDITED", "MANUAL"]), z.array(z.enum(["AI_ORIGINAL", "AI_EDITED", "MANUAL"]))])
    .optional()
    .transform((val) => (val ? (Array.isArray(val) ? val : [val]) : undefined)),
  updated_after: z.string().datetime("Invalid ISO-8601 timestamp format").optional(),
  include_deleted: z
    .union([z.literal("true").transform(() => true), z.literal("false").transform(() => false), z.boolean()])
    .optional()
    .default(false),
  search: z.string().trim().min(1, "Search query cannot be empty").optional(),
  sort: z
    .string()
    .regex(/^(created_at|updated_at):(asc|desc)$/, "Sort must be in format 'field:direction'")
    .default("created_at:desc")
    .optional(),
});

/**
 * TypeScript type inferred from the Zod schema.
 */
export type FlashcardListQueryInput = z.infer<typeof FlashcardListQuerySchema>;

/**
 * Validation schema for POST /api/flashcards request body.
 * Enforces:
 * - Text length constraints (1-500 characters)
 * - Source type must be MANUAL
 * - Optional valid UUID for ai_generation_audit_id
 */
export const FlashcardCreateSchema = z.object({
  front_text: z
    .string()
    .min(1, "Front text cannot be empty")
    .max(500, "Front text must not exceed 500 characters")
    .trim(),
  back_text: z
    .string()
    .min(1, "Back text cannot be empty")
    .max(500, "Back text must not exceed 500 characters")
    .trim(),
  source_type: z.literal("MANUAL", {
    errorMap: () => ({ message: "Source type must be MANUAL for manual flashcards" }),
  }),
  ai_generation_audit_id: z.string().uuid("Invalid UUID format for ai_generation_audit_id").nullable().optional(),
});

/**
 * TypeScript type inferred from the Zod schema.
 */
export type FlashcardCreateInput = z.infer<typeof FlashcardCreateSchema>;

/**
 * Validation schema for DELETE /api/flashcards/{id} request body.
 * Enforces:
 * - Optional reason string (max 500 characters)
 */
export const FlashcardDeleteSchema = z.object({
  reason: z
    .string()
    .max(500, "Deletion reason must not exceed 500 characters")
    .optional(),
});

/**
 * TypeScript type inferred from the Zod schema.
 */
export type FlashcardDeleteInput = z.infer<typeof FlashcardDeleteSchema>;
