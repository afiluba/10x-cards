import type { APIContext } from "astro";
import { z } from "zod";
import { FlashcardBatchSaveSchema } from "../../../lib/schemas/flashcard.schemas";
import { saveBatchFlashcards } from "../../../lib/services/flashcard.service";
import type { ErrorResponseDTO } from "../../../types";

export const prerender = false;

/**
 * Creates a standardized error response.
 *
 * @param code - Error code identifier
 * @param message - Human-readable error message
 * @param status - HTTP status code
 * @param details - Optional additional error details
 * @returns Response object with error JSON
 */
function createErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: Record<string, string>
): Response {
  const errorResponse: ErrorResponseDTO = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * POST /api/flashcards/batch
 *
 * Saves a batch of accepted AI-generated flashcard proposals
 * and updates audit counters in a single atomic transaction.
 *
 * This endpoint:
 * - Validates the request body against the Zod schema
 * - Verifies the AI generation session exists and is not completed
 * - Validates that saved + rejected counts match generated count
 * - Inserts flashcards in bulk
 * - Updates audit record with counters and completion timestamp
 *
 * Request body:
 * - ai_generation_audit_id: string (UUID) - Session ID
 * - cards: Array (min 1 element) - Flashcards to save
 *   - front_text: string (1-500 chars)
 *   - back_text: string (1-500 chars)
 *   - origin_status: "AI_ORIGINAL" | "AI_EDITED"
 * - rejected_count: number (>= 0) - Count of rejected proposals
 *
 * Response (200):
 * - saved_card_ids: Array of saved flashcard IDs
 * - audit: Updated audit metadata with counters
 *
 * Error responses:
 * - 400: Invalid input validation or count mismatch
 * - 401: Unauthorized (not implemented yet, using static user ID)
 * - 404: AI generation session not found
 * - 409: Session already completed
 * - 422: Invalid JSON
 * - 500: Internal server error or transaction failure
 */
export async function POST(context: APIContext): Promise<Response> {
  // 1. Parse JSON request body
  let requestBody;
  try {
    requestBody = await context.request.json();
  } catch {
    return createErrorResponse("INVALID_JSON", "Unable to parse request body", 422);
  }

  // 2. Validate request body with Zod schema
  let validatedData;
  try {
    validatedData = FlashcardBatchSaveSchema.parse(requestBody);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors = error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors)[0]?.[0];

      // Convert field errors to Record<string, string> for response
      const errorDetails: Record<string, string> = {};
      for (const [key, value] of Object.entries(fieldErrors)) {
        if (value && value.length > 0) {
          errorDetails[key] = value[0];
        }
      }

      return createErrorResponse("INVALID_INPUT", firstError || "Validation failed", 400, errorDetails);
    }

    return createErrorResponse("INTERNAL_ERROR", "An unexpected error occurred during validation", 500);
  }

  // 3. Get authenticated user ID
  const user = context.locals.user;
  if (!user) {
    return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  // 4. Call flashcard service to save batch
  try {
    const result = await saveBatchFlashcards(context.locals.supabase, user.id, validatedData);

    // 5. Return successful response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const err = error as Error & {
      code?: string;
      status?: number;
      details?: Record<string, string>;
    };

    // Handle service-specific errors
    const errorCode = err.code || "INTERNAL_ERROR";
    const errorMessage = err.message || "An unexpected error occurred";
    const errorStatus = err.status || 500;

    return createErrorResponse(errorCode, errorMessage, errorStatus, err.details);
  }
}
