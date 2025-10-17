import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth.schemas";
import { useAuth } from "@/components/layout/hooks/useAuth";
import { toast } from "sonner";

/**
 * Login form component with email and password fields.
 * Provides validation, error handling, and navigation links to registration and password reset.
 */
export function LoginForm() {
  const { login, isLoading, error: authError } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  // Show auth error as toast
  useEffect(() => {
    if (authError) {
      toast.error(authError);
    }
  }, [authError]);

  const onSubmit = async (data: LoginInput) => {
    try {
      await login(data.email, data.password);

      // Login successful - redirect to intended page or home
      toast.success("Logowanie udane!");
      const urlParams = new URLSearchParams(window.location.search);
      const redirectUrl = urlParams.get("redirect") || "/";
      // eslint-disable-next-line react-compiler/react-compiler
      window.location.href = redirectUrl;
    } catch (error) {
      // Error is already handled by useAuth hook and shown as toast
      // eslint-disable-next-line no-console
      console.error("Login error:", error);
    }
  };

  const loading = isLoading || isSubmitting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-test-id="login-form">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          placeholder="twoj@email.com"
          disabled={loading}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          data-test-id="login-email-input"
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive" role="alert" data-test-id="login-email-error">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Hasło</Label>
        <Input
          id="password"
          type="password"
          {...register("password")}
          placeholder="Wprowadź hasło"
          disabled={loading}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
          data-test-id="login-password-input"
        />
        {errors.password && (
          <p id="password-error" className="text-sm text-destructive" role="alert" data-test-id="login-password-error">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={loading} className="w-full" data-test-id="login-submit-button">
        {loading ? "Logowanie..." : "Zaloguj się"}
      </Button>

      {/* Navigation links */}
      <div className="text-center space-y-2">
        <a
          href="/auth/reset-password"
          className="text-sm text-primary hover:text-primary/80 transition-colors underline"
          data-test-id="login-forgot-password-link"
        >
          Zapomniałeś hasła?
        </a>
        <p className="text-sm text-muted-foreground">
          Nie masz konta?{" "}
          <a
            href="/auth/register"
            className="text-primary hover:text-primary/80 transition-colors underline"
            data-test-id="login-register-link"
          >
            Zarejestruj się
          </a>
        </p>
      </div>
    </form>
  );
}
