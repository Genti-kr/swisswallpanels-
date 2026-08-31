import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  password: z
    .string()
    .min(12)
    .max(128)
    .regex(/[A-Z]/, 'Duhet të ketë të paktën 1 shkronjë të madhe')
    .regex(/[0-9]/, 'Duhet të ketë të paktën 1 numër')
    .regex(/[^a-zA-Z0-9]/, 'Duhet të ketë të paktën 1 karakter special'),
  name: z.string().min(2).max(100).trim(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  vatNumber: z.string().optional(),
  preferredLanguage: z.enum(['DE', 'FR', 'EN', 'SQ'] as const).default('DE'),
});

export const loginSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  password: z.string().min(8).max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  locale: z.enum(['de', 'fr', 'en', 'sq'] as const).default('de'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(12)
    .max(128)
    .regex(/[A-Z]/, 'Duhet të ketë të paktën 1 shkronjë të madhe')
    .regex(/[0-9]/, 'Duhet të ketë të paktën 1 numër')
    .regex(/[^a-zA-Z0-9]/, 'Duhet të ketë të paktën 1 karakter special'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const resendVerificationSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  locale: z.enum(['de', 'fr', 'en', 'sq'] as const).default('de'),
});

export const unlockAccountSchema = z.object({
  token: z.string().min(1),
});

export const profileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  country: z.string().optional(),
});
