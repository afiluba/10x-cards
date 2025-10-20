import type { TopNavbarProps, NavigationItem } from "../../types";
import { Logo } from "./Logo";
import { NavigationLinks } from "./NavigationLinks";
import { UserMenu } from "./UserMenu";
import { Button } from "../ui/button";
import { isFeatureEnabled, FeatureFlag } from "../../features";

/**
 * Main navigation component for the 10x-cards application.
 * Provides navigation between main sections and user account management.
 */
export function TopNavbar({ user, currentPath, onLogout }: TopNavbarProps) {
  const isAuthEnabled = isFeatureEnabled(FeatureFlag.AUTH);
  // Define navigation items based on current path
  const navigationItems: NavigationItem[] = [
    {
      label: "Generuj fiszki",
      path: "/generate",
      isActive: currentPath === "/generate" || currentPath === "/",
    },
    {
      label: "Moje fiszki",
      path: "/my-cards",
      isActive: currentPath === "/my-cards",
    },
  ];

  return (
    <nav
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      role="navigation"
      aria-label="Główna nawigacja aplikacji"
    >
      <div className="container flex h-14 max-w-screen-2xl items-center">
        {/* Logo section - hidden on mobile, visible on medium screens and up */}
        <div className="mr-4 hidden md:flex">
          <Logo />
        </div>

        {/* Navigation Links */}
        <NavigationLinks items={navigationItems} />

        {/* User Menu or Login Button */}
        <div className="ml-auto">
          {user ? (
            <UserMenu user={user} onLogout={onLogout} />
          ) : (
            isAuthEnabled && (
              <Button asChild variant="ghost" size="sm">
                <a href="/auth/login">Zaloguj się</a>
              </Button>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
