import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@swisswall/types';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
  };
}

function getCookie(req: Request, name: string): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').reduce((acc, current) => {
    const [key, ...val] = current.trim().split('=');
    acc[key] = val.join('=');
    return acc;
  }, {} as Record<string, string>);
  return cookies[name] ? decodeURIComponent(cookies[name]) : null;
}

function getSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return (
    getCookie(req, 'sessionToken') ||
    getCookie(req, '__Secure-sessionToken') ||
    getCookie(req, 'authjs.session-token') ||
    getCookie(req, '__Secure-authjs.session-token')
  );
}

function verifyToken(token: string) {
  const secrets = [
    process.env.AUTH_SECRET,
    process.env.NEXTAUTH_SECRET,
    process.env.JWT_SECRET,
  ].filter(Boolean) as string[];

  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret) as {
        id?: string;
        sub?: string;
        email?: string;
        role?: Role;
      };
    } catch {
      continue;
    }
  }

  throw new Error('Invalid token');
}

export function resolveSessionUserId(req: Request): string | null {
  const token = getSessionToken(req);
  if (!token) return null;

  try {
    const decoded = verifyToken(token);
    return decoded.id || decoded.sub || null;
  } catch {
    return null;
  }
}

/** Sets req.user when a valid session exists; never blocks the request. */
export const optionalAuth = () => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = getSessionToken(req);
    if (!token) {
      return next();
    }

    try {
      const decoded = verifyToken(token);
      const userId = decoded.id || decoded.sub;
      const role = decoded.role;

      if (userId && role && decoded.email) {
        req.user = {
          id: userId,
          email: decoded.email,
          role,
        };
      }
    } catch {
      // Ignore invalid tokens for optional auth
    }

    next();
  };
};

export const requireAuth = (allowedRoles: Role[] = []) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = getSessionToken(req);

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    try {
      const decoded = verifyToken(token);
      const userId = decoded.id || decoded.sub;
      const role = decoded.role;

      if (!userId || !role || !decoded.email) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }

      req.user = {
        id: userId,
        email: decoded.email,
        role,
      };
      next();
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  };
};
