/**
 * Logo component with link to the home page (generate page).
 * Stateless component that provides navigation to the main application section.
 */
export function Logo() {
  return (
    <a
      href="/generate"
      className="mr-6 flex items-center space-x-2 font-bold text-xl hover:opacity-80 transition-opacity"
      aria-label="Przejdź do strony głównej"
    >
      <span>10x-cards</span>
    </a>
  );
}
