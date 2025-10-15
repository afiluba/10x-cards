import type { APIContext } from "astro";
import { FlashcardListQuerySchema } from "../../../lib/schemas/flashcard.schemas";
import { listFlashcards } from "../../../lib/services/flashcard.service";
import type { ErrorResponseDTO, FlashcardListQueryCommand } from "../../../types";

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
 * GET /api/flashcards
 *
 * Lists flashcards with pagination, filtering, and search capabilities.
 *
 * This endpoint:
 * - Validates query parameters against the Zod schema
 * - Applies filters: source_type, updated_after, search, include_deleted
 * - Supports pagination with configurable page and page_size
 * - Supports sorting by created_at or updated_at (asc/desc)
 * - Returns paginated results with metadata
 *
 * Query parameters:
 * - page: number (default: 1, min: 1) - Page number
 * - page_size: number (default: 20, min: 1, max: 100) - Items per page
 * - source_type: string[] - Filter by source type (AI_ORIGINAL, AI_EDITED, MANUAL)
 * - updated_after: string (ISO-8601) - Filter by update timestamp
 * - include_deleted: boolean (default: false) - Include soft-deleted flashcards
 * - search: string - Search in front_text and back_text
 * - sort: string (default: "created_at:desc") - Sort format: "field:direction"
 *
 * Response (200):
 * - data: Array of flashcard DTOs
 * - pagination: Metadata (page, page_size, total_items, total_pages)
 *
 * Error responses:
 * - 400: Invalid query parameters
 * - 401: Unauthorized (not authenticated)
 * - 500: Internal server error or database error
 */
export async function GET(context: APIContext): Promise<Response> {
  try {
    // 1. Get Supabase client from context
    const supabase = context.locals.supabase;
    if (!supabase) {
      return createErrorResponse("INTERNAL_SERVER_ERROR", "Database client not available", 500);
    }

    // 2. Get authenticated user ID
    // TODO: Replace with actual auth from context.locals.user once authentication is implemented
    const STATIC_USER_ID = "c2f5729e-cdce-4bab-9bf3-0c7da839d9fd";

    // Check authentication (placeholder for future implementation)
    if (!STATIC_USER_ID) {
      return createErrorResponse("UNAUTHORIZED", "Authentication required", 401);
    }

    // 3. Parse and validate query parameters
    const url = new URL(context.request.url);
    const queryParams: Record<string, string | string[]> = {};

    // Iterate over all query parameters
    url.searchParams.forEach((value, key) => {
      const existingValue = queryParams[key];
      if (existingValue) {
        // Convert to array if multiple values exist
        if (Array.isArray(existingValue)) {
          existingValue.push(value);
        } else {
          queryParams[key] = [existingValue, value];
        }
      } else {
        queryParams[key] = value;
      }
    });

    // Handle multiple source_type values explicitly
    const sourceTypes = url.searchParams.getAll("source_type");
    if (sourceTypes.length > 0) {
      queryParams.source_type = sourceTypes.length === 1 ? sourceTypes[0] : sourceTypes;
    }

    // 4. Validate query parameters with Zod
    const validationResult = FlashcardListQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      const details: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        const field = err.path.join(".");
        details[field] = err.message;
      });

      return createErrorResponse("INVALID_QUERY_PARAMETERS", "Invalid query parameters provided", 400, details);
    }

    const validatedQuery = validationResult.data;

    // 5. Check permissions for include_deleted
    // TODO: Implement actual permission check based on user roles
    // For now, we allow it for all authenticated users
    // In production, implement role-based access control:
    // if (validatedQuery.include_deleted) {
    //   const hasPermission = user.app_metadata?.role === "admin";
    //   if (!hasPermission) {
    //     return createErrorResponse(
    //       "FORBIDDEN",
    //       "Insufficient permissions to view deleted flashcards",
    //       403
    //     );
    //   }
    // }

    // 6. Call service layer to fetch flashcards
    const result = await listFlashcards(supabase, STATIC_USER_ID, validatedQuery as FlashcardListQueryCommand);

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
    console.error("[GET /api/flashcards] Error:", {
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
