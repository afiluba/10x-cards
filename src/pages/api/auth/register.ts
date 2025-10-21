import type { APIContext } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { registerCommandSchema } from "../../../lib/schemas/auth.schemas";
import { mapSupabaseUserToUserDTO, mapSupabaseError, createAuthErrorResponse } from "../../../lib/utils/auth.utils";
import type { AuthRegisterResponseDTO } from "../../../types";
import { isFeatureEnabled, FeatureFlag } from "../../../features";

export const prerender = false;

/**
 * Creates a standardized error response for auth endpoints.
 */
function createErrorResponse(code: string, message: string, status: number): Response {
  return new Response(JSON.stringify(createAuthErrorResponse(code, message)), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * POST /api/auth/register - Registers a new user with email and password.
 *
 * Request Body:
 * {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 *
 * Response (201):
 * {
 *   "user": {
 *     "id": "user-id",
 *     "email": "user@example.com",
 *     "avatar_url": null,
 *     "created_at": "2024-01-01T00:00:00.000Z"
 *   },
 *   "message": "Rejestracja udana. Sprawdź email w celu weryfikacji.",
 *   "email_confirmation_required": true
 * }
 *
 * Error Responses:
 * 400 - Validation error or user already exists
 * 500 - Internal server error
 */
export async function POST({ request, cookies }: APIContext): Promise<Response> {
  // Check if auth feature is enabled
  if (!isFeatureEnabled(FeatureFlag.AUTH)) {
    return createErrorResponse("FEATURE_DISABLED", "Authentication feature is currently disabled", 403);
  }

  try {
    // Parse and validate request body
    const body = await request.json();

    const validationResult = registerCommandSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0]?.message || "Nieprawidłowe dane";
      return createErrorResponse("VALIDATION_ERROR", errorMessage, 400);
    }

    const { email, password } = validationResult.data;

    // Create Supabase client with real cookies for proper session management
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Attempt registration
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      const mappedError = mapSupabaseError(error);
      return createErrorResponse(mappedError.code, mappedError.message, 400);
    }

    if (!data.user) {
      return createErrorResponse("REGISTRATION_FAILED", "Rejestracja nie powiodła się. Spróbuj ponownie.", 500);
    }

    // Map to response DTO
    const response: AuthRegisterResponseDTO = {
      user: mapSupabaseUserToUserDTO(data.user),
      message: "Rejestracja udana. Sprawdź email w celu weryfikacji.",
      email_confirmation_required: true,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Log error for debugging (in production, use proper logging)
    // eslint-disable-next-line no-console
    console.error("Register endpoint error:", error);
    return createErrorResponse("INTERNAL_ERROR", "Wystąpił błąd serwera. Spróbuj ponownie później.", 500);
  }
}
