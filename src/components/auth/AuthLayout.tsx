import { Logo } from "../layout/Logo";

interface AuthLayoutProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Layout component for authentication pages.
 * Provides consistent styling and structure for login, register, and password reset pages.
 * Centers content with background and removes navigation bar.
 */
export function AuthLayout({ title, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col" data-test-id="auth-layout">
      {/* Header with logo - similar to TopNavbar but simplified */}
      <header className="flex justify-center py-8" data-test-id="auth-header">
        <Logo />
      </header>

      {/* Main content area */}
      <main className="flex-1 flex items-center justify-center px-4" data-test-id="auth-main">
        <div className="w-full max-w-md space-y-6">
          {/* Page title */}
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground" data-test-id="auth-title">
              {title}
            </h1>
          </div>

          {/* Form content */}
          <div className="space-y-4" data-test-id="auth-content">
            {children}
          </div>
        </div>
      </main>

      {/* Footer with links between auth pages */}
      <footer className="py-8 text-center text-sm text-muted-foreground" data-test-id="auth-footer">
        <div className="space-y-2">
          <p>
            Potrzebujesz pomocy?{" "}
            <a
              href="mailto:support@10xcards.com"
              className="text-primary hover:text-primary/80 transition-colors underline"
              data-test-id="auth-support-link"
            >
              Skontaktuj się z nami
            </a>
          </p>
          <p className="text-xs">© 2025 10x-cards. Wszystkie prawa zastrzeżone.</p>
        </div>
      </footer>
    </div>
  );
}
