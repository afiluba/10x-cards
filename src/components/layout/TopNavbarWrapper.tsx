import { TopNavbar } from "./TopNavbar";
import { useAuth } from "./hooks/useAuth";

interface TopNavbarWrapperProps {
  currentPath: string;
}

/**
 * Wrapper component for TopNavbar that handles authentication logic.
 * This component can be used in Astro layouts to provide navigation with user context.
 */
export function TopNavbarWrapper({ currentPath }: TopNavbarWrapperProps) {
  const { user, logout } = useAuth();

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
