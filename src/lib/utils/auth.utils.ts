import type { AuthError, User } from "@supabase/supabase-js";
import type { UserDTO } from "../../types";

/**
 * Maps Supabase User object to UserDTO for API responses.
 * Handles optional fields and provides safe defaults.
 */
export function mapSupabaseUserToUserDTO(supabaseUser: User): UserDTO {
  // Email should always be present for authenticated users
  if (!supabaseUser.email) {
    throw new Error("User email is required");
  }

  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    avatar_url: supabaseUser.user_metadata?.avatar_url,
    created_at: supabaseUser.created_at,
  };
}

/**
 * Maps Supabase AuthError to standardized error format.
 * Provides user-friendly Polish error messages.
 */
export function mapSupabaseError(error: AuthError): { code: string; message: string } {
  // Map common Supabase auth errors to user-friendly messages
  switch (error.message) {
    case "Invalid login credentials":
      return {
        code: "INVALID_CREDENTIALS",
        message: "Nieprawidłowe dane logowania. Sprawdź email i hasło.",
      };

    case "User already registered":
      return {
        code: "USER_EXISTS",
        message: "Użytkownik o tym adresie email już istnieje.",
      };

    case "Email not confirmed":
      return {
        code: "EMAIL_NOT_CONFIRMED",
        message: "Email nie został potwierdzony. Sprawdź swoją skrzynkę pocztową.",
      };

    case "Password should be at least 6 characters":
      return {
        code: "PASSWORD_TOO_SHORT",
        message: "Hasło musi mieć minimum 6 znaków.",
      };

    case "Signup disabled":
      return {
        code: "SIGNUP_DISABLED",
        message: "Rejestracja nowych użytkowników jest tymczasowo wyłączona.",
      };

    case "Too many requests":
      return {
        code: "RATE_LIMIT",
        message: "Zbyt wiele prób. Spróbuj ponownie za chwilę.",
      };

    case "Email rate limit exceeded":
      return {
        code: "EMAIL_RATE_LIMIT",
        message: "Zbyt wiele emaili wysłanych. Spróbuj ponownie za chwilę.",
      };

    default:
      // Log unknown errors for debugging in development
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error("Unknown Supabase auth error:", error);
      }
      return {
        code: "AUTH_ERROR",
        message: "Wystąpił błąd autentyfikacji. Spróbuj ponownie.",
      };
  }
}

/**
 * Creates a standardized error response for API endpoints.
 */
export function createAuthErrorResponse(code: string, message: string) {
  return {
    error: {
      code,
      message,
    },
  };
}

/**
 * Creates a standardized success response for API endpoints.
 */
export function createAuthSuccessResponse<T>(data: T) {
  return {
    data,
  };
}
