import type { APIContext } from "astro";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "../../../db/database.types";
import { resetPasswordCommandSchema } from "../../../lib/schemas/auth.schemas";
import { mapSupabaseError, createAuthErrorResponse } from "../../../lib/utils/auth.utils";
import type { AuthResetPasswordResponseDTO } from "../../../types";

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
 * POST /api/auth/reset-password - Initiates password reset by sending email.
 *
 * Request Body:
 * {
 *   "email": "user@example.com"
 * }
 *
 * Response (200):
 * {
 *   "message": "Link do resetowania hasła został wysłany na email."
 * }
 *
 * Error Responses:
 * 400 - Validation error or invalid email
 * 500 - Internal server error
 */
export async function POST({ request }: APIContext): Promise<Response> {
  try {
    // Parse and validate request body
    const body = await request.json();

    const validationResult = resetPasswordCommandSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0]?.message || "Nieprawidłowe dane";
      return createErrorResponse("VALIDATION_ERROR", errorMessage, 400);
    }

    const { email } = validationResult.data;

    // Create minimal Supabase client for password reset (no cookie handling needed)
    const supabase = createServerClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
      cookies: {
        getAll: () => [],
        setAll: () => undefined,
      },
    });

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${new URL(request.url).origin}/auth/reset-password`,
    });

    if (error) {
      const mappedError = mapSupabaseError(error);
      return createErrorResponse(mappedError.code, mappedError.message, 400);
    }

    // Return success response
    const response: AuthResetPasswordResponseDTO = {
      message: "Link do resetowania hasła został wysłany na email.",
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
    console.error("Reset password endpoint error:", error);
    return createErrorResponse("INTERNAL_ERROR", "Wystąpił błąd serwera. Spróbuj ponownie później.", 500);
  }
}
