import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPasswordRequestSchema, updatePasswordSchema, type ResetPasswordRequestInput, type UpdatePasswordInput } from "@/lib/schemas/auth.schemas";
import { toast } from "sonner";

interface ResetPasswordFormProps {
  onRequestReset?: (data: ResetPasswordRequestInput) => Promise<void>;
  onUpdatePassword?: (data: UpdatePasswordInput) => Promise<void>;
  isLoading?: boolean;
  resetToken?: string | null;
}

/**
 * Password reset form component that handles both password reset request and password update.
 * Shows different UI based on whether a reset token is present in URL parameters.
 */
export function ResetPasswordForm({
  onRequestReset,
  onUpdatePassword,
  isLoading = false,
  resetToken
}: ResetPasswordFormProps) {
  const isUpdateMode = !!resetToken;

  const [requestData, setRequestData] = useState<ResetPasswordRequestInput>({
    email: ""
  });

  const [updateData, setUpdateData] = useState<UpdatePasswordInput>({
    password: "",
    confirmPassword: ""
  });

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form data when mode changes
  useEffect(() => {
    setErrors({});
    setRequestData({ email: "" });
    setUpdateData({ password: "", confirmPassword: "" });
  }, [isUpdateMode]);

  const validateField = useCallback((schema: any, name: string, value: string) => {
    try {
      const fieldSchema = schema.pick({ [name]: true });
      fieldSchema.parse({ [name]: value });
      setErrors(prev => ({ ...prev, [name]: undefined }));
      return true;
    } catch (error: any) {
      const message = error.errors?.[0]?.message || "Błąd walidacji";
      setErrors(prev => ({ ...prev, [name]: message }));
      return false;
    }
  }, []);

  const validateForm = useCallback(() => {
    const schema = isUpdateMode ? updatePasswordSchema : resetPasswordRequestSchema;
    const data = isUpdateMode ? updateData : requestData;

    try {
      schema.parse(data);
      setErrors({});
      return true;
    } catch (error: any) {
      const fieldErrors: Partial<Record<string, string>> = {};
      error.errors?.forEach((err: any) => {
        const field = err.path?.[0] as string;
        if (field) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
  }, [isUpdateMode, requestData, updateData]);

  const handleRequestInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRequestData({ email: value });
    validateField(resetPasswordRequestSchema, "email", value);
  };

  const handleUpdateInputChange = (name: keyof UpdatePasswordInput) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setUpdateData(prev => ({ ...prev, [name]: value }));
    validateField(updatePasswordSchema, name, value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (isUpdateMode) {
        if (onUpdatePassword) {
          await onUpdatePassword(updateData);
        } else {
          // Mock password update for UI development
          toast.success("Hasło zostało zmienione!");
          console.log("Password update attempt:", updateData);
        }
      } else {
        if (onRequestReset) {
          await onRequestReset(requestData);
        } else {
          // Mock password reset request for UI development
          toast.success("Link do resetowania hasła został wysłany na email!");
          console.log("Password reset request:", requestData);
        }
      }
    } catch (error) {
      const message = isUpdateMode
        ? "Błąd zmiany hasła. Spróbuj ponownie."
        : "Błąd wysyłania żądania resetowania hasła.";
      toast.error(message);
      console.error("Reset password error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const loading = isLoading || isSubmitting;

  if (isUpdateMode) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold">Ustaw nowe hasło</h2>
          <p className="text-sm text-muted-foreground">
            Wprowadź nowe hasło dla swojego konta
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Nowe hasło</Label>
          <Input
            id="password"
            type="password"
            value={updateData.password}
            onChange={handleUpdateInputChange("password")}
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
          <Label htmlFor="confirmPassword">Powtórz nowe hasło</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={updateData.confirmPassword}
            onChange={handleUpdateInputChange("confirmPassword")}
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

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Zmienianie hasła..." : "Zmień hasło"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-lg font-semibold">Resetowanie hasła</h2>
        <p className="text-sm text-muted-foreground">
          Wprowadź swój adres email, a wyślemy Ci link do resetowania hasła
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={requestData.email}
          onChange={handleRequestInputChange}
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

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Wysyłanie..." : "Wyślij link resetowania"}
      </Button>

      {/* Navigation link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Pamiętasz hasło?{" "}
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
