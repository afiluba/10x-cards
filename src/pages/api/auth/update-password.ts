import type { APIContext } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { updatePasswordCommandSchema } from "../../../lib/schemas/auth.schemas";
import { mapSupabaseUserToUserDTO, mapSupabaseError, createAuthErrorResponse } from "../../../lib/utils/auth.utils";
import type { AuthUpdatePasswordResponseDTO } from "../../../types";
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
 * POST /api/auth/update-password - Updates user password using reset token.
 *
 * Request Body:
 * {
 *   "password": "newpassword123",
 *   "token": "reset-token-from-email" // optional, if session is active
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
 * 400 - Validation error or invalid token
 * 401 - Invalid or expired token
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

    const validationResult = updatePasswordCommandSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0]?.message || "Nieprawidłowe dane";
      return createErrorResponse("VALIDATION_ERROR", errorMessage, 400);
    }

    const { password, token } = validationResult.data;

    // Create Supabase client with cookies for session management
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    let userToUpdate = null;

    // If token is provided, verify it and establish session
    if (token) {
      const { data: tokenData, error: tokenError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: "recovery",
      });

      if (tokenError) {
        const mappedError = mapSupabaseError(tokenError);
        return createErrorResponse(mappedError.code, mappedError.message, 401);
      }

      userToUpdate = tokenData.user;
    } else {
      // Check if user has active session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        return createErrorResponse("NO_ACTIVE_SESSION", "Brak aktywnej sesji. Zaloguj się ponownie.", 401);
      }

      userToUpdate = session.user;
    }

    if (!userToUpdate) {
      return createErrorResponse("USER_NOT_FOUND", "Użytkownik nie został znaleziony.", 400);
    }

    // Update user password
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      const mappedError = mapSupabaseError(updateError);
      return createErrorResponse(mappedError.code, mappedError.message, 400);
    }

    if (!updateData.user) {
      return createErrorResponse("UPDATE_FAILED", "Aktualizacja hasła nie powiodła się.", 500);
    }

    // Get the current session after password update
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    if (!currentSession) {
      return createErrorResponse("SESSION_ERROR", "Nie udało się pobrać sesji po aktualizacji hasła.", 500);
    }

    // Map to response DTO
    const response: AuthUpdatePasswordResponseDTO = {
      user: mapSupabaseUserToUserDTO(updateData.user),
      session: {
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token,
        expires_at: currentSession.expires_at || 0,
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
    console.error("Update password endpoint error:", error);
    return createErrorResponse("INTERNAL_ERROR", "Wystąpił błąd serwera. Spróbuj ponownie później.", 500);
  }
}
