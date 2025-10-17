import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  resetPasswordRequestSchema,
  updatePasswordSchema,
  type ResetPasswordRequestInput,
  type UpdatePasswordInput,
} from "@/lib/schemas/auth.schemas";
import { toast } from "sonner";
import { useAuth } from "@/components/layout/hooks/useAuth";

interface ResetPasswordFormProps {
  resetToken?: string | null;
}

/**
 * Password reset form component that handles both password reset request and password update.
 * Shows different UI based on whether a reset token is present in URL parameters.
 */
export function ResetPasswordForm({ resetToken }: ResetPasswordFormProps) {
  const { resetPassword, updatePassword, isLoading } = useAuth();
  const isUpdateMode = !!resetToken;

  const {
    register: registerRequest,
    handleSubmit: handleSubmitRequest,
    formState: { errors: requestErrors, isSubmitting: isSubmittingRequest },
  } = useForm<ResetPasswordRequestInput>({
    resolver: zodResolver(resetPasswordRequestSchema),
    mode: "onChange",
  });

  const {
    register: registerUpdate,
    handleSubmit: handleSubmitUpdate,
    formState: { errors: updateErrors, isSubmitting: isSubmittingUpdate },
  } = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    mode: "onChange",
  });

  const onSubmitRequest = async (data: ResetPasswordRequestInput) => {
    try {
      await resetPassword(data.email);
      toast.success("Link do resetowania hasła został wysłany na email!");
    } catch (error) {
      // Error handling is already done in useAuth hook
      console.error("Reset password error:", error);
    }
  };

  const onSubmitUpdate = async (data: UpdatePasswordInput) => {
    try {
      await updatePassword(data.password, resetToken || undefined);
      toast.success("Hasło zostało pomyślnie zmienione!");
    } catch (error) {
      // Error handling is already done in useAuth hook
      console.error("Update password error:", error);
    }
  };

  const loading = isLoading || isSubmittingRequest || isSubmittingUpdate;

  if (isUpdateMode) {
    return (
      <form onSubmit={handleSubmitUpdate(onSubmitUpdate)} className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold">Ustaw nowe hasło</h2>
          <p className="text-sm text-muted-foreground">Wprowadź nowe hasło dla swojego konta</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Nowe hasło</Label>
          <Input
            id="password"
            type="password"
            {...registerUpdate("password")}
            placeholder="Minimum 8 znaków"
            disabled={loading}
            aria-invalid={!!updateErrors.password}
            aria-describedby={updateErrors.password ? "password-error" : undefined}
          />
          {updateErrors.password && (
            <p id="password-error" className="text-sm text-destructive" role="alert">
              {updateErrors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Powtórz nowe hasło</Label>
          <Input
            id="confirmPassword"
            type="password"
            {...registerUpdate("confirmPassword")}
            placeholder="Powtórz hasło"
            disabled={loading}
            aria-invalid={!!updateErrors.confirmPassword}
            aria-describedby={updateErrors.confirmPassword ? "confirm-password-error" : undefined}
          />
          {updateErrors.confirmPassword && (
            <p id="confirm-password-error" className="text-sm text-destructive" role="alert">
              {updateErrors.confirmPassword.message}
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
    <form onSubmit={handleSubmitRequest(onSubmitRequest)} className="space-y-4">
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
          {...registerRequest("email")}
          placeholder="twoj@email.com"
          disabled={loading}
          aria-invalid={!!requestErrors.email}
          aria-describedby={requestErrors.email ? "email-error" : undefined}
        />
        {requestErrors.email && (
          <p id="email-error" className="text-sm text-destructive" role="alert">
            {requestErrors.email.message}
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
          <a href="/auth/login" className="text-primary hover:text-primary/80 transition-colors underline">
            Zaloguj się
          </a>
        </p>
      </div>
    </form>
  );
}
