'use client';

import { useState } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-store';
import {
  ArrowLeft,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

const inputClass =
  'w-full pl-11 pr-4 py-2 bg-[#F8F8F6] border border-zinc-200 rounded-xl text-sm transition-all focus:outline-none focus:border-[#C8B89A] focus:ring-1 focus:ring-[#C8B89A] placeholder-zinc-400 text-zinc-800 font-light';

const passwordInputClass =
  'w-full pl-11 pr-11 py-2 bg-[#F8F8F6] border border-zinc-200 rounded-xl text-sm transition-all focus:outline-none focus:border-[#C8B89A] focus:ring-1 focus:ring-[#C8B89A] placeholder-zinc-400 text-zinc-800 font-light';

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'minLength';
  if (!/[A-Z]/.test(password)) return 'uppercase';
  if (!/[0-9]/.test(password)) return 'number';
  if (!/[^a-zA-Z0-9]/.test(password)) return 'special';
  return null;
}

export default function RegisterPage() {
  const locale = useLocale();
  const tCommon = useTranslations('Common');
  const tAuth = useTranslations('Auth');
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    preferredLanguage: locale.toUpperCase(),
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const { register, loading } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== confirmPassword) {
      setError(tAuth('passwordsDoNotMatch'));
      return;
    }

    const passwordError = validatePassword(form.password);
    if (passwordError) {
      setError(tAuth('passwordRequirements'));
      return;
    }

    try {
      const res = await register(form);
      if (res.devVerifyUrl) {
        sessionStorage.setItem('devVerifyUrl', res.devVerifyUrl);
      }
      router.push(
        `/verify-email?email=${encodeURIComponent(res.email)}&registered=1`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : tAuth('registrationFailed');
      if (message.includes('regjistruar') || message.includes('already')) {
        setError(tAuth('emailAlreadyRegistered'));
      } else {
        setError(message);
      }
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-[#F8F8F6] text-[#1A1A1A]">
      {/* Left Column: Visual Banner */}
      <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-12 text-white relative overflow-hidden bg-neutral-950">
        <div
          className="absolute inset-0 z-0 opacity-45 bg-cover bg-center"
          style={{ backgroundImage: "url('/balsa_02.webp')" }}
        />
        <div className="absolute inset-0 z-1 bg-gradient-to-b from-neutral-950/20 via-neutral-950/50 to-neutral-950/90" />
        <div className="absolute inset-0 opacity-10 pointer-events-none z-2">
          <div className="absolute left-12 top-0 w-px h-full bg-white" />
          <div className="absolute right-12 top-0 w-px h-full bg-white" />
        </div>

        <div className="relative z-10 text-xl font-bold tracking-tight text-white select-none">
          Swiss<span className="font-light text-[#C8B89A]">Wall</span>
        </div>

        <div className="relative z-10 space-y-4 max-w-md">
          <span className="text-[#C8B89A] text-xs font-bold uppercase tracking-widest block">
            Premium Wall Panels
          </span>
          <h2 className="text-3xl font-light leading-snug tracking-wide">
            {locale === 'sq' && 'Krijoni llogarinë tuaj për të porositur panele muri premium.'}
            {locale === 'de' && 'Erstellen Sie Ihr Konto, um Premium-Wandpaneele zu bestellen.'}
            {locale === 'fr' && 'Créez votre compte pour commander des panneaux muraux haut de gamme.'}
            {locale === 'en' && 'Create your account to order premium wall panels.'}
          </h2>
        </div>

        <div className="relative z-10 text-xs text-white/40 tracking-wider">
          © {new Date().getFullYear()} Swiss Wall Panels.
        </div>
      </div>

      {/* Right Column: Register Box */}
      <div className="lg:col-span-7 flex items-center justify-center p-5 sm:p-8 md:p-12">
        <div className="w-full max-w-md bg-white px-6 sm:px-8 py-5 sm:py-6 rounded-2xl shadow-lg border border-zinc-100/80">
          {/* Back link — inside box */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-[#1A1A1A] transition-colors group mb-4"
          >
            <span className="w-7 h-7 rounded-full border border-zinc-200 flex items-center justify-center group-hover:border-[#C8B89A] group-hover:bg-[#C8B89A]/10 transition-all duration-300">
              <ArrowLeft className="w-3 h-3 group-hover:text-[#C8B89A] transition-colors" />
            </span>
            <span className="group-hover:text-[#C8B89A] transition-colors">{tCommon('back')}</span>
          </Link>

          <div className="space-y-1 mb-4">
            <span className="text-[#C8B89A] text-[10px] font-bold uppercase tracking-[0.2em]">
              Swiss Wall Panels
            </span>
            <h1 className="text-2xl font-light tracking-tight text-zinc-900">
              {tAuth('registerTitle')}
            </h1>
            <p className="text-zinc-500 text-xs font-light">{tAuth('registerSubtitle')}</p>
            <div className="w-10 h-0.5 bg-[#C8B89A] rounded-full mt-1.5" />
          </div>

          <div className="flex items-start gap-2 p-2.5 bg-[#F8F8F6] border border-[#C8B89A]/20 rounded-xl mb-4">
            <ShieldCheck className="w-4 h-4 text-[#C8B89A] shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-600 font-light leading-relaxed">
              {tAuth('emailActivationNotice')}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-2.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs mb-4">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="font-light">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Field label={tCommon('firstName')} required>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#C8B89A] transition-colors w-5 h-5 pointer-events-none" />
                  <input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
              </Field>
              <Field label={tCommon('lastName')} required>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#C8B89A] transition-colors w-5 h-5 pointer-events-none" />
                  <input
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
              </Field>
            </div>

            <Field label={tCommon('email')} required>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#C8B89A] transition-colors w-5 h-5 pointer-events-none" />
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>
            </Field>

            <Field label={tCommon('password')}>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#C8B89A] transition-colors w-5 h-5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={`${tCommon('password')} *`}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={passwordInputClass}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1 flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#C8B89A] shrink-0 mt-0.5" />
                {tAuth('passwordRequirements')}
              </p>
            </Field>

            <Field label={tCommon('confirmPassword')}>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#C8B89A] transition-colors w-5 h-5 pointer-events-none" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder={`${tCommon('confirmPassword')} *`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={passwordInputClass}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#1A1A1A] text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#C8B89A] hover:text-[#1A1A1A] transition-all duration-300 disabled:opacity-50 shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {locale === 'sq' && 'Duke u regjistruar...'}
                  {locale === 'de' && 'Wird registriert...'}
                  {locale === 'fr' && 'Inscription...'}
                  {locale === 'en' && 'Registering...'}
                </>
              ) : (
                tCommon('register')
              )}
            </button>

            <p className="text-center text-sm text-zinc-500 font-light">
              {tAuth('alreadyHaveAccount')}{' '}
              <Link
                href="/login"
                className="text-[#C8B89A] hover:text-[#1A1A1A] font-semibold transition-colors"
              >
                {tCommon('login')}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}
