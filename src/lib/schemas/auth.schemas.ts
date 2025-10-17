import { z } from "zod";

/**
 * Validation schema for login form.
 * Enforces email format and minimum password length.
 */
export const loginSchema = z.object({
  email: z.string().email("Nieprawidłowy format email").trim(),
  password: z.string().min(3, "Hasło musi mieć minimum 3 znaki"),
});

/**
 * TypeScript type inferred from the login schema.
 */
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Validation schema for registration form.
 * Enforces email format, password strength, and password confirmation match.
 */
export const registerSchema = z
  .object({
    email: z.string().email("Nieprawidłowy format email").trim(),
    password: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
    confirmPassword: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

/**
 * TypeScript type inferred from the register schema.
 */
export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Validation schema for password reset request form.
 * Enforces valid email format.
 */
export const resetPasswordRequestSchema = z.object({
  email: z.string().email("Nieprawidłowy format email").trim(),
});

/**
 * TypeScript type inferred from the reset password request schema.
 */
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;

/**
 * Validation schema for password update form (after token received).
 * Enforces password strength and confirmation match.
 */
export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
    confirmPassword: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

/**
 * TypeScript type inferred from the update password schema.
 */
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

/**
 * =================================================================================
 * API COMMAND SCHEMAS
 * =================================================================================
 */

/**
 * Validation schema for login API command.
 */
export const loginCommandSchema = z.object({
  email: z.string().email("Nieprawidłowy format email").trim(),
  password: z.string().min(3, "Hasło musi mieć minimum 3 znaki"),
});

/**
 * TypeScript type inferred from the login command schema.
 */
export type AuthLoginCommand = z.infer<typeof loginCommandSchema>;

/**
 * Validation schema for register API command.
 */
export const registerCommandSchema = z.object({
  email: z.string().email("Nieprawidłowy format email").trim(),
  password: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
});

/**
 * TypeScript type inferred from the register command schema.
 */
export type AuthRegisterCommand = z.infer<typeof registerCommandSchema>;

/**
 * Validation schema for reset password API command.
 */
export const resetPasswordCommandSchema = z.object({
  email: z.string().email("Nieprawidłowy format email").trim(),
});

/**
 * TypeScript type inferred from the reset password command schema.
 */
export type AuthResetPasswordCommand = z.infer<typeof resetPasswordCommandSchema>;

/**
 * Validation schema for update password API command.
 */
export const updatePasswordCommandSchema = z.object({
  password: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
  token: z.string().optional(),
});

/**
 * TypeScript type inferred from the update password command schema.
 */
export type AuthUpdatePasswordCommand = z.infer<typeof updatePasswordCommandSchema>;

/**
 * Validation schema for logout API command (empty command).
 */
export const logoutCommandSchema = z.object({});

/**
 * TypeScript type inferred from the logout command schema.
 */
export type AuthLogoutCommand = z.infer<typeof logoutCommandSchema>;
