'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { useAuth } from '@/lib/auth-store';
import { useCart } from '@/lib/cart-store';
import { apiFetch } from '@/lib/api';
import { confirmOrderPaymentWithRetry } from '@/lib/payment';
import { ProductImage } from '@/components/ProductImage';
import { OrderDTO, ShippingRateDTO } from '@swisswall/types';
import { 
  User, 
  ChevronRight, 
  ShieldCheck, 
  Truck, 
  CreditCard, 
  CheckCircle2, 
  MapPin, 
  ArrowLeft,
  Loader2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';

const COUNTRIES = ['CH', 'DE', 'FR', 'IT'] as const;
const CANTONS = ['ZH', 'BE', 'GE', 'VD', 'BS', 'LU', 'AG', 'SG', 'TI', 'VS'];

function CheckoutContent() {
  const { user, fetchMe } = useAuth();
  const { cart, fetchCart } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();

  const tCommon = useTranslations('Common');
  const tAuth = useTranslations('Auth');
  const tCheckout = useTranslations('Checkout');
  const t = useTranslations();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePublishableKey, setStripePublishableKey] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<'address' | 'payment' | 'success'>('address');
  const [shippingRates, setShippingRates] = useState<ShippingRateDTO[]>([]);
  const [selectedRateId, setSelectedRateId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [guestEmail, setGuestEmail] = useState('');
  const [address, setAddress] = useState({
    firstName: '', lastName: '', street: '', houseNumber: '',
    postCode: '', city: '', canton: 'ZH', country: 'CH',
  });

  useEffect(() => {
    fetchMe();
    fetchCart();
  }, [fetchMe, fetchCart]);

  // Handle Stripe 3DS / redirect return (?order=...&payment_intent=...)
  useEffect(() => {
    const orderId = searchParams.get('order');
    const redirectStatus = searchParams.get('redirect_status');
    const storedGuestEmail =
      typeof window !== 'undefined' ? sessionStorage.getItem('guestCheckoutEmail') : null;
    const canVerify = user || storedGuestEmail;
    if (!orderId || !canVerify) return;

    if (redirectStatus === 'failed') {
      setError(tCheckout('paymentFailed'));
      return;
    }

    const paymentIntent = searchParams.get('payment_intent');
    if (!paymentIntent && redirectStatus !== 'succeeded') return;

    let cancelled = false;
    setPaying(true);
    setError('');

    confirmOrderPaymentWithRetry(orderId, user ? undefined : storedGuestEmail || undefined)
      .then(async (res) => {
        if (cancelled) return;
        setOrder(res.order);
        setPaymentStep('success');
        await fetchCart();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : tCheckout('paymentFailed'));
      })
      .finally(() => {
        if (!cancelled) setPaying(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams, user, fetchCart, tCheckout]);

  useEffect(() => {
    if (user) {
      setAddress((a) => ({
        ...a,
        firstName: user.firstName,
        lastName: user.lastName,
      }));
    }
  }, [user]);

  useEffect(() => {
    apiFetch<{ items: ShippingRateDTO[] }>(`/api/shipping/rates?country=${address.country}`)
      .then((res) => {
        setShippingRates(res.items);
        if (res.items.length > 0) setSelectedRateId(res.items[0].id);
      })
      .catch(console.error);
  }, [address.country]);

  const items = cart?.items || [];
  const subtotal = items.reduce((sum, i) => sum + i.product.priceChf * i.quantity, 0);
  const selectedRate = shippingRates.find((r) => r.id === selectedRateId);
  const shipping = selectedRate
    ? (selectedRate.freeAbove && subtotal >= selectedRate.freeAbove ? 0 : selectedRate.price)
    : 0;
  const total = Math.max(0, subtotal + shipping - discountAmount);

  const formatCHF = (value: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
      minimumFractionDigits: 2
    }).format(value).replace(/\s+/g, ' ').replace(/’/g, "'");
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const res = await apiFetch<{ discountAmount: number }>('/api/addresses/validate-coupon', {
        method: 'POST',
        body: JSON.stringify({ code: couponCode, subtotal }),
      });
      setDiscountAmount(res.discountAmount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kupon i pavlefshëm');
      setDiscountAmount(0);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user && !user.emailVerified) {
      setError(tAuth('mustVerifyEmail'));
      return;
    }

    if (!user && !guestEmail.trim()) {
      setError(tCheckout('guestEmailRequired'));
      return;
    }

    if (!selectedRateId) {
      setError('Zgjidhni metodën e transportit');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await apiFetch<{ order: OrderDTO; clientSecret?: string; stripePublishableKey?: string; requiresManualPayment?: boolean }>('/api/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({
          shippingAddress: address,
          billingAddress: address,
          shippingRateId: selectedRateId,
          paymentMethod,
          couponCode: couponCode || undefined,
          guestEmail: user ? undefined : guestEmail.trim().toLowerCase(),
        }),
      });

      if (!user && guestEmail) {
        sessionStorage.setItem('guestCheckoutEmail', guestEmail.trim().toLowerCase());
      }

      if (res.requiresManualPayment) {
        setOrder(res.order);
        setPaymentStep('success');
        await fetchCart();
        return;
      }

      if (!res.clientSecret || !res.stripePublishableKey) {
        throw new Error(tCheckout('paymentUnavailable'));
      }

      setOrder(res.order);
      setClientSecret(res.clientSecret);
      setStripePublishableKey(res.stripePublishableKey);
      setPaymentStep('payment');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : tCheckout('checkoutFailed');
      if (msg.includes('EMAIL_NOT_VERIFIED') || msg.includes('Email not verified')) {
        setError(tAuth('mustVerifyEmail'));
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!clientSecret || !stripePublishableKey || !order) {
      return;
    }

    setPaying(true);
    setError('');

    try {
      const stripe: Stripe | null = await loadStripe(stripePublishableKey);
      if (!stripe) {
        throw new Error(tCheckout('paymentUnavailable'));
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/${locale}/checkout?order=${order.id}`,
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        throw new Error(stripeError.message || tCheckout('paymentFailed'));
      }

      if (paymentIntent?.status !== 'succeeded') {
        throw new Error(tCheckout('paymentPending'));
      }

      await confirmOrderPaymentWithRetry(order.id, user ? undefined : guestEmail || sessionStorage.getItem('guestCheckoutEmail') || undefined);

      await fetchCart();
      setPaymentStep('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tCheckout('paymentFailed'));
    } finally {
      setPaying(false);
    }
  };

  // 1. Success State View
  if (paymentStep === 'success' && order) {
    return (
      <div className="min-h-screen bg-[#F8F8F6] text-[#1A1A1A] font-sans flex flex-col justify-between">
        <SiteHeader />

        {/* Stepper Progress */}
        <div className="max-w-4xl mx-auto w-full px-6 pt-10">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <div className="flex flex-col items-center gap-1.5 opacity-55">
              <span className="w-6 h-6 rounded-full bg-zinc-200 text-[10px] font-bold flex items-center justify-center text-zinc-600">1</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t('Common.cart')}</span>
            </div>
            <div className="flex-grow h-0.5 bg-zinc-200 mx-2" />
            <div className="flex flex-col items-center gap-1.5 opacity-55">
              <span className="w-6 h-6 rounded-full bg-zinc-200 text-[10px] font-bold flex items-center justify-center text-zinc-600">2</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t('Checkout.street')}</span>
            </div>
            <div className="flex-grow h-0.5 bg-zinc-200 mx-2" />
            <div className="flex flex-col items-center gap-1.5 opacity-55">
              <span className="w-6 h-6 rounded-full bg-zinc-200 text-[10px] font-bold flex items-center justify-center text-zinc-600">3</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t('Checkout.payNow')}</span>
            </div>
            <div className="flex-grow h-0.5 bg-[#C8B89A] mx-2" />
            <div className="flex flex-col items-center gap-1.5">
              <span className="w-6 h-6 rounded-full bg-[#1A1A1A] text-[10px] font-bold flex items-center justify-center text-white ring-4 ring-[#C8B89A]/20">4</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]">{locale === 'sq' ? 'Kryer' : 'Success'}</span>
            </div>
          </div>
        </div>

        {/* Success content */}
        <main className="flex-grow flex items-center justify-center px-6 py-16">
          <div className="bg-white border border-zinc-200/50 p-8 sm:p-10 rounded-3xl text-center space-y-6 max-w-lg shadow-xl shadow-zinc-200/40 relative overflow-hidden">
            {/* Top decorative element */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-[#C8B89A]" />

            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500 border border-emerald-100 shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-light text-zinc-900 tracking-tight">{tCheckout('orderCompleted')}</h1>
              <p className="text-sm text-zinc-500 font-light leading-relaxed max-w-sm mx-auto">
                {tCheckout('confirmationEmailSent')}
              </p>
            </div>

            {/* Details Box */}
            <div className="bg-[#F8F8F6] rounded-2xl p-5 border border-zinc-100 text-left space-y-3.5">
              <div className="flex justify-between items-center text-xs text-zinc-500 border-b border-zinc-200/50 pb-2.5">
                <span>Order Status</span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px] select-none">Paid</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">{tCheckout('orderNumber')}</span>
                <span className="font-bold text-zinc-800">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-zinc-200/50 pt-2.5">
                <span className="text-zinc-500">{tCommon('total')}</span>
                <span className="font-semibold text-zinc-900">{formatCHF(order.totalChf)}</span>
              </div>
            </div>

            <div className="pt-4">
              <Link 
                href="/produkte" 
                className="inline-block bg-[#1A1A1A] hover:bg-[#C8B89A] text-white hover:text-[#1A1A1A] px-8 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors duration-300 shadow-md shadow-[#1A1A1A]/10 hover:shadow-[#C8B89A]/20"
              >
                {tAuth('viewProducts')}
              </Link>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-[#1A1A1A] text-white/50 text-xs py-12 px-6 border-t border-white/5 mt-12">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-white font-bold tracking-tight text-sm">
              Swiss<span className="font-light text-[#C8B89A]">Wall</span>
            </div>
            <div className="flex space-x-6">
              <Link href="/agb" className="hover:text-white">{t('Footer.terms')}</Link>
              <Link href="/widerruf" className="hover:text-white">{t('Footer.withdrawal')}</Link>
              <Link href="/datenschutz" className="hover:text-white">{t('Footer.privacy')}</Link>
              <Link href="/impressum" className="hover:text-white">{t('Footer.imprint')}</Link>
            </div>
            <div>
              &copy; {new Date().getFullYear()} Swiss Wall Panels. {t('Footer.rights')}
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Empty cart
  if (items.length === 0 && paymentStep !== 'success') {
    return (
      <div className="min-h-screen bg-[#F8F8F6] text-[#1A1A1A] font-sans flex flex-col justify-between">
        <SiteHeader />
        <main className="flex-grow flex items-center justify-center p-6">
          <div className="bg-white border border-zinc-200/50 p-8 text-center space-y-6 max-w-md rounded-3xl shadow-xl shadow-zinc-200/40">
            <h3 className="text-lg font-medium text-zinc-950">{t('Common.cart')}</h3>
            <p className="text-sm text-zinc-400 font-light">{tCheckout('emptyCart')}</p>
            <Link href="/produkte" className="inline-block bg-[#1A1A1A] text-white px-8 py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest">
              {tAuth('viewProducts')}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // 3. Checkout Form Split-View Layout (Address & Payment steps)
  return (
    <div className="min-h-screen bg-[#F8F8F6] text-[#1A1A1A] font-sans flex flex-col justify-between">
      <SiteHeader />

      {/* Stepper Progress Bar */}
      <div className="max-w-7xl mx-auto w-full px-6 pt-10">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          <Link href="/warenkorb" className="flex flex-col items-center gap-1.5 group">
            <span className="w-7 h-7 rounded-full bg-[#1A1A1A] text-white text-[10px] font-bold flex items-center justify-center shadow-inner group-hover:bg-[#C8B89A] transition-colors">1</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-800 group-hover:text-[#C8B89A] transition-colors">{t('Common.cart')}</span>
          </Link>
          
          <div className="flex-grow h-0.5 bg-[#C8B89A] mx-3" />
          
          <div className="flex flex-col items-center gap-1.5">
            <span className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
              paymentStep === 'address' 
                ? 'bg-[#1A1A1A] text-white ring-4 ring-[#C8B89A]/20' 
                : 'bg-[#C8B89A] text-zinc-950 font-bold'
            }`}>2</span>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              paymentStep === 'address' ? 'text-zinc-900' : 'text-zinc-500'
            }`}>{locale === 'sq' ? 'Adresa' : locale === 'de' ? 'Adresse' : locale === 'fr' ? 'Adresse' : 'Address'}</span>
          </div>
          
          <div className={`flex-grow h-0.5 mx-3 transition-colors ${
            paymentStep === 'payment' ? 'bg-[#C8B89A]' : 'bg-zinc-200'
          }`} />
          
          <div className="flex flex-col items-center gap-1.5">
            <span className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
              paymentStep === 'payment' 
                ? 'bg-[#1A1A1A] text-white ring-4 ring-[#C8B89A]/20' 
                : 'bg-zinc-200 text-zinc-500'
            }`}>3</span>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              paymentStep === 'payment' ? 'text-zinc-900' : 'text-zinc-400'
            }`}>{t('Checkout.payNow')}</span>
          </div>
          
          <div className="flex-grow h-0.5 bg-zinc-200 mx-3" />
          
          <div className="flex flex-col items-center gap-1.5 opacity-40">
            <span className="w-7 h-7 rounded-full bg-zinc-200 text-[10px] font-bold flex items-center justify-center text-zinc-400">4</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{locale === 'sq' ? 'Kryer' : 'Success'}</span>
          </div>
        </div>
      </div>

      {/* Main Form content */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Form Cards (Address or Payment inputs) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Email verification notice */}
            {user && !user.emailVerified && (
              <div className="bg-amber-50/50 border border-amber-200/50 text-amber-800 p-5 rounded-2xl text-sm flex gap-3.5 items-start shadow-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-amber-900">{tCheckout('emailNotVerified')}</h4>
                  <p className="text-xs text-amber-700/80 font-light">
                    {locale === 'sq' && 'Ju lutemi verifikoni email-in tuaj për të vazhduar me kryerjen e porosisë.'}
                    {locale === 'de' && 'Bitte verifizieren Sie Ihre E-Mail-Adresse, um fortzufahren.'}
                    {locale === 'en' && 'Please verify your email address to continue with your checkout.'}
                    {locale === 'fr' && 'Veuillez vérifier votre adresse e-mail pour continuer.'}
                  </p>
                  <Link href="/verify-email" className="inline-block text-xs font-bold text-amber-900 underline mt-2 hover:text-[#C8B89A] transition-colors">
                    {tCheckout('verifyNow')} →
                  </Link>
                </div>
              </div>
            )}

            {/* Error notifications */}
            {error && (
              <div className="bg-red-50/50 border border-red-200/50 text-red-800 p-5 rounded-2xl text-sm flex gap-3.5 items-start shadow-sm">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900">{locale === 'sq' ? 'Gabim' : 'Error'}</h4>
                  <p className="text-xs text-red-700/80 font-light mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* STEP 2: Address Form */}
            {paymentStep === 'address' && (
              <form onSubmit={handleCheckout} className="bg-white rounded-3xl border border-zinc-200/50 p-6 sm:p-8 space-y-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-[#1A1A1A]/80" />
                
                <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
                  <div className="p-2.5 bg-zinc-50 border border-zinc-200/40 text-[#C8B89A] rounded-xl">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-zinc-900">{tCheckout('shippingAddress')}</h2>
                    <p className="text-xs text-zinc-400 font-light mt-0.5">{locale === 'sq' ? 'Plotësoni adresën tuaj të dërgesës në Zvicër' : 'Enter your Swiss shipping coordinates'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {!user && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">{tCommon('email')}</label>
                      <input
                        type="email"
                        placeholder={tCheckout('guestEmailPlaceholder')}
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        className="w-full bg-[#F8F8F6] border border-zinc-200 focus:border-[#C8B89A] focus:bg-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all font-light text-zinc-800"
                        required
                      />
                      <p className="text-xs text-zinc-400 font-light pl-1">
                        {tCheckout('guestCheckoutHint')}{' '}
                        <Link href="/login" className="text-[#C8B89A] hover:underline">{tCommon('login')}</Link>
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">{tCommon('firstName')}</label>
                    <input 
                      placeholder={tCommon('firstName')} 
                      value={address.firstName} 
                      onChange={(e) => setAddress({ ...address, firstName: e.target.value })} 
                      className="w-full bg-[#F8F8F6] border border-zinc-200 focus:border-[#C8B89A] focus:bg-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all font-light text-zinc-800" 
                      required 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">{tCommon('lastName')}</label>
                    <input 
                      placeholder={tCommon('lastName')} 
                      value={address.lastName} 
                      onChange={(e) => setAddress({ ...address, lastName: e.target.value })} 
                      className="w-full bg-[#F8F8F6] border border-zinc-200 focus:border-[#C8B89A] focus:bg-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all font-light text-zinc-800" 
                      required 
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">{tCheckout('street')}</label>
                    <input 
                      placeholder={tCheckout('street')} 
                      value={address.street} 
                      onChange={(e) => setAddress({ ...address, street: e.target.value })} 
                      className="w-full bg-[#F8F8F6] border border-zinc-200 focus:border-[#C8B89A] focus:bg-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all font-light text-zinc-800" 
                      required 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">{tCheckout('number')}</label>
                    <input 
                      placeholder={tCheckout('number')} 
                      value={address.houseNumber} 
                      onChange={(e) => setAddress({ ...address, houseNumber: e.target.value })} 
                      className="w-full bg-[#F8F8F6] border border-zinc-200 focus:border-[#C8B89A] focus:bg-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all font-light text-zinc-800" 
                      required 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">{tCheckout('zip')} (PLZ)</label>
                    <input 
                      placeholder={tCheckout('zip')} 
                      value={address.postCode} 
                      onChange={(e) => setAddress({ ...address, postCode: e.target.value })} 
                      className="w-full bg-[#F8F8F6] border border-zinc-200 focus:border-[#C8B89A] focus:bg-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all font-light text-zinc-800" 
                      pattern="\d{4}" 
                      required 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">{tCheckout('city')}</label>
                    <input 
                      placeholder={tCheckout('city')} 
                      value={address.city} 
                      onChange={(e) => setAddress({ ...address, city: e.target.value })} 
                      className="w-full bg-[#F8F8F6] border border-zinc-200 focus:border-[#C8B89A] focus:bg-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all font-light text-zinc-800" 
                      required 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">Shteti</label>
                    <select
                      value={address.country}
                      onChange={(e) => setAddress({ ...address, country: e.target.value })}
                      className="w-full bg-[#F8F8F6] border border-zinc-200 focus:border-[#C8B89A] focus:bg-white rounded-xl px-4 py-3.5 text-sm focus:outline-none transition-all font-light text-zinc-800 cursor-pointer"
                    >
                      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {address.country === 'CH' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">{tCheckout('canton')}</label>
                    <select 
                      value={address.canton} 
                      onChange={(e) => setAddress({ ...address, canton: e.target.value })} 
                      className="w-full bg-[#F8F8F6] border border-zinc-200 focus:border-[#C8B89A] focus:bg-white rounded-xl px-4 py-3.5 text-sm focus:outline-none transition-all font-light text-zinc-800 cursor-pointer"
                    >
                      {CANTONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  )}

                  {shippingRates.length > 0 && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">Transporti</label>
                      <select
                        value={selectedRateId}
                        onChange={(e) => setSelectedRateId(e.target.value)}
                        className="w-full bg-[#F8F8F6] border border-zinc-200 rounded-xl px-4 py-3.5 text-sm"
                        required
                      >
                        {shippingRates.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} — {r.price === 0 || (r.freeAbove && subtotal >= r.freeAbove) ? 'Falas' : `CHF ${r.price.toFixed(2)}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">Kupon</label>
                    <div className="flex gap-2">
                      <input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="SUMMER10"
                        className="flex-1 bg-[#F8F8F6] border border-zinc-200 rounded-xl px-4 py-3 text-sm"
                      />
                      <button type="button" onClick={applyCoupon} className="px-4 py-2 bg-zinc-100 rounded-xl text-xs font-bold uppercase">
                        Apliko
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">Pagesa</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-[#F8F8F6] border border-zinc-200 rounded-xl px-4 py-3.5 text-sm"
                    >
                      {address.country === 'CH' && (
                        <>
                          <option value="twint">TWINT</option>
                          <option value="card">Kartë</option>
                        </>
                      )}
                      {address.country !== 'CH' && <option value="card">Kartë (Stripe)</option>}
                    </select>
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase font-light tracking-wider">{tCheckout('totalInclShipping')}</span>
                    <span className="text-lg font-bold text-zinc-950">{formatCHF(total)}</span>
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={loading || Boolean(user && !user.emailVerified)} 
                    className="bg-[#1A1A1A] hover:bg-[#C8B89A] text-white hover:text-[#1A1A1A] px-8 py-4 rounded-xl text-xs font-bold uppercase tracking-widest disabled:opacity-50 transition-all duration-300 shadow-md shadow-[#1A1A1A]/10 hover:shadow-[#C8B89A]/20 cursor-pointer flex justify-center items-center gap-2"
                  >
                    {loading && <Loader2 className="w-4.5 h-4.5 animate-spin" />}
                    {loading ? tCheckout('processing') : tCheckout('continueToPayment')}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Payment Section */}
            {paymentStep === 'payment' && order && (
              <div className="bg-white rounded-3xl border border-zinc-200/50 p-6 sm:p-8 space-y-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-[#1A1A1A]/80" />
                
                <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
                  <div className="p-2.5 bg-zinc-50 border border-zinc-200/40 text-[#C8B89A] rounded-xl">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-zinc-900">{tCheckout('paymentTitle')}</h2>
                    <p className="text-xs text-zinc-400 font-light mt-0.5">{locale === 'sq' ? 'Kryeni pagesën tuaj të sigurt me Stripe' : 'Process your secure payment through Stripe'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-zinc-500 font-light leading-relaxed bg-[#F8F8F6] p-4 rounded-2xl border border-zinc-100">
                    {tCheckout('paymentDescription')}
                  </p>
                  
                  {/* Subtle Stripe watermark notice */}
                  <div className="flex items-center gap-2 text-zinc-400 pl-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">{locale === 'sq' ? 'Lidhje e Siguruar me SSL' : 'SSL Encrypted Payment'}</span>
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase font-light tracking-wider">{tCheckout('totalInclShipping')}</span>
                    <span className="text-lg font-bold text-zinc-950">{formatCHF(total)}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setPaymentStep('address')}
                      disabled={paying}
                      className="text-xs font-semibold text-zinc-500 hover:text-[#C8B89A] flex items-center gap-1.5 transition-colors disabled:opacity-40"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      {tCommon('back')}
                    </button>
                    
                    <button
                      type="button"
                      onClick={handlePayment}
                      disabled={paying}
                      className="bg-[#1A1A1A] hover:bg-[#C8B89A] text-white hover:text-[#1A1A1A] px-8 py-4 rounded-xl text-xs font-bold uppercase tracking-widest disabled:opacity-50 transition-all duration-300 shadow-md shadow-[#1A1A1A]/10 hover:shadow-[#C8B89A]/20 cursor-pointer flex justify-center items-center gap-2"
                    >
                      {paying && <Loader2 className="w-4.5 h-4.5 animate-spin" />}
                      {paying ? tCheckout('processing') : tCheckout('payNow')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Order Review Sidebar (Recap of cart items) */}
          <div className="lg:col-span-4">
            <div className="bg-white border border-zinc-200/50 rounded-3xl p-6 shadow-sm sticky top-28 space-y-6">
              <div className="flex items-center gap-2.5 border-b border-zinc-100 pb-3">
                <FileText className="w-4 h-4 text-[#C8B89A]" />
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-800">
                  {locale === 'sq' ? 'Përmbledhja e Blerjes' : 'Order Review'}
                </h3>
              </div>

              {/* Items List */}
              <div className="max-h-64 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                {items.map((item) => {
                  const name = item.product.nameJson[locale as keyof typeof item.product.nameJson] || item.product.nameJson.de;
                  return (
                    <div key={item.id} className="flex items-center gap-3.5 group">
                      {/* Product Thumbnail */}
                      <div className="w-14 h-14 bg-zinc-50 border border-zinc-200/50 rounded-xl overflow-hidden flex-shrink-0 relative">
                        <ProductImage
                          src={item.product.images[0]?.url}
                          alt={name}
                          fill
                          sizes="56px"
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      {/* Info details */}
                      <div className="flex-grow min-w-0">
                        <h4 className="text-xs font-semibold text-zinc-800 truncate group-hover:text-[#C8B89A] transition-colors">
                          {name}
                        </h4>
                        <div className="text-[10px] text-zinc-400 font-light mt-0.5">
                          {item.quantity} m² × CHF {item.product.priceChf.toFixed(2)}
                        </div>
                      </div>

                      {/* Line Item total cost */}
                      <span className="text-xs font-bold text-zinc-900 flex-shrink-0 pl-2">
                        {formatCHF(item.product.priceChf * item.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Shipping indicator helper */}
              <div className="bg-[#F8F8F6] rounded-2xl p-4 border border-zinc-100 space-y-3 font-light text-xs text-zinc-500">
                <div className="flex justify-between">
                  <span>{locale === 'sq' ? 'Nën-totali' : 'Subtotal'}</span>
                  <span className="font-semibold text-zinc-800">{formatCHF(subtotal)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>{locale === 'sq' ? 'Transporti' : 'Shipping'}</span>
                  <span className="font-semibold text-zinc-800">
                    {shipping === 0 ? (
                      <span className="text-emerald-600 font-semibold uppercase tracking-wider text-[10px]">
                        {locale === 'sq' ? 'Falas' : 'Free'}
                      </span>
                    ) : (
                      formatCHF(shipping)
                    )}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>{locale === 'sq' ? 'Zbritja' : 'Discount'}</span>
                    <span className="font-semibold">-{formatCHF(discountAmount)}</span>
                  </div>
                )}

                <div className="h-px bg-zinc-200/60 my-2" />

                <div className="flex justify-between items-baseline text-sm font-semibold text-zinc-900">
                  <span>{tCommon('total')}</span>
                  <span className="text-base font-bold text-[#1A1A1A]">
                    {formatCHF(total)}
                  </span>
                </div>

                <div className="text-[9px] text-zinc-400 text-right leading-none pt-1">
                  {locale === 'sq' && 'Përfshin 8.1% TVSH zvicerane'}
                  {locale === 'de' && 'Inklusive 8.1% Schweizer MwSt.'}
                  {locale === 'en' && 'Includes 8.1% Swiss VAT'}
                  {locale === 'fr' && 'TVA suisse de 8.1% incluse'}
                </div>
              </div>

              {/* Shipping highlight banner */}
              {shipping === 0 ? (
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3.5 flex gap-2.5 items-center text-[11px] text-emerald-800 font-light leading-snug">
                  <Truck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{locale === 'sq' ? 'Transporti është FALAS për këtë porosi.' : 'You qualified for FREE Swiss shipping!'}</span>
                </div>
              ) : (
                <div className="bg-zinc-50 border border-zinc-200/50 rounded-2xl p-3.5 flex gap-2.5 items-center text-[11px] text-zinc-400 font-light leading-snug">
                  <Truck className="w-4 h-4 text-[#C8B89A] flex-shrink-0" />
                  <span>{locale === 'sq' ? 'Transporti falas sipas metodës së zgjedhur.' : 'Free shipping depends on selected method.'}</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1A1A1A] text-white/50 text-xs py-12 px-6 border-t border-white/5 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-white font-bold tracking-tight text-sm">
            Swiss<span className="font-light text-[#C8B89A]">Wall</span>
          </div>
          <div className="flex space-x-6">
            <Link href="/agb" className="hover:text-white">{t('Footer.terms')}</Link>
            <Link href="/widerruf" className="hover:text-white">{t('Footer.withdrawal')}</Link>
            <Link href="/datenschutz" className="hover:text-white">{t('Footer.privacy')}</Link>
            <Link href="/impressum" className="hover:text-white">{t('Footer.imprint')}</Link>
          </div>
          <div>
            &copy; {new Date().getFullYear()} Swiss Wall Panels. {t('Footer.rights')}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutContent />
    </Suspense>
  );
}
