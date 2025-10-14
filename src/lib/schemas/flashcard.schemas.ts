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
