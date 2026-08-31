import { Router, Request, Response, NextFunction } from 'express';
import { getFrontendUrl } from '../lib/urls';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { emailService } from '../services/email';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { loginLimiter, registerLimiter, forgotPasswordLimiter } from '../middleware/rateLimit';
import { getRequiredSecret } from '../lib/secrets';
import { mapUser } from '../lib/mappers';
import { Role, Language } from '@swisswall/types';
import {
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  unlockAccountSchema,
  verifyEmailSchema,
} from '../lib/validators/auth';

const router = Router();

// CSRF check: verify origin or referer
function verifyOrigin(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const allowedOrigin = getFrontendUrl();
  
  if (origin && origin !== allowedOrigin) {
    return res.status(403).json({ error: 'Forbidden: Invalid request origin' });
  }
  if (!origin && referer && !referer.startsWith(allowedOrigin)) {
    return res.status(403).json({ error: 'Forbidden: Invalid request referer' });
  }
  next();
}

async function createAuditLog(event: string, userId: string | null, req: Request) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const ipStr = Array.isArray(ip) ? ip[0] : ip;
  const hashedIP = crypto.createHash('sha256').update(ipStr).digest('hex');
  await prisma.auditLog.create({
    data: {
      event,
      userId,
      ipAddress: hashedIP,
      userAgent: req.headers['user-agent'] || null,
      timestamp: new Date(),
    }
  });
}

router.use(verifyOrigin);

function localeFromLanguage(lang: Language): string {
  return lang.toLowerCase();
}

// Token generation helpers
const ACCESS_TOKEN_SECRET = getRequiredSecret('JWT_SECRET', 'your-256-bit-secret-here-dev-only');
const REFRESH_TOKEN_SECRET = getRequiredSecret('JWT_REFRESH_SECRET', 'your-refresh-secret-here-dev-only');

function generateAccessToken(user: { id: string; email: string; role: Role }) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );
}

function generateRefreshToken(user: { id: string; email: string; role: Role }) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * POST /api/auth/register
 */
router.post('/register', registerLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      // Return generic response or bad request without detailing info leaks
      return res.status(400).json({ error: 'Ky email është tashmë në përdorim.' });
    }

    const passwordHash = await bcrypt.hash(validatedData.password, 12);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const hashedVerifyToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
    const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const nameParts = validatedData.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        passwordHash,
        firstName,
        lastName,
        phone: validatedData.phone || null,
        companyName: validatedData.companyName || null,
        vatNumber: validatedData.vatNumber || null,
        preferredLanguage: validatedData.preferredLanguage,
        role: 'USER',
        emailVerified: false,
        emailVerifyToken: hashedVerifyToken,
        emailVerifyExpires,
      },
    });

    await prisma.cart.create({ data: { userId: user.id } });
    await prisma.wishlist.create({ data: { userId: user.id } });

    await emailService.sendEmailVerification(
      { firstName: user.firstName, lastName: user.lastName, email: user.email },
      verifyToken,
      localeFromLanguage(user.preferredLanguage)
    );

    await createAuditLog('REGISTER', user.id, req);

    res.status(201).json({
      user: mapUser(user),
      message: 'Regjistrimi u krye me sukses. Ju lutemi kontrolloni email-in për të verifikuar llogarinë tuaj.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validimi dështoi', details: error.errors });
    }
    next(error);
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user) {
      await createAuditLog('LOGIN_FAILED', null, req);
      return res.status(401).json({ error: 'Email ose fjalëkalim i pasaktë' });
    }

    if (user.isLocked) {
      await createAuditLog('LOGIN_FAILED', user.id, req);
      return res.status(401).json({ error: 'Llogaria juaj është e bllokuar. Ju lutemi kontrolloni email-in tuaj për udhëzime zhbllokimi.' });
    }

    const passwordMatch = await bcrypt.compare(validatedData.password, user.passwordHash);
    if (!passwordMatch) {
      const failedAttempts = user.failedAttempts + 1;
      const isLocking = failedAttempts >= 10;
      
      const updateData: any = { failedAttempts };
      let unlockToken = '';

      if (isLocking) {
        updateData.isLocked = true;
        unlockToken = crypto.randomBytes(32).toString('hex');
        updateData.unlockToken = crypto.createHash('sha256').update(unlockToken).digest('hex');
        updateData.unlockTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      if (isLocking) {
        await emailService.sendAccountLocked(
          { firstName: user.firstName, lastName: user.lastName, email: user.email },
          unlockToken,
          localeFromLanguage(user.preferredLanguage)
        );
        await createAuditLog('ACCOUNT_LOCKED', user.id, req);
      }

      await createAuditLog('LOGIN_FAILED', user.id, req);
      return res.status(401).json({ error: 'Email ose fjalëkalim i pasaktë' });
    }

    // Success login
    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0 },
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await createAuditLog('LOGIN_SUCCESS', user.id, req);

    res.json({
      accessToken,
      user: mapUser(user),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(401).json({ error: 'Email ose fjalëkalim i pasaktë' });
    }
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookieHeader = req.headers.cookie;
    let refreshToken = '';
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, current) => {
        const [key, ...val] = current.trim().split('=');
        acc[key] = val.join('=');
        return acc;
      }, {} as Record<string, string>);
      refreshToken = cookies['refreshToken'] ? decodeURIComponent(cookies['refreshToken']) : '';
    }

    if (!refreshToken) {
      return res.status(401).json({ error: 'Unauthorized: No refresh token' });
    }

    let payload: any;
    try {
      payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized: Invalid refresh token' });
    }

    const dbToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!dbToken || dbToken.expiresAt < new Date()) {
      if (dbToken) {
        await prisma.refreshToken.delete({ where: { id: dbToken.id } });
      }
      return res.status(401).json({ error: 'Unauthorized: Refresh token expired' });
    }

    const accessToken = generateAccessToken(dbToken.user);
    res.json({ accessToken });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookieHeader = req.headers.cookie;
    let refreshToken = '';
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, current) => {
        const [key, ...val] = current.trim().split('=');
        acc[key] = val.join('=');
        return acc;
      }, {} as Record<string, string>);
      refreshToken = cookies['refreshToken'] ? decodeURIComponent(cookies['refreshToken']) : '';
    }

    let userId: string | null = null;

    if (refreshToken) {
      const dbToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        select: { userId: true },
      });
      if (dbToken) {
        userId = dbToken.userId;
      }

      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/api/auth',
    });

    await createAuditLog('LOGOUT', userId, req);

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', forgotPasswordLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    // generic response to prevent user enumeration
    const genericResponse = { message: 'Nëse email-i ekziston në sistemin tonë, do të pranoni udhëzimet për rivendosjen e fjalëkalimit së shpejti.' };

    if (!user) {
      await createAuditLog('PASSWORD_RESET_REQUEST', null, req);
      return res.json(genericResponse);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedResetToken,
        passwordResetExpires,
      },
    });

    await emailService.sendPasswordReset(
      { firstName: user.firstName, lastName: user.lastName, email: user.email },
      resetToken,
      validatedData.locale
    );

    await createAuditLog('PASSWORD_RESET_REQUEST', user.id, req);

    res.json(genericResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validimi dështoi', details: error.errors });
    }
    next(error);
  }
});

