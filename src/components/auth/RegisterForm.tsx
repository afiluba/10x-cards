import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
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
  const { register: registerUser, isLoading } = useAuth();
  const [acceptTerms, setAcceptTerms] = useState<boolean>(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: RegisterInput) => {
    if (!acceptTerms) {
      toast.error("Musisz zaakceptować regulamin i politykę prywatności");
      return;
    }

    try {
      const result = await registerUser(data.email, data.password);

      // Show success message based on registration result
      if (result.email_confirmation_required) {
        toast.success(result.message || "Rejestracja udana! Sprawdź email w celu weryfikacji.");
      } else {
        toast.success("Rejestracja udana!");
      }

      // Redirect to login page after successful registration
      // eslint-disable-next-line react-compiler/react-compiler
      window.location.href = "/auth/login";
    } catch {
      // Error handling is already done in useAuth hook
    }
  };

  const loading = isLoading || isSubmitting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-test-id="register-form">
      <FormField
        label="Email"
        type="email"
        placeholder="twoj@email.com"
        registration={register("email")}
        error={errors.email}
        disabled={loading}
        data-test-id="register-email-input"
      />

      <FormField
        label="Hasło"
        type="password"
        placeholder="Minimum 8 znaków"
        registration={register("password")}
        error={errors.password}
        disabled={loading}
        data-test-id="register-password-input"
      />

      <FormField
        label="Powtórz hasło"
        type="password"
        placeholder="Powtórz hasło"
        registration={register("confirmPassword")}
        error={errors.confirmPassword}
        disabled={loading}
        data-test-id="register-confirm-password-input"
      />

      <div className="flex items-start space-x-2" data-test-id="register-terms-container">
        <Checkbox
          id="accept-terms"
          checked={acceptTerms}
          onCheckedChange={(checked) => setAcceptTerms(checked === true)}
          disabled={loading}
          className="mt-1"
          data-test-id="register-accept-terms-checkbox"
        />
        <div className="text-sm">
          <Label htmlFor="accept-terms" className="text-sm font-normal cursor-pointer">
            Akceptuję{" "}
            <a
              href="/terms"
              className="text-primary hover:text-primary/80 transition-colors underline"
              target="_blank"
              rel="noopener noreferrer"
              data-test-id="register-terms-link"
            >
              regulamin
            </a>{" "}
            i{" "}
            <a
              href="/privacy"
              className="text-primary hover:text-primary/80 transition-colors underline"
              target="_blank"
              rel="noopener noreferrer"
              data-test-id="register-privacy-link"
            >
              politykę prywatności
            </a>
          </Label>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full" data-test-id="register-submit-button">
        {loading ? "Rejestrowanie..." : "Zarejestruj się"}
      </Button>

      {/* Navigation link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Masz już konto?{" "}
          <a
            href="/auth/login"
            className="text-primary hover:text-primary/80 transition-colors underline"
            data-test-id="register-login-link"
          >
            Zaloguj się
          </a>
        </p>
      </div>
    </form>
  );
}
