/* Ports the iOS validation rules (AuthViewModel.swift), extended for the web
   sign-up screen. Messages are i18next keys resolved at render time so
   validation copy localizes with the UI. */
import { z } from 'zod';

/* Same regex iOS uses for the email predicate. */
const EMAIL_REGEX = /^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/* New passwords must clear 8 characters. iOS (and every account created
   before this screen existed) allows 6, so this floor applies to sign-up and
   to setting a password — never to signing in, or we'd lock those users out. */
export const PASSWORD_MIN = 8;

export const isValidEmail = (email: string): boolean => EMAIL_REGEX.test(email.trim());

const emailSchema = z
  .string()
  .trim()
  .min(1, 'errors.emailRequired')
  .regex(EMAIL_REGEX, 'errors.emailInvalid');

const newPasswordSchema = z
  .string()
  .min(1, 'errors.passwordRequired')
  .min(PASSWORD_MIN, 'errors.passwordTooShort');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'errors.passwordRequired'),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, 'errors.nameRequired'),
  email: emailSchema,
  password: newPasswordSchema,
});

export const magicLinkSchema = z.object({
  email: emailSchema,
});

export const setPasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirm: z.string().min(1, 'errors.passwordRequired'),
  })
  .refine((values) => values.password === values.confirm, {
    message: 'errors.passwordsDoNotMatch',
    path: ['confirm'],
  });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type MagicLinkValues = z.infer<typeof magicLinkSchema>;
export type SetPasswordValues = z.infer<typeof setPasswordSchema>;
