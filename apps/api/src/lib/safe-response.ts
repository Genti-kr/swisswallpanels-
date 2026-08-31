import { z } from 'zod';

const isProd = process.env.NODE_ENV === 'production';

export function validationErrorResponse(error: z.ZodError) {
  if (isProd) {
    return { status: 400, body: { error: 'Validation failed' } };
  }
  return { status: 400, body: { error: 'Validation failed', details: error.errors } };
}

export function internalErrorMessage(err: unknown): string {
  if (isProd) {
    return 'Internal server error';
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return 'Internal server error';
}
