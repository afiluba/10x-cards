import type { UserDTO } from "../../../types";

/**
 * Mock authentication hook for development.
 * Returns a mock user with the specified user ID.
 */
export function useAuth() {
  // Mock user data
  const mockUser: UserDTO = {
    id: "c2f5729e-cdce-4bab-9bf3-0c7da839d9fd",
    email: "user@example.com",
    avatar_url: undefined, // No avatar in mock
    created_at: "2024-01-01T00:00:00.000Z",
  };

  /**
   * Mock logout function.
   * In a real implementation, this would call Supabase auth.signOut()
   */
  const logout = async () => {
    // Mock logout - in real implementation would handle Supabase auth
    // Could redirect to login page or update state
  };

  return {
    user: mockUser,
    logout,
    isLoading: false,
    isAuthenticated: true,
  };
}
