import { z } from 'zod';

const passwordRules = z
  .string()
  .min(8)
  .max(128)
  .regex(/[A-Z]/, 'Duhet të ketë të paktën 1 shkronjë të madhe')
  .regex(/[0-9]/, 'Duhet të ketë të paktën 1 numër')
  .regex(/[^a-zA-Z0-9]/, 'Duhet të ketë të paktën 1 karakter special');

/** Public signup — always creates a USER (role is not accepted from the client). */
export const registerSchema = z
  .object({
    email: z.string().email().max(255).trim().toLowerCase(),
    password: passwordRules,
    firstName: z.string().min(2).max(80).trim(),
    lastName: z.string().min(2).max(80).trim(),
    phone: z.string().max(30).trim().optional(),
    companyName: z.string().max(200).trim().optional(),
    vatNumber: z.string().max(50).trim().optional(),
    preferredLanguage: z.enum(['DE', 'FR', 'EN', 'SQ'] as const).default('DE'),
  })
  .strict();

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
  password: passwordRules,
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
