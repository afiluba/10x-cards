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
  const { user, logout } = useAuth({ initialUser });

  const handleLogout = async () => {
    try {
      await logout();
      // Redirect to index page after successful logout
      window.location.href = "/";
    } catch {
      // In a real implementation, show toast notification
    }
  };

  return <TopNavbar user={user || undefined} currentPath={currentPath} onLogout={handleLogout} />;
}
