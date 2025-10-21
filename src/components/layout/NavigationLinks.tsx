import type { NavigationItem } from "../../types";
import { isFeatureEnabled, FeatureFlag } from "../../features";

interface NavigationLinksProps {
  items: NavigationItem[];
}

/**
 * Navigation links component with active state highlighting.
 * Displays main application navigation with proper accessibility.
 */
export function NavigationLinks({ items }: NavigationLinksProps) {
  const isAiGenerationEnabled = isFeatureEnabled(FeatureFlag.AI_GENERATION);

  // Filter out /generate link if AI_GENERATION feature is disabled
  const visibleItems = items.filter((item) => {
    if (item.path === "/generate" && !isAiGenerationEnabled) {
      return false;
    }
    return true;
  });

  return (
    <nav className="flex items-center space-x-6 text-sm font-medium" aria-label="Główna nawigacja">
      {visibleItems.map((item) => (
        <a
          key={item.path}
          href={item.path}
          className={`transition-colors hover:text-foreground/80 ${
            item.isActive ? "text-foreground" : "text-foreground/60"
          }`}
          aria-current={item.isActive ? "page" : undefined}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
