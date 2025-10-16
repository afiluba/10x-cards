import { useState, useCallback } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { registerSchema, type RegisterInput } from "@/lib/schemas/auth.schemas";
import { toast } from "sonner";
import { useAuth } from "@/components/layout/hooks/useAuth";

/**
 * Registration form component with email, password, confirm password fields and terms acceptance.
 * Provides validation, error handling, and navigation link to login.
 * Uses useAuth hook for registration functionality.
 */
export function RegisterForm() {
  const { register, isLoading } = useAuth();
  const [formData, setFormData] = useState<RegisterInput>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [acceptTerms, setAcceptTerms] = useState<boolean>(false);
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterInput, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create a schema for individual field validation (without cross-field refine validation)
  const fieldValidationSchema = z.object({
    email: z.string().email("Nieprawidłowy format email").trim(),
    password: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
    confirmPassword: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
  });

  const validateField = useCallback(
    (name: keyof RegisterInput, value: string) => {
      try {
        // Validate individual field using Zod schema
        const fieldSchema = fieldValidationSchema.shape[name];
        fieldSchema.parse(value);

        // For confirmPassword, also check if it matches password (cross-field validation)
        if (name === "confirmPassword" && formData.password && value !== formData.password) {
          setErrors((prev) => ({ ...prev, [name]: "Hasła nie są identyczne" }));
          return false;
        }

        // Clear error for this field
        setErrors((prev) => ({ ...prev, [name]: undefined }));
        return true;
      } catch (error: unknown) {
        // Handle Zod validation errors
        const zodError = error as { errors?: { message: string }[] };
        const message = zodError.errors?.[0]?.message || "Błąd walidacji";
        setErrors((prev) => ({ ...prev, [name]: message }));
        return false;
      }
    },
    [formData.password, fieldValidationSchema.shape]
  );

  const handleInputChange = (name: keyof RegisterInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Real-time validation
    validateField(name, value);
  };

  const validateForm = useCallback(() => {
    try {
      registerSchema.parse(formData);
      setErrors({});

      if (!acceptTerms) {
        toast.error("Musisz zaakceptować regulamin i politykę prywatności");
        return false;
      }

      return true;
    } catch (error: unknown) {
      const fieldErrors: Partial<Record<keyof RegisterInput, string>> = {};
      const zodError = error as { errors?: { path?: string[]; message: string }[] };
      zodError.errors?.forEach((err) => {
        const field = err.path?.[0] as keyof RegisterInput;
        if (field) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
  }, [formData, acceptTerms]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await register(formData.email, formData.password);

      // Show success message based on registration result
      if (result.email_confirmation_required) {
        toast.success(result.message || "Rejestracja udana! Sprawdź email w celu weryfikacji.");
      } else {
        toast.success("Rejestracja udana!");
      }

      // Clear form after successful registration
      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
      });
      setAcceptTerms(false);
    } catch {
      // Error handling is already done in useAuth hook
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
          placeholder="Minimum 8 znaków"
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

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Powtórz hasło</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleInputChange("confirmPassword")}
          placeholder="Powtórz hasło"
          disabled={loading}
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
        />
        {errors.confirmPassword && (
          <p id="confirm-password-error" className="text-sm text-destructive" role="alert">
            {errors.confirmPassword}
          </p>
        )}
      </div>

      <div className="flex items-start space-x-2">
        <Checkbox
          id="accept-terms"
          checked={acceptTerms}
          onCheckedChange={(checked) => setAcceptTerms(checked === true)}
          disabled={loading}
          className="mt-1"
        />
        <div className="text-sm">
          <Label htmlFor="accept-terms" className="text-sm font-normal cursor-pointer">
            Akceptuję{" "}
            <a
              href="/terms"
              className="text-primary hover:text-primary/80 transition-colors underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              regulamin
            </a>{" "}
            i{" "}
            <a
              href="/privacy"
              className="text-primary hover:text-primary/80 transition-colors underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              politykę prywatności
            </a>
          </Label>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Rejestrowanie..." : "Zarejestruj się"}
      </Button>

      {/* Navigation link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Masz już konto?{" "}
          <a href="/auth/login" className="text-primary hover:text-primary/80 transition-colors underline">
            Zaloguj się
          </a>
        </p>
      </div>
    </form>
  );
}
