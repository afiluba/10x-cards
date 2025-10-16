import type { APIContext } from "astro";
import { FlashcardDeleteSchema, FlashcardUpdateSchema } from "../../../lib/schemas/flashcard.schemas";
import { deleteFlashcard, updateFlashcard } from "../../../lib/services/flashcard.service";
import type { ErrorResponseDTO, FlashcardDeleteCommand, FlashcardUpdateCommand, FlashcardDTO } from "../../../types";

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
 * DELETE /api/flashcards/{id}
 *
 * Soft deletes a flashcard.
 *
 * This endpoint:
 * - Validates flashcard ID parameter
 * - Validates optional request body for deletion reason
 * - Soft deletes the flashcard (sets deleted_at timestamp)
 * - Returns the flashcard ID and deletion timestamp
 *
 * URL parameters:
 * - id: string (UUID of the flashcard to delete)
 *
 * Request body (optional):
 * - reason: string (reason for deletion)
 *
 * Response (200):
 * - FlashcardDeleteResponseDTO with id and deleted_at
 *
 * Error responses:
 * - 400: Invalid flashcard ID or request body
 * - 401: Unauthorized (not authenticated)
 * - 404: Flashcard not found or not owned by user
 * - 500: Internal server error or database error
 */
export async function DELETE(context: APIContext): Promise<Response> {
  try {
    // 1. Get Supabase client from context
    const supabase = context.locals.supabase;
    if (!supabase) {
      return createErrorResponse("INTERNAL_SERVER_ERROR", "Database client not available", 500);
    }

    // 2. Get authenticated user ID
    const user = context.locals.user;
    if (!user) {
      return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
    }

    // 3. Validate flashcard ID parameter
    const { id } = context.params;
    if (!id || typeof id !== "string") {
      return createErrorResponse("INVALID_FLASHCARD_ID", "Valid flashcard ID is required", 400);
    }

    // 4. Parse and validate optional request body
    let deleteCommand: FlashcardDeleteCommand = {};
    if (context.request.headers.get("content-type")?.includes("application/json")) {
      try {
        const requestBody = await context.request.json();
        const validationResult = FlashcardDeleteSchema.safeParse(requestBody);

        if (!validationResult.success) {
          const details: Record<string, string> = {};
          validationResult.error.errors.forEach((err) => {
            const field = err.path.join(".");
            details[field] = err.message;
          });

          return createErrorResponse("INVALID_REQUEST_BODY", "Invalid request body provided", 400, details);
        }

        deleteCommand = validationResult.data;
      } catch (parseError) {
        return createErrorResponse("INVALID_JSON", "Request body must be valid JSON", 400);
      }
    }

    // 5. Call service layer to delete flashcard
    const result = await deleteFlashcard(supabase, user.id, id, deleteCommand as FlashcardDeleteCommand);

    // 6. Return successful response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    // Log error for monitoring
    // eslint-disable-next-line no-console
    console.error("[DELETE /api/flashcards/{id}] Error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Handle custom service errors
    if (error instanceof Error && "code" in error && "status" in error) {
      const serviceError = error as Error & {
        code: string;
        status: number;
        details?: Record<string, string>;
      };

      return createErrorResponse(serviceError.code, serviceError.message, serviceError.status, serviceError.details);
    }

    // Handle unexpected errors
    return createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred", 500);
  }
}

/**
 * PATCH /api/flashcards/{id}
 *
 * Updates an existing flashcard.
 *
 * This endpoint:
 * - Validates flashcard ID parameter
 * - Validates request body against the Zod schema
 * - Updates the flashcard with provided fields
 * - Returns the updated flashcard DTO
 *
 * URL parameters:
 * - id: string (UUID of the flashcard to update)
 *
 * Request body (partial update):
 * - front_text?: string (1-500 chars)
 * - back_text?: string (1-500 chars)
 * - source_type?: "AI_EDITED" | "MANUAL"
 *
 * Response (200):
 * - FlashcardDTO with the updated flashcard
 *
 * Error responses:
 * - 400: Invalid flashcard ID, request body, or validation errors
 * - 401: Unauthorized (not authenticated)
 * - 404: Flashcard not found or not owned by user
 * - 500: Internal server error or database error
 */
export async function PATCH(context: APIContext): Promise<Response> {
  try {
    // 1. Get Supabase client from context
    const supabase = context.locals.supabase;
    if (!supabase) {
      return createErrorResponse("INTERNAL_SERVER_ERROR", "Database client not available", 500);
    }

    // 2. Get authenticated user ID
    const user = context.locals.user;
    if (!user) {
      return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
    }

    // 3. Validate flashcard ID parameter
    const { id } = context.params;
    if (!id || typeof id !== "string") {
      return createErrorResponse("INVALID_FLASHCARD_ID", "Valid flashcard ID is required", 400);
    }

    // 4. Parse and validate request body
    const requestBody = await context.request.json();
    const validationResult = FlashcardUpdateSchema.safeParse(requestBody);

    if (!validationResult.success) {
      const details: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        const field = err.path.join(".");
        details[field] = err.message;
      });

      return createErrorResponse("INVALID_REQUEST_BODY", "Invalid request body provided", 400, details);
    }

    const validatedCommand = validationResult.data;

    // 5. Check if at least one field is provided
    if (!validatedCommand.front_text && !validatedCommand.back_text && !validatedCommand.source_type) {
      return createErrorResponse("NO_FIELDS_TO_UPDATE", "At least one field must be provided for update", 400);
    }

    // 6. Call service layer to update flashcard
    const result = await updateFlashcard(supabase, user.id, id, validatedCommand as FlashcardUpdateCommand);

    // 7. Return successful response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    // Log error for monitoring
    // eslint-disable-next-line no-console
    console.error("[PATCH /api/flashcards/{id}] Error:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Handle custom service errors
    if (error instanceof Error && "code" in error && "status" in error) {
      const serviceError = error as Error & {
        code: string;
        status: number;
        details?: Record<string, string>;
      };

      return createErrorResponse(serviceError.code, serviceError.message, serviceError.status, serviceError.details);
    }

    // Handle unexpected errors
    return createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred", 500);
  }
}
