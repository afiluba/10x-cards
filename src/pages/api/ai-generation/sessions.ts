import type { APIContext } from "astro";
import { z } from "zod";
import { AiGenerationSessionCreateSchema } from "../../../lib/schemas/ai-generation.schemas";
import { createAiGenerationSession } from "../../../lib/services/ai-generation.service";
import type { ErrorResponseDTO } from "../../../types";
import { isFeatureEnabled, FeatureFlag } from "../../../features";

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
 * POST /api/ai-generation/sessions
 *
 * Creates a new AI generation session and returns mock flashcard proposals.
 * Requires user authentication.
 *
 * Request body:
 * - input_text: string (1000-32768 characters)
 * - model_identifier?: string | null
 * - client_request_id?: string (UUID) | null
 *
 * Response (201):
 * - session: Session metadata with ID, client_request_id, model_identifier, generation_started_at
 * - proposals: Array of 20 mock flashcard proposals
 *
 * Error responses:
 * - 400: Invalid input validation
 * - 409: Duplicate client_request_id
 * - 422: Invalid JSON
 * - 500: Internal server error
 */
export async function POST(context: APIContext): Promise<Response> {
  // 0. Check if AI generation feature is enabled
  if (!isFeatureEnabled(FeatureFlag.AI_GENERATION)) {
    return createErrorResponse("FEATURE_DISABLED", "AI generation feature is currently disabled", 403);
  }

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
    validatedData = AiGenerationSessionCreateSchema.parse(requestBody);
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

  // 4. Call AI generation service
  try {
    const result = await createAiGenerationSession(context.locals.supabase, user.id, validatedData);

    // 5. Return successful response
    return new Response(JSON.stringify(result), {
      status: 201,
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
    if (err.code === "DUPLICATE_REQUEST_ID") {
      return createErrorResponse(err.code, err.message, err.status || 409, err.details);
    }

    // Generic internal error response
    return createErrorResponse(
      err.code || "INTERNAL_ERROR",
      err.message || "An unexpected error occurred",
      err.status || 500,
      err.details
    );
  }
}
