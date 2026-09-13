import NextAuth, { NextAuthConfig, CredentialsSignin } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { loginSchema } from './auth-schemas';
import { createAuditLog } from './audit';
import { hashIp } from './security';
import { authEmailService } from './auth-email';
import { resetRateLimit } from './rate-limit';
import { authSecret } from './auth-secret';
import { AUTH_ERROR_MESSAGES } from './auth-errors';

function credentialsError(code: keyof typeof AUTH_ERROR_MESSAGES | string): never {
  const err = new CredentialsSignin();
  err.code = code;
  throw err;
}

const EIGHT_HOURS = 60 * 60 * 8;
const THIRTY_DAYS = 60 * 60 * 24 * 30;
const LOGIN_IP_BLOCK_THRESHOLD = 15;
const LOGIN_IP_BLOCK_MS = 15 * 60 * 1000;

type IpBlockRecord = { attempts: number; blockedAt: Date | null };

async function getIpBlock(hashedIP: string): Promise<IpBlockRecord | null> {
  try {
    return await prisma.failedAttempt.findUnique({ where: { ip: hashedIP } });
  } catch (error) {
    console.warn('Login IP rate-limit lookup skipped:', error);
    return null;
  }
}

async function recordFailedLoginIp(
  hashedIP: string,
  ipBlock: IpBlockRecord | null
): Promise<void> {
  try {
    await prisma.failedAttempt.upsert({
      where: { ip: hashedIP },
      create: { ip: hashedIP, attempts: 1 },
      update: {
        attempts: { increment: 1 },
        blockedAt:
          (ipBlock ? ipBlock.attempts + 1 : 1) >= LOGIN_IP_BLOCK_THRESHOLD
            ? new Date()
            : undefined,
      },
    });
  } catch (error) {
    console.warn('Login IP rate-limit record skipped:', error);
  }
}

async function clearIpBlock(hashedIP: string): Promise<void> {
  try {
    await prisma.failedAttempt.deleteMany({ where: { ip: hashedIP } });
  } catch {
    /* optional table / connection */
  }
}

export const authConfig: NextAuthConfig = {
  secret: authSecret,
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: THIRTY_DAYS,
    updateAge: 60 * 15,
  },
  cookies: {
    sessionToken: {
      name: 'sessionToken',
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      },
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember Me', type: 'text' },
      },
      async authorize(credentials, req) {
        try {
        if (!credentials) return null;

        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          credentialsError('invalid_credentials');
        }

        const { email, password } = parsed.data;
        const rememberMe = credentials.rememberMe === 'true';
        const isDev = process.env.NODE_ENV === 'development';

        const ip =
          req.headers.get('x-forwarded-for') ||
          req.headers.get('x-real-ip') ||
          '127.0.0.1';
        const ipStr = Array.isArray(ip) ? ip[0] : ip;
        const hashedIP = hashIp(`login:${ipStr}`);
        const userAgent = req.headers.get('user-agent') || null;

        if (isDev) {
          await clearIpBlock(hashedIP);
        }

        const ipBlock = await getIpBlock(hashedIP);

        if (
          !isDev &&
          ipBlock?.blockedAt &&
          Date.now() - ipBlock.blockedAt.getTime() < LOGIN_IP_BLOCK_MS
        ) {
          credentialsError('rate_limited');
        } else if (ipBlock?.blockedAt) {
          await clearIpBlock(hashedIP);
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          await recordFailedLoginIp(hashedIP, ipBlock);
          await createAuditLog('LOGIN_FAILED', null, ipStr, userAgent);
          credentialsError('invalid_credentials');
        }

        if (user.isLocked) {
          await createAuditLog('LOGIN_FAILED', user.id, ipStr, userAgent);
          credentialsError('account_locked');
        }

        if (!user.emailVerified) {
          const isAdminUser = user.role === 'ADMIN' || user.role === 'SUPERADMIN';
          if (isDev || isAdminUser) {
            await prisma.user.update({
              where: { id: user.id },
              data: { emailVerified: true },
            });
          } else {
            credentialsError('email_not_verified');
          }
        }

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);

        if (!passwordMatch) {
          const userFailedAttempts = user.failedAttempts + 1;
          const isLocking = userFailedAttempts >= 10;
          let unlockToken = '';

          const userUpdate: {
            failedAttempts: number;
            isLocked?: boolean;
            unlockToken?: string;
            unlockTokenExpires?: Date;
          } = { failedAttempts: userFailedAttempts };

          if (isLocking) {
            userUpdate.isLocked = true;
            unlockToken = crypto.randomBytes(32).toString('hex');
            userUpdate.unlockToken = crypto
              .createHash('sha256')
              .update(unlockToken)
              .digest('hex');
            userUpdate.unlockTokenExpires = new Date(
              Date.now() + 24 * 60 * 60 * 1000
            );
          }

          await prisma.user.update({
            where: { id: user.id },
            data: userUpdate,
          });

          await recordFailedLoginIp(hashedIP, ipBlock);

          if (isLocking) {
            await authEmailService.sendAccountLocked(
              {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
              },
              unlockToken,
              user.preferredLanguage.toLowerCase()
            );
            await createAuditLog('ACCOUNT_LOCKED', user.id, ipStr, userAgent);
          }

          await createAuditLog('LOGIN_FAILED', user.id, ipStr, userAgent);
          credentialsError('invalid_credentials');
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedAttempts: 0 },
        });

        await clearIpBlock(hashedIP);

        await resetRateLimit('login', ipStr);

        await createAuditLog('LOGIN_SUCCESS', user.id, ipStr, userAgent);

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          name: `${user.firstName} ${user.lastName}`,
          rememberMe,
        };
        } catch (error) {
          if (error instanceof CredentialsSignin) {
            throw error;
          }
          console.error('Login authorize error:', error);
          credentialsError('server_error');
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
        token.email = user.email;
        token.iat = Math.floor(Date.now() / 1000);
        token.rememberMe = (user as { rememberMe?: boolean }).rememberMe ?? false;
        token.sessionMaxAge = token.rememberMe ? THIRTY_DAYS : EIGHT_HOURS;
      }

      if (token.sessionMaxAge && token.iat) {
        const expiresAt = (token.iat as number) + (token.sessionMaxAge as number);
        if (Math.floor(Date.now() / 1000) > expiresAt) {
          return null;
        }
      }

      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { updatedAt: true },
        });

        if (!dbUser) {
          return null;
        }

        const tokenIat = token.iat as number;
        const userUpdatedAtSec = Math.floor(dbUser.updatedAt.getTime() / 1000);

        if (userUpdatedAtSec > tokenIat) {
          return null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { id?: string }).id = token.id as string;
        if (token.email) {
          session.user.email = token.email as string;
        }
      }
      return session;
    },
  },
};

export const { auth, signIn, signOut, handlers } = NextAuth(authConfig);
