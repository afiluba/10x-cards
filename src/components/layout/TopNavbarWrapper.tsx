import { TopNavbar } from "./TopNavbar";
import { useAuth } from "./hooks/useAuth";
import type { UserDTO } from "../../types";

interface TopNavbarWrapperProps {
  currentPath: string;
  user?: UserDTO;
}

/**
 * Wrapper component for TopNavbar that handles authentication logic.
 * This component can be used in Astro layouts to provide navigation with user context.
 */
export function TopNavbarWrapper({ currentPath, user: initialUser }: TopNavbarWrapperProps) {
  const { user, logout, isAuthenticated } = useAuth({ initialUser });

  const handleLogout = async () => {
    try {
      await logout();
      // In a real implementation, this might redirect to login page
      // For now, we'll just log the action
    } catch {
      // In a real implementation, show toast notification
    }
  };

  return <TopNavbar user={user} currentPath={currentPath} onLogout={handleLogout} />;
}
