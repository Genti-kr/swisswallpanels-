import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  password: z.string().min(8).max(128),
});

export const registerSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, 'Duhet të ketë të paktën 1 shkronjë të madhe')
    .regex(/[0-9]/, 'Duhet të ketë të paktën 1 numër')
    .regex(/[^a-zA-Z0-9]/, 'Duhet të ketë të paktën 1 karakter special'),
  firstName: z.string().min(2).max(100).trim(),
  lastName: z.string().min(2).max(100).trim(),
  phone: z.string().max(30).trim().optional(),
  companyName: z.string().max(200).trim().optional(),
  vatNumber: z.string().max(50).trim().optional(),
  preferredLanguage: z.enum(['DE', 'FR', 'EN', 'SQ'] as const).default('DE'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  locale: z.enum(['de', 'fr', 'en', 'sq'] as const).default('de'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(128),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, 'Duhet të ketë të paktën 1 shkronjë të madhe')
    .regex(/[0-9]/, 'Duhet të ketë të paktën 1 numër')
    .regex(/[^a-zA-Z0-9]/, 'Duhet të ketë të paktën 1 karakter special'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1).max(128),
});

export const resendVerificationSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  locale: z.enum(['de', 'fr', 'en', 'sq'] as const).default('de'),
});

export const unlockAccountSchema = z.object({
  token: z.string().min(1).max(128),
});
