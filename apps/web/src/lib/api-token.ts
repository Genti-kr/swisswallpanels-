import jwt from 'jsonwebtoken';
import { authSecret } from './auth-secret';
import type { AdminSessionUser } from './admin-session';

export function createApiToken(user: AdminSessionUser): string {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET ||
    authSecret;

  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn: '15m', algorithm: 'HS256' }
  );
}
