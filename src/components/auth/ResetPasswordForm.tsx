import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
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
    } catch {
      // Error handling is already done in useAuth hook
    }
  };

  const onSubmitUpdate = async (data: UpdatePasswordInput) => {
    try {
      await updatePassword(data.password, resetToken || undefined);
      toast.success("Hasło zostało pomyślnie zmienione!");
    } catch {
      // Error handling is already done in useAuth hook
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

        <FormField
          label="Nowe hasło"
          type="password"
          placeholder="Minimum 8 znaków"
          registration={registerUpdate("password")}
          error={updateErrors.password}
          disabled={loading}
        />

        <FormField
          label="Powtórz nowe hasło"
          type="password"
          placeholder="Powtórz hasło"
          registration={registerUpdate("confirmPassword")}
          error={updateErrors.confirmPassword}
          disabled={loading}
        />

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

      <FormField
        label="Email"
        type="email"
        placeholder="twoj@email.com"
        registration={registerRequest("email")}
        error={requestErrors.email}
        disabled={loading}
      />

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
