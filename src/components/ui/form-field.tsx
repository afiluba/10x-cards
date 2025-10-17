import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: FieldError;
  registration: UseFormRegisterReturn;
  "data-test-id"?: string;
}

/**
 * FormField compound component that encapsulates Label + Input + Error message.
 * Automatically handles ARIA attributes for accessibility.
 * Integrates with React Hook Form for registration and validation.
 *
 * @example
 * ```tsx
 * <FormField
 *   label="Email"
 *   type="email"
 *   placeholder="twoj@email.com"
 *   registration={register("email")}
 *   error={errors.email}
 *   disabled={loading}
 *   data-test-id="login-email-input"
 * />
 * ```
 */
export function FormField({ label, error, registration, "data-test-id": testId, ...inputProps }: FormFieldProps) {
  const inputId = registration.name;
  const errorId = `${inputId}-error`;

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <Input
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        data-test-id={testId}
        {...registration}
        {...inputProps}
      />
      {error && (
        <p
          id={errorId}
          className="text-sm text-destructive"
          role="alert"
          data-test-id={testId ? `${testId}-error` : undefined}
        >
          {error.message}
        </p>
      )}
    </div>
  );
}
