import { create } from 'zustand';
import { UserDTO } from '@swisswall/types';
import { signIn, signOut } from 'next-auth/react';
import { authFetch } from './auth-fetch';
import { isAdminRole } from './user-mapper';
import { resolveAuthErrorMessage, getAuthErrorCode, authErrorTranslationKey } from './auth-errors';

interface AuthState {
  user: UserDTO | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
    options?: {
      locale?: import('@/i18n/routing').AppLocale;
      translateError?: (code: import('./auth-errors').AuthErrorCode) => string;
    }
  ) => Promise<void>;
  register: (data: Record<string, unknown>) => Promise<{
    message: string;
    email: string;
    devVerifyUrl?: string;
  }>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setUser: (user: UserDTO | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,

  login: async (
    email: string,
    password: string,
    rememberMe = false,
    options?: {
      locale?: import('@/i18n/routing').AppLocale;
      translateError?: (code: ReturnType<typeof getAuthErrorCode>) => string;
    }
  ) => {
    set({ loading: true });
    try {
      const res = await signIn('credentials', {
        email,
        password,
        rememberMe: rememberMe ? 'true' : 'false',
        redirect: false,
      });

      if (res?.error) {
        const code = getAuthErrorCode(res.error, res.code);
        const message = options?.translateError
          ? options.translateError(code)
          : resolveAuthErrorMessage(res.error, res.code, options?.locale ?? 'sq');
        throw new Error(message);
      }

      await useAuth.getState().fetchMe();
    } finally {
      set({ loading: false });
    }
  },

  register: async (data) => {
    set({ loading: true });
    try {
      const res = await authFetch<{
        user: UserDTO;
        message: string;
        devVerifyUrl?: string;
      }>(
        '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );
      return {
        message: res.message,
        email: res.user.email,
        devVerifyUrl: res.devVerifyUrl,
      };
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
      await signOut({ redirect: false });
    } catch {
      await signOut({ redirect: false });
    }
    set({ user: null });
  },

  fetchMe: async () => {
    try {
      const res = await authFetch<{ user: UserDTO }>('/api/auth/me');
      set({ user: res.user });
    } catch {
      set({ user: null });
    }
  },

  setUser: (user) => set({ user }),
}));

export { isAdminRole };