/**
 * POST /api/auth/reset-password
 */
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = resetPasswordSchema.parse(req.body);
    const hashedResetToken = crypto.createHash('sha256').update(validatedData.token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedResetToken,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Token i rivendosjes së fjalëkalimit është i pasaktë ose ka skaduar.' });
    }

    const passwordHash = await bcrypt.hash(validatedData.password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    await createAuditLog('PASSWORD_RESET_SUCCESS', user.id, req);

    res.json({ message: 'Fjalëkalimi u rivendos me sukses. Tani mund të hyni me fjalëkalimin e ri.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validimi dështoi', details: error.errors });
    }
    next(error);
  }
});

/**
 * POST /api/auth/verify-email
 */
router.post('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = verifyEmailSchema.parse(req.body);
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        emailVerifyToken: hashedToken,
        emailVerifyExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Token verifikimi i pavlefshëm ose i skaduar.' });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
      },
    });

    await createAuditLog('EMAIL_VERIFIED', user.id, req);

    res.json({ message: 'Email u verifikua me sukses.', user: mapUser(updated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validimi dështoi', details: error.errors });
    }
    next(error);
  }
});

/**
 * POST /api/auth/resend-verification
 */
router.post('/resend-verification', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, locale } = resendVerificationSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    const genericMessage = 'Nëse email-i është i regjistruar dhe ende i paverifikuar, një link i ri është dërguar.';

    if (!user || user.emailVerified) {
      return res.json({ message: genericMessage });
    }

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const hashedVerifyToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
    const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifyToken: hashedVerifyToken,
        emailVerifyExpires,
      },
    });

    await emailService.sendEmailVerification(
      { firstName: user.firstName, lastName: user.lastName, email: user.email },
      verifyToken,
      locale
    );

    res.json({ message: genericMessage });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validimi dështoi', details: error.errors });
    }
    next(error);
  }
});

/**
 * POST /api/auth/unlock-account
 */
router.post('/unlock-account', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = unlockAccountSchema.parse(req.body);
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await prisma.user.findFirst({
      where: {
        unlockToken: hashedToken,
        unlockTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Token zhbllokimi i pavlefshëm ose i skaduar.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isLocked: false,
        failedAttempts: 0,
        unlockToken: null,
        unlockTokenExpires: null,
      },
    });

    await createAuditLog('ACCOUNT_UNLOCKED', user.id, req);

    res.json({ message: 'Llogaria juaj u zhbllokua me sukses. Tani mund të hyni.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validimi dështoi', details: error.errors });
    }
    next(error);
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth(), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: mapUser(user) });
  } catch (error) {
    next(error);
  }
});

router.patch('/profile', requireAuth(), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = profileSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
    });
    res.json({ user: mapUser(user) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed' });
    }
    next(error);
  }
});

export default router;
