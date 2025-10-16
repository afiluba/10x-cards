import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/schemas/auth.schemas";
import { toast } from "sonner";

interface LoginFormProps {
  onLogin?: (data: LoginInput) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Login form component with email and password fields.
 * Provides validation, error handling, and navigation links to registration and password reset.
 */
export function LoginForm({ onLogin, isLoading = false }: LoginFormProps) {
  const [formData, setFormData] = useState<LoginInput>({
    email: "",
    password: ""
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback((name: keyof LoginInput, value: string) => {
    try {
      const fieldSchema = loginSchema.pick({ [name]: true });
      fieldSchema.parse({ [name]: value });
      setErrors(prev => ({ ...prev, [name]: undefined }));
      return true;
    } catch (error: any) {
      const message = error.errors?.[0]?.message || "Błąd walidacji";
      setErrors(prev => ({ ...prev, [name]: message }));
      return false;
    }
  }, []);

  const handleInputChange = (name: keyof LoginInput) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [name]: value }));

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
      if (onLogin) {
        await onLogin(formData);
      } else {
        // Mock login for UI development
        toast.success("Logowanie udane!");
        console.log("Login attempt:", formData);
      }
    } catch (error) {
      toast.error("Błąd logowania. Sprawdź dane i spróbuj ponownie.");
      console.error("Login error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const loading = isLoading || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive" role="alert">
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
        />
        {errors.password && (
          <p id="password-error" className="text-sm text-destructive" role="alert">
            {errors.password}
          </p>
        )}
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Logowanie..." : "Zaloguj się"}
      </Button>

      {/* Navigation links */}
      <div className="text-center space-y-2">
        <a
          href="/auth/reset-password"
          className="text-sm text-primary hover:text-primary/80 transition-colors underline"
        >
          Zapomniałeś hasła?
        </a>
        <p className="text-sm text-muted-foreground">
          Nie masz konta?{" "}
          <a
            href="/auth/register"
            className="text-primary hover:text-primary/80 transition-colors underline"
          >
            Zarejestruj się
          </a>
        </p>
      </div>
    </form>
  );
}
