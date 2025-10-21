import type { APIContext } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { logoutCommandSchema } from "../../../lib/schemas/auth.schemas";
import { mapSupabaseError, createAuthErrorResponse } from "../../../lib/utils/auth.utils";
import type { AuthLogoutResponseDTO } from "../../../types";
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
 * POST /api/auth/logout - Signs out the current user.
 */
export async function POST({ request, cookies }: APIContext): Promise<Response> {
  // Check if auth feature is enabled
  if (!isFeatureEnabled(FeatureFlag.AUTH)) {
    return createErrorResponse("FEATURE_DISABLED", "Authentication feature is currently disabled", 403);
  }

  try {
    const body = await request.json();

    const validationResult = logoutCommandSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0]?.message || "Nieprawidłowe dane";
      return createErrorResponse("VALIDATION_ERROR", errorMessage, 400);
    }

    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    const { error } = await supabase.auth.signOut();

    if (error) {
      const mappedError = mapSupabaseError(error);
      return createErrorResponse(mappedError.code, mappedError.message, 400);
    }

    const response: AuthLogoutResponseDTO = {
      success: true,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Logout endpoint error:", error);
    return createErrorResponse("INTERNAL_ERROR", "Wystąpił błąd serwera. Spróbuj ponownie później.", 500);
  }
}
