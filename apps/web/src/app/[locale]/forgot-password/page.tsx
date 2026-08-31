'use client';

import { useState } from 'react';
import { Link } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { ArrowLeft, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authFetch } from '@/lib/auth-fetch';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const locale = useLocale();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await authFetch<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email, locale }),
      });
      setMessage(res.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Dështoi dërgimi i email-it.');
    } finally {
      setLoading(false);
    }
  };

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

      <div className="w-full max-w-md space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-zinc-100/80">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-light tracking-tight text-zinc-900">
            {locale === 'sq' && "Rivendos Fjalëkalimin"}
            {locale === 'de' && "Passwort zurücksetzen"}
            {locale === 'fr' && "Réinitialiser le mot de passe"}
            {locale === 'en' && "Reset Password"}
          </h1>
          <p className="text-zinc-400 text-sm font-light">
            {locale === 'sq' && "Shkruani email-in tuaj për të marrë udhëzimet."}
            {locale === 'de' && "Geben Sie Ihre E-Mail-Adresse ein, um Anweisungen zu erhalten."}
            {locale === 'fr' && "Saisissez votre e-mail pour recevoir les instructions."}
            {locale === 'en' && "Enter your email to receive instructions."}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            <p className="font-light">{error}</p>
          </div>
        )}

        {message ? (
          <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
            <p className="font-light">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                Email
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

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-[#1A1A1A] text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#C8B89A] hover:text-[#1A1A1A] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                locale === 'sq' ? "Dërgo Linkun" :
                locale === 'de' ? "Link senden" :
                locale === 'fr' ? "Envoyer le lien" :
                "Send Link"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
