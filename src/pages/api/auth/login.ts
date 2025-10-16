import type { APIContext } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { loginCommandSchema } from "../../../lib/schemas/auth.schemas";
import { mapSupabaseUserToUserDTO, mapSupabaseError, createAuthErrorResponse } from "../../../lib/utils/auth.utils";
import type { AuthLoginResponseDTO } from "../../../types";

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
 * POST /api/auth/login - Authenticates a user with email and password.
 *
 * Request Body:
 * {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 *
 * Response (200):
 * {
 *   "user": {
 *     "id": "user-id",
 *     "email": "user@example.com",
 *     "avatar_url": null,
 *     "created_at": "2024-01-01T00:00:00.000Z"
 *   },
 *   "session": {
 *     "access_token": "jwt-token",
 *     "refresh_token": "refresh-token",
 *     "expires_at": 1640995200
 *   }
 * }
 *
 * Error Responses:
 * 400 - Validation error or invalid credentials
 * 500 - Internal server error
 */
export async function POST({ request, cookies }: APIContext): Promise<Response> {
  try {
    // Parse and validate request body
    const body = await request.json();

    const validationResult = loginCommandSchema.safeParse(body);
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

    // Attempt login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const mappedError = mapSupabaseError(error);
      return createErrorResponse(mappedError.code, mappedError.message, 400);
    }

    if (!data.user || !data.session || !data.session.expires_at) {
      return createErrorResponse("AUTH_ERROR", "Logowanie nie powiodło się. Spróbuj ponownie.", 500);
    }

    // Map to response DTO
    const response: AuthLoginResponseDTO = {
      user: mapSupabaseUserToUserDTO(data.user),
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Log error for debugging (in production, use proper logging)
    // eslint-disable-next-line no-console
    console.error("Login endpoint error:", error);
    return createErrorResponse("INTERNAL_ERROR", "Wystąpił błąd serwera. Spróbuj ponownie później.", 500);
  }
}
