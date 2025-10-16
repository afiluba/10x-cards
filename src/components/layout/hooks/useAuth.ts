import { useState, useCallback } from "react";
import type { UserDTO } from "../../../types";

interface UseAuthOptions {
  initialUser?: UserDTO | null;
}

/**
 * Authentication hook for API-based authentication.
 * Uses custom API endpoints for login/logout, with mock implementations for register/reset.
 * Handles login, register, logout, and session management.
 */
export function useAuth(options: UseAuthOptions = {}) {
  const { initialUser } = options;
  const [user, setUser] = useState<UserDTO | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check session by calling a potential future API endpoint
  // For now, this is a placeholder that could be implemented later
  const checkSession = useCallback(async () => {
    // TODO: Implement session check via API endpoint when available
    // For now, session is managed via SSR (initialUser prop)
    setError(null);
  }, []);

  /**
   * Logs in a user with email and password.
   */
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || "Błąd logowania";
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Update user state with data from API response
      if (data.user) {
        setUser(data.user);
        setError(null);
      }

      return { user: data.user };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Błąd logowania";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Registers a new user with email and password.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const register = useCallback(async (email: string, _password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Mock implementation - replace with API call when endpoint is available
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API delay

      // Mock successful registration
      const mockUser: UserDTO = {
        id: `user_${Date.now()}`,
        email,
        avatar_url: undefined,
        created_at: new Date().toISOString(),
      };

      setUser(mockUser);
      return { user: mockUser };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Błąd rejestracji";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logs out the current user.
   */
  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}), // Empty body for logout
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || "Błąd wylogowania";
        setError(errorMessage);
        throw new Error(errorMessage);
      }

      // Clear user state after successful logout
      setUser(null);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Błąd wylogowania";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Sends a password reset email.
   */
  const resetPassword = useCallback(async (email: string) => {
    setError(null);

    try {
      // Mock implementation - replace with API call when endpoint is available
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API delay

      // Mock successful password reset email sent
      // In real implementation, this would send an email
      // eslint-disable-next-line no-console
      console.log(`Mock: Password reset email sent to ${email}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Błąd wysyłania emaila resetowania";
      setError(errorMessage);
      throw err;
    }
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    register,
    logout,
    resetPassword,
    checkSession,
  };
}
