import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from './auth';

export async function requireVerifiedEmail(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, role: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') {
    return next();
  }

  if (!user.emailVerified) {
    return res.status(403).json({
      error: 'Email not verified',
      code: 'EMAIL_NOT_VERIFIED',
      message: 'Please verify your email before placing an order.',
    });
  }

  next();
}
