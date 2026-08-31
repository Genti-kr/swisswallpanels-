'use client';

import { useState, useEffect, Suspense } from 'react';
import { Link, useRouter } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-store';
import { useCart } from '@/lib/cart-store';
import { isAdminRole } from '@/lib/user-mapper';
import { resolveAuthErrorMessage } from '@/lib/auth-errors';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login, loading } = useAuth();
  const { mergeCart } = useCart();
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const tCommon = useTranslations('Common');
  const tAuth = useTranslations('Auth');

  useEffect(() => {
    if (searchParams.get('expired') === '1') {
      setError('Sesioni juaj skadoi. Ju lutemi hyni përsëri.');
    }
    const authError = searchParams.get('error');
    if (authError) {
      setError(resolveAuthErrorMessage(authError, searchParams.get('code')));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password, rememberMe);
      await mergeCart();

      const user = useAuth.getState().user;
      const callbackUrl = searchParams.get('callbackUrl');

      if (callbackUrl && callbackUrl.startsWith('/')) {
        router.push(callbackUrl);
        return;
      }

      if (user && isAdminRole(user.role)) {
        window.location.href = '/admin';
        return;
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tAuth('loginFailed'));
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-[#F8F8F6] text-[#1A1A1A] relative">
      <Link
        href="/"
        className="absolute top-6 left-6 z-50 lg:top-8 lg:left-8 inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-[#1A1A1A] group bg-white px-4 py-2.5 rounded-full border border-zinc-200 shadow-md hover:border-[#C8B89A] hover:shadow-lg transition-all duration-300"
      >
        <span className="w-7 h-7 rounded-full border border-zinc-300 bg-[#F8F8F6] flex items-center justify-center group-hover:border-[#C8B89A] group-hover:bg-[#C8B89A]/15 transition-all duration-300">
          <ArrowLeft className="w-3.5 h-3.5 text-[#1A1A1A] group-hover:text-[#C8B89A] transition-colors" />
        </span>
        <span className="group-hover:text-[#C8B89A] transition-colors">{tCommon('back')}</span>
      </Link>

      {/* Left Column: Visual Banner (only on large screens) */}
      <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-12 text-white relative overflow-hidden bg-neutral-950">
        {/* Background image with high contrast */}
        <div 
          className="absolute inset-0 z-0 opacity-40 bg-cover bg-center"
          style={{ backgroundImage: "url('/Enhancing-Wood-Panel-Walls.webp')" }}
        />
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 z-1 bg-gradient-to-b from-neutral-950/20 via-neutral-950/50 to-neutral-950/90" />
        
        {/* Decorative thin lines */}
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
            {locale === 'sq' && "Elegancë natyrale dhe akustikë e përsosur për ambientin tuaj."}
            {locale === 'de' && "Natürliche Elegancë und perfekte Akustik für Ihre Räume."}
            {locale === 'fr' && "Élégance naturelle et acoustique parfaite pour vos espaces."}
            {locale === 'en' && "Natural elegance and perfect acoustics for your spaces."}
          </h2>
        </div>

        <div className="relative z-10 text-xs text-white/40 tracking-wider">
          © {new Date().getFullYear()} Swiss Wall Panels.
        </div>
      </div>

      {/* Right Column: Form Container */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12 md:p-16">
        <div className="w-full max-w-md space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-zinc-100/80 transition-all duration-300">
          <div className="text-center lg:text-left space-y-2">
            <h1 className="text-3xl font-light tracking-tight text-zinc-900">
              {tAuth('loginTitle')}
            </h1>
            <p className="text-zinc-400 text-sm font-light">
              {locale === 'sq' && "Mirësevini përsëri! Ju lutemi shkruani të dhënat tuaja."}
              {locale === 'de' && "Willkommen zurück! Bitte geben Sie Ihre Daten ein."}
              {locale === 'fr' && "Bon retour ! Veuillez saisir vos coordonnées."}
              {locale === 'en' && "Welcome back! Please enter your details."}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <p className="font-light">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Email Input */}
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

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block">
                  {tCommon('password')}
                </label>
                <div className="relative flex items-center group">
                  <Lock className="absolute left-4 text-zinc-400 group-focus-within:text-[#C8B89A] transition-colors w-5 h-5 pointer-events-none" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder={`${tCommon('password')} *`}
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="w-full pl-12 pr-12 py-3 bg-[#F8F8F6] border border-zinc-200 rounded-xl text-sm transition-all focus:outline-none focus:border-[#C8B89A] focus:ring-1 focus:ring-[#C8B89A] placeholder-zinc-400 text-zinc-800 font-light" 
                    required 
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
            </div>

            {/* Remember Me and Forgot Password Container */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-zinc-300 text-[#C8B89A] focus:ring-[#C8B89A] accent-[#C8B89A]"
                />
                {locale === 'sq' && "Më mbaj mend"}
                {locale === 'de' && "Angemeldet bleiben"}
                {locale === 'fr' && "Se souvenir de moi"}
                {locale === 'en' && "Remember me"}
              </label>

              <Link href="/forgot-password" className="text-xs text-zinc-400 hover:text-[#C8B89A] transition-colors underline">
                {locale === 'sq' && "Keni harruar fjalëkalimin?"}
                {locale === 'de' && "Passwort vergessen?"}
                {locale === 'fr' && "Mot de passe oublié?"}
                {locale === 'en' && "Forgot password?"}
              </Link>
            </div>

            {/* Submit Button */}
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
                tCommon('login')
              )}
            </button>

            {/* Link to Register */}
            <p className="text-center text-sm text-zinc-500 font-light pt-2">
              {tAuth('dontHaveAccount')}{' '}
              <Link href="/register" className="text-[#C8B89A] hover:text-[#bca885] underline font-semibold transition-colors">
                {tCommon('register')}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

