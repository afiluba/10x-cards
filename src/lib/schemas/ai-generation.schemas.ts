import { z } from "zod";

/**
 * Validation schema for AI generation session creation request.
 * Enforces input text length constraints and optional parameters format.
 */
export const AiGenerationSessionCreateSchema = z.object({
  input_text: z
    .string()
    .min(1000, "Input text must be at least 1000 characters")
    .max(32768, "Input text must not exceed 32768 characters")
    .trim(),
  model_identifier: z.string().nullable().optional(),
  client_request_id: z.string().uuid("Invalid UUID format").nullable().optional(),
});

/**
 * TypeScript type inferred from the Zod schema.
 */
export type AiGenerationSessionCreateInput = z.infer<typeof AiGenerationSessionCreateSchema>;
