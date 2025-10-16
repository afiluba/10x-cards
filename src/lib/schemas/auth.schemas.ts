import { z } from "zod";

/**
 * Validation schema for login form.
 * Enforces email format and minimum password length.
 */
export const loginSchema = z.object({
  email: z.string().email("Nieprawidłowy format email").trim(),
  password: z.string().min(6, "Hasło musi mieć minimum 6 znaków")
});

/**
 * TypeScript type inferred from the login schema.
 */
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Validation schema for registration form.
 * Enforces email format, password strength, and password confirmation match.
 */
export const registerSchema = z.object({
  email: z.string().email("Nieprawidłowy format email").trim(),
  password: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
  confirmPassword: z.string().min(8, "Hasło musi mieć minimum 8 znaków")
}).refine(data => data.password === data.confirmPassword, {
  message: "Hasła nie są identyczne",
  path: ["confirmPassword"]
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
  email: z.string().email("Nieprawidłowy format email").trim()
});

/**
 * TypeScript type inferred from the reset password request schema.
 */
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;

/**
 * Validation schema for password update form (after token received).
 * Enforces password strength and confirmation match.
 */
export const updatePasswordSchema = z.object({
  password: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
  confirmPassword: z.string().min(8, "Hasło musi mieć minimum 8 znaków")
}).refine(data => data.password === data.confirmPassword, {
  message: "Hasła nie są identyczne",
  path: ["confirmPassword"]
});

/**
 * TypeScript type inferred from the update password schema.
 */
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
