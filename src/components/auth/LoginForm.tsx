/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from "react";
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
  const [formData, setFormData] = useState<LoginInput>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get redirect URL from query parameters
  const getRedirectUrl = useCallback(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("redirect") || "/";
    }
    return "/";
  }, []);

  // Show auth error as toast
  useEffect(() => {
    if (authError) {
      toast.error(authError);
    }
  }, [authError]);

  const validateField = useCallback((name: keyof LoginInput, value: string) => {
    try {
      const fieldSchema = loginSchema.pick({ [name]: true } as any);
      fieldSchema.parse({ [name]: value });
      setErrors((prev) => ({ ...prev, [name]: undefined }));
      return true;
    } catch (error: any) {
      const message = error.errors?.[0]?.message || "Błąd walidacji";
      setErrors((prev) => ({ ...prev, [name]: message }));
      return false;
    }
  }, []);

  const handleInputChange = (name: keyof LoginInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Real-time validation
    validateField(name, value);
  };

  const validateForm = useCallback(() => {
    try {
      loginSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error: any) {
      const fieldErrors: Partial<Record<keyof LoginInput, string>> = {};
      error.errors?.forEach((err: any) => {
        const field = err.path?.[0] as keyof LoginInput;
        if (field) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login(formData.email, formData.password);

      // Login successful - redirect to intended page or home
      toast.success("Logowanie udane!");
      const redirectUrl = getRedirectUrl();
      window.location.href = redirectUrl;
    } catch (error) {
      // Error is already handled by useAuth hook and shown as toast
      // eslint-disable-next-line no-console
      console.error("Login error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const loading = isLoading || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-test-id="login-form">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange("email")}
          placeholder="twoj@email.com"
          disabled={loading}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          data-test-id="login-email-input"
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive" role="alert" data-test-id="login-email-error">
            {errors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Hasło</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={handleInputChange("password")}
          placeholder="Wprowadź hasło"
          disabled={loading}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
          data-test-id="login-password-input"
        />
        {errors.password && (
          <p id="password-error" className="text-sm text-destructive" role="alert" data-test-id="login-password-error">
            {errors.password}
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
