import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { registerSchema, type RegisterInput } from "@/lib/schemas/auth.schemas";
import { toast } from "sonner";

interface RegisterFormProps {
  onRegister?: (data: RegisterInput) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Registration form component with email, password, confirm password fields and terms acceptance.
 * Provides validation, error handling, and navigation link to login.
 */
export function RegisterForm({ onRegister, isLoading = false }: RegisterFormProps) {
  const [formData, setFormData] = useState<RegisterInput>({
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterInput, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback((name: keyof RegisterInput, value: string) => {
    try {
      const fieldSchema = registerSchema.pick({ [name]: true });
      fieldSchema.parse({ [name]: value });
      setErrors(prev => ({ ...prev, [name]: undefined }));
      return true;
    } catch (error: any) {
      const message = error.errors?.[0]?.message || "Błąd walidacji";
      setErrors(prev => ({ ...prev, [name]: message }));
      return false;
    }
  }, []);

  const handleInputChange = (name: keyof RegisterInput) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [name]: value }));

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
    } catch (error: any) {
      const fieldErrors: Partial<Record<keyof RegisterInput, string>> = {};
      error.errors?.forEach((err: any) => {
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
      if (onRegister) {
        await onRegister(formData);
      } else {
        // Mock registration for UI development
        toast.success("Rejestracja udana! Sprawdź email w celu weryfikacji.");
        console.log("Registration attempt:", formData);
      }
    } catch (error) {
      toast.error("Błąd rejestracji. Spróbuj ponownie.");
      console.error("Registration error:", error);
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
          onCheckedChange={setAcceptTerms}
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
          <a
            href="/auth/login"
            className="text-primary hover:text-primary/80 transition-colors underline"
          >
            Zaloguj się
          </a>
        </p>
      </div>
    </form>
  );
}
