'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { authFetch } from '@/lib/auth-fetch';
import { useAuth } from '@/lib/auth-store';
import { ArrowLeft, Mail, AlertCircle, CheckCircle } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');
  const justRegistered = searchParams.get('registered') === '1';
  const locale = useLocale();
  const { fetchMe } = useAuth();
  const tCommon = useTranslations('Common');
  const tAuth = useTranslations('Auth');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState(
    justRegistered ? tAuth('successRegister') : ''
  );
  const [email, setEmail] = useState(emailParam || '');
  const [isResending, setIsResending] = useState(false);
  const [devVerifyUrl, setDevVerifyUrl] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('devVerifyUrl');
    if (stored) {
      setDevVerifyUrl(stored);
      sessionStorage.removeItem('devVerifyUrl');
    }
  }, []);

  useEffect(() => {
    if (token) {
      setStatus('loading');
      authFetch<{ message: string }>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      })
        .then((res) => {
          setStatus('success');
          setMessage(res.message);
          fetchMe();
        })
        .catch((err) => {
          setStatus('error');
          setMessage(err.message);
        });
    }
  }, [token, fetchMe]);

  const resend = async () => {
    if (!email) return;
    setIsResending(true);
    try {
      const res = await authFetch<{ message: string; devVerifyUrl?: string }>(
        '/api/auth/resend-verification',
        {
          method: 'POST',
          body: JSON.stringify({ email, locale }),
        }
      );
      setMessage(tAuth('successVerifyLinkSent'));
      if (res.devVerifyUrl) {
        setDevVerifyUrl(res.devVerifyUrl);
      }
    } catch (err: any) {
      setMessage(err.message || 'Error sending link');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8F8F6] text-[#1A1A1A] relative">
      {/* Back to Home Link */}
      <Link 
        href="/" 
        className="absolute top-6 left-6 z-50 inline-flex items-center text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-[#C8B89A] transition-colors gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full border border-zinc-200/50 shadow-sm lg:bg-transparent lg:backdrop-blur-none lg:border-none lg:shadow-none lg:top-8 lg:left-8"
      >
        <ArrowLeft className="w-4 h-4" />
        {tCommon('back')}
      </Link>

      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-zinc-100/80 space-y-8 text-center transition-all duration-300">
        <div className="space-y-2">
          <h1 className="text-3xl font-light tracking-tight text-zinc-900">
            {tAuth('verifyEmailTitle')}
          </h1>
          <div className="w-12 h-0.5 bg-[#C8B89A] mx-auto rounded-full" />
        </div>

        {status === 'loading' && (
          <div className="py-8 space-y-4 flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-[#C8B89A]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-zinc-500 font-light">{tAuth('verifying')}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-4 space-y-6 flex flex-col items-center animate-fade-in">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <p className="text-green-600 font-light max-w-sm">{message}</p>
            <Link
              href="/login"
              className="inline-block w-full bg-[#1A1A1A] text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#C8B89A] hover:text-[#1A1A1A] transition-all duration-300 shadow-md"
            >
              {tCommon('login')}
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4 space-y-6 flex flex-col items-center animate-fade-in">
            <AlertCircle className="w-16 h-16 text-red-500" />
            <p className="text-red-600 font-light max-w-sm">{message}</p>
            <Link 
              href="/login" 
              className="inline-block w-full bg-[#1A1A1A] text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#C8B89A] hover:text-[#1A1A1A] transition-all duration-300 shadow-md"
            >
              {tCommon('login')}
            </Link>
          </div>
        )}

        {status === 'idle' && !token && (
          <div className="space-y-6 animate-fade-in">
            <p className="text-zinc-500 text-sm font-light leading-relaxed">
              {tAuth('checkEmailOrResend')}
            </p>
            
            {message && (
              <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm text-left">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
                <p className="font-light">{message}</p>
              </div>
            )}

            {devVerifyUrl && (
              <div className="flex flex-col gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm text-left">
                <p className="font-light">{tAuth('devEmailNotice')}</p>
                <a
                  href={devVerifyUrl}
                  className="break-all text-[#1A1A1A] font-semibold underline underline-offset-2 hover:text-[#C8B89A] transition-colors"
                >
                  {tAuth('devEmailClick')}
                </a>
              </div>
            )}

            <div className="space-y-4 text-left">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                  {tCommon('email')}
                </label>
                <div className="relative flex items-center group">
                  <Mail className="absolute left-4 text-zinc-400 group-focus-within:text-[#C8B89A] transition-colors w-5 h-5 pointer-events-none" />
                  <input 
                    type="email" 
                    placeholder="name@example.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="w-full pl-12 pr-4 py-3 bg-[#F8F8F6] border border-zinc-200 rounded-xl text-sm transition-all focus:outline-none focus:border-[#C8B89A] focus:ring-1 focus:ring-[#C8B89A] placeholder-zinc-400 text-zinc-800 font-light" 
                    required 
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={resend} 
              disabled={isResending || !email}
              className="w-full bg-[#1A1A1A] text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#C8B89A] hover:text-[#1A1A1A] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {isResending ? (
                <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                tAuth('sendAgain')
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
