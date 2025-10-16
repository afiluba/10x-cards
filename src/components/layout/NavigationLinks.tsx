import type { NavigationItem } from "../../types";

interface NavigationLinksProps {
  items: NavigationItem[];
}

/**
 * Navigation links component with active state highlighting.
 * Displays main application navigation with proper accessibility.
 */
export function NavigationLinks({ items }: NavigationLinksProps) {
  return (
    <nav className="flex items-center space-x-6 text-sm font-medium" aria-label="Główna nawigacja">
      {items.map((item) => (
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
