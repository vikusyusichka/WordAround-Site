/* Ports the iOS validation rules (AuthViewModel.swift). Messages are i18next
   keys resolved at render time so validation copy localizes with the UI. */
import { z } from 'zod';

/* Same regex iOS uses for the email predicate. */
const EMAIL_REGEX = /^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export const isValidEmail = (email: string): boolean => EMAIL_REGEX.test(email.trim());

const emailSchema = z
  .string()
  .trim()
  .min(1, 'errors.emailRequired')
  .regex(EMAIL_REGEX, 'errors.emailInvalid');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'errors.passwordRequired'),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'errors.passwordRequired')
    .min(6, 'errors.passwordTooShort'),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
