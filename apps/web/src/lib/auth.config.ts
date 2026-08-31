import { NextAuthConfig } from 'next-auth';
import { authSecret } from './auth-secret';

const EIGHT_HOURS = 60 * 60 * 8;
const THIRTY_DAYS = 60 * 60 * 24 * 30;

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
  providers: [],
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
