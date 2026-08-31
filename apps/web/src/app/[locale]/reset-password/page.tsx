'use client';

import { useState, useEffect } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authFetch } from '@/lib/auth-fetch';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const locale = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      setError(
        locale === 'sq' ? "Mungon tokeni i rivendosjes së fjalëkalimit." :
        locale === 'de' ? "Der Passwort-Reset-Token fehlt." :
        locale === 'fr' ? "Le jeton de réinitialisation du mot de passe est manquant." :
        "The password reset token is missing."
      );
    }
  }, [token, locale]);

  const validatePassword = () => {
    if (password.length < 8) {
      return locale === 'sq' ? "Fjalëkalimi duhet të ketë të paktën 8 karaktere." :
             locale === 'de' ? "Das Passwort muss mindestens 8 Zeichen lang sein." :
             locale === 'fr' ? "Le mot de passe doit comporter au moins 8 caractères." :
             "Password must be at least 8 characters long.";
    }
    if (!/[A-Z]/.test(password)) {
      return locale === 'sq' ? "Fjalëkalimi duhet të ketë të paktën 1 shkronjë të madhe." :
             locale === 'de' ? "Das Passwort muss mindestens 1 Großbuchstaben enthalten." :
             locale === 'fr' ? "Le mot de passe doit contenir au moins 1 lettre majuscule." :
             "Password must contain at least 1 uppercase letter.";
    }
    if (!/[0-9]/.test(password)) {
      return locale === 'sq' ? "Fjalëkalimi duhet të ketë të paktën 1 numër." :
             locale === 'de' ? "Das Passwort muss mindestens 1 Zahl enthalten." :
             locale === 'fr' ? "Le mot de passe doit contenir au moins 1 chiffre." :
             "Password must contain at least 1 number.";
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      return locale === 'sq' ? "Fjalëkalimi duhet të ketë të paktën 1 karakter special." :
             locale === 'de' ? "Das Passwort muss mindestens 1 Sonderzeichen enthalten." :
             locale === 'fr' ? "Le mot de passe doit contenir au moins 1 caractère spécial." :
             "Password must contain at least 1 special character.";
    }
    if (password !== confirmPassword) {
      return locale === 'sq' ? "Fjalëkalimet nuk përputhen." :
             locale === 'de' ? "Die Passwörter stimmen nicht überein." :
             locale === 'fr' ? "Les mots de passe ne correspondent pas." :
             "Passwords do not match.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await authFetch<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setMessage(res.message);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Dështoi rivendosja e fjalëkalimit.');
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
            {locale === 'sq' && "Fjalëkalim i Ri"}
            {locale === 'de' && "Neues Passwort"}
            {locale === 'fr' && "Nouveau mot de passe"}
            {locale === 'en' && "New Password"}
          </h1>
          <p className="text-zinc-400 text-sm font-light">
            {locale === 'sq' && "Shkruani fjalëkalimin tuaj të ri të sigurt."}
            {locale === 'de' && "Geben Sie Ihr neues sicheres Passwort ein."}
            {locale === 'fr' && "Saisissez votre nouveau mot de passe sécurisé."}
            {locale === 'en' && "Enter your new secure password."}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm animate-fade-in">
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
            <div className="space-y-4">
              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                  {locale === 'sq' && "Fjalëkalimi i Ri"}
                  {locale === 'de' && "Neues Passwort"}
                  {locale === 'fr' && "Nouveau mot de passe"}
                  {locale === 'en' && "New Password"}
                </label>
                <div className="relative flex items-center group">
                  <Lock className="absolute left-4 text-zinc-400 group-focus-within:text-[#C8B89A] transition-colors w-5 h-5 pointer-events-none" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="w-full pl-12 pr-12 py-3 bg-[#F8F8F6] border border-zinc-200 rounded-xl text-sm transition-all focus:outline-none focus:border-[#C8B89A] focus:ring-1 focus:ring-[#C8B89A] placeholder-zinc-400 text-zinc-800 font-light" 
                    required 
                    disabled={!token}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-zinc-400 hover:text-zinc-600 transition-colors focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                  {locale === 'sq' && "Konfirmo Fjalëkalimin"}
                  {locale === 'de' && "Passwort bestätigen"}
                  {locale === 'fr' && "Confirmer le mot de passe"}
                  {locale === 'en' && "Confirm Password"}
                </label>
                <div className="relative flex items-center group">
                  <Lock className="absolute left-4 text-zinc-400 group-focus-within:text-[#C8B89A] transition-colors w-5 h-5 pointer-events-none" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    className="w-full pl-12 pr-12 py-3 bg-[#F8F8F6] border border-zinc-200 rounded-xl text-sm transition-all focus:outline-none focus:border-[#C8B89A] focus:ring-1 focus:ring-[#C8B89A] placeholder-zinc-400 text-zinc-800 font-light" 
                    required 
                    disabled={!token}
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || !token} 
              className="w-full bg-[#1A1A1A] text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#C8B89A] hover:text-[#1A1A1A] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                locale === 'sq' ? "Rivendos Fjalëkalimin" :
                locale === 'de' ? "Passwort speichern" :
                locale === 'fr' ? "Enregistrer le mot de passe" :
                "Save Password"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
