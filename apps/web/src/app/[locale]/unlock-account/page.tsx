'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react';
import { authFetch } from '@/lib/auth-fetch';

export default function UnlockAccountPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const locale = useLocale();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage(
        locale === 'sq' ? "Mungon tokeni i zhbllokimit." :
        locale === 'de' ? "Der Freischalt-Token fehlt." :
        locale === 'fr' ? "Le jeton de déverrouillage est manquant." :
        "The unlock token is missing."
      );
      return;
    }

    const unlock = async () => {
      try {
        const res = await authFetch<{ message: string }>('/api/auth/unlock-account', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });
        setStatus('success');
        setMessage(res.message);
      } catch (err: unknown) {
        setStatus('error');
        setMessage(
          err instanceof Error ? err.message : 
          (locale === 'sq' ? "Dështoi zhbllokimi i llogarisë." : "Konto-Freischaltung fehlgeschlagen.")
        );
      }
    };

    unlock();
  }, [token, locale]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F8F6] text-[#1A1A1A] p-6">
      <Link 
        href="/login" 
        className="absolute top-8 left-8 inline-flex items-center text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-[#C8B89A] transition-colors gap-2 bg-white px-4 py-2 rounded-full border border-zinc-200/50 shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        {locale === 'sq' && "Kthehu te Login"}
        {locale === 'de' && "Zurück zum Login"}
        {locale === 'fr' && "Retour à la connexion"}
        {locale === 'en' && "Back to Login"}
      </Link>

      <div className="w-full max-w-md space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-zinc-100/80 text-center">
        {status === 'loading' && (
          <div className="space-y-4 py-6">
            <svg className="animate-spin h-10 w-10 text-[#C8B89A] mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-zinc-500 font-light">
              {locale === 'sq' && "Duke zhbllokuar llogarinë tuaj..."}
              {locale === 'de' && "Ihr Konto wird freigeschaltet..."}
              {locale === 'fr' && "Déverrouillage de votre compte..."}
              {locale === 'en' && "Unlocking your account..."}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <ShieldCheck className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
            <h1 className="text-2xl font-light tracking-tight text-zinc-900">
              {locale === 'sq' && "Llogaria u Zhbllokua!"}
              {locale === 'de' && "Konto freigeschaltet!"}
              {locale === 'fr' && "Compte déverrouillé !"}
              {locale === 'en' && "Account Unlocked!"}
            </h1>
            <p className="text-zinc-500 font-light">{message}</p>
            <Link 
              href="/login" 
              className="inline-block w-full bg-[#1A1A1A] text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#C8B89A] hover:text-[#1A1A1A] transition-all duration-300 shadow-md"
            >
              {locale === 'sq' && "Hyni Tani"}
              {locale === 'de' && "Jetzt einloggen"}
              {locale === 'fr' && "Se connecter"}
              {locale === 'en' && "Log in Now"}
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto" />
            <h1 className="text-2xl font-light tracking-tight text-zinc-900">
              {locale === 'sq' && "Zhbllokimi Dështoi"}
              {locale === 'de' && "Freischaltung fehlgeschlagen"}
              {locale === 'fr' && "Échec du déverrouillage"}
              {locale === 'en' && "Unlock Failed"}
            </h1>
            <p className="text-red-500 font-light text-sm">{message}</p>
            <Link 
              href="/login" 
              className="inline-block w-full bg-[#1A1A1A] text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#C8B89A] hover:text-[#1A1A1A] transition-all duration-300 shadow-md"
            >
              {locale === 'sq' && "Kthehu te Login"}
              {locale === 'de' && "Zurück zum Login"}
              {locale === 'fr' && "Retour à la connexion"}
              {locale === 'en' && "Back to Login"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
