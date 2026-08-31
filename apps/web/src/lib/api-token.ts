import jwt from 'jsonwebtoken';
import { authSecret } from './auth-secret';
import type { AdminSessionUser } from './admin-session';

export function createApiToken(user: AdminSessionUser): string {
  const secret =
    process.env.JWT_SECRET ||
    process.env.AUTH_SECRET ||
    authSecret;

  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn: '15m', algorithm: 'HS256' }
  );
}
