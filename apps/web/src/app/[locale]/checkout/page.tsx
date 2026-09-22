'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import { getCartItemUnitPrice } from '@/lib/product-variants';
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
import { CheckoutStripePayment } from '@/components/CheckoutStripePayment';
import { parseStreetAndNumber } from '@/lib/address-line';
import { sanitizeDigits, sanitizePersonOrPlaceName, sanitizePhone } from '@/lib/numeric-input';
import { resolveCheckoutError } from '@/lib/checkout-error-i18n';
import {
  SHIPPING_COUNTRY_CODES,
  SWISS_CANTONS,
  type ShippingCountryCode,
} from '@/lib/shipping-geo';

function CheckoutContent() {
  const { user, fetchMe } = useAuth();
  const { cart, fetchCart } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();

  const tCommon = useTranslations('Common');
  const tAuth = useTranslations('Auth');
  const tCart = useTranslations('Cart');
  const tCheckout = useTranslations('Checkout');
  const tGeo = useTranslations('Geo');
  const tProducts = useTranslations('Products');
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
  const [appliedCouponCode, setAppliedCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('twint');
  const [guestEmail, setGuestEmail] = useState('');
  const [streetLine, setStreetLine] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState({
    firstName: '',
    lastName: '',
    postCode: '',
    city: '',
    canton: 'ZH',
    country: 'CH' as ShippingCountryCode,
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
    if (!orderId) return;

    if (redirectStatus === 'failed') {
      setError(tCheckout('paymentFailed'));
      return;
    }

    const paymentIntent = searchParams.get('payment_intent');
    const isStripeReturn =
      redirectStatus === 'succeeded' ||
      redirectStatus === 'processing' ||
      Boolean(paymentIntent);
    if (!isStripeReturn) return;

    const canVerify = Boolean(user) || Boolean(storedGuestEmail);
    if (!canVerify) return;

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
        const raw = err instanceof Error ? err.message : '';
        setError(resolveCheckoutError(raw, tCheckout));
      })
      .finally(() => {
        if (!cancelled) setPaying(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams, user, fetchCart, tCheckout]);

  useEffect(() => {
    if (address.country !== 'CH') {
      setPaymentMethod('card');
    }
  }, [address.country]);

  useEffect(() => {
    if (user) {
      setAddress((a) => ({
        ...a,
        firstName: user.firstName,
        lastName: user.lastName,
      }));
      if (user.phone) {
        setPhone(user.phone);
      }
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
  const subtotal = items.reduce(
    (sum, i) => sum + getCartItemUnitPrice(i) * i.quantity,
    0
  );
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
      setAppliedCouponCode(couponCode.trim().toUpperCase());
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      setError(resolveCheckoutError(raw, tCheckout));
      setDiscountAmount(0);
      setAppliedCouponCode('');
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
      setError(tCheckout('selectShipping'));
      return;
    }

    const { street, houseNumber } = parseStreetAndNumber(streetLine);
    if (!street.trim()) {
      setError(tCheckout('streetRequired'));
      return;
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 6) {
      setError(tCheckout('phoneRequired'));
      return;
    }

    const shippingAddress = {
      ...address,
      street,
      houseNumber,
      phone: phone.trim(),
    };

    setLoading(true);
    setError('');

    try {
      const res = await apiFetch<{ order: OrderDTO; clientSecret?: string; stripePublishableKey?: string; requiresManualPayment?: boolean }>('/api/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({
          shippingAddress,
          billingAddress: shippingAddress,
          shippingRateId: selectedRateId,
          paymentMethod,
          couponCode: appliedCouponCode || undefined,
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
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('EMAIL_NOT_VERIFIED') || msg.includes('Email not verified')) {
        setError(tAuth('mustVerifyEmail'));
      } else {
        setError(resolveCheckoutError(msg, tCheckout));
      }
    } finally {
      setLoading(false);
    }
  };

  const completePaymentOnServer = async () => {
    if (!order) return;
    await confirmOrderPaymentWithRetry(
      order.id,
      user ? undefined : guestEmail || sessionStorage.getItem('guestCheckoutEmail') || undefined
    );
    await fetchCart();
    setPaymentStep('success');
  };

  const stripeReturnUrl =
    typeof window !== 'undefined' && order
      ? `${window.location.origin}${window.location.pathname}?order=${encodeURIComponent(order.id)}`
      : '';

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
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{tCheckout('stepAddress')}</span>
            </div>
            <div className="flex-grow h-0.5 bg-zinc-200 mx-2" />
            <div className="flex flex-col items-center gap-1.5 opacity-55">
              <span className="w-6 h-6 rounded-full bg-zinc-200 text-[10px] font-bold flex items-center justify-center text-zinc-600">3</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{t('Checkout.payNow')}</span>
            </div>
            <div className="flex-grow h-0.5 bg-[#C8B89A] mx-2" />
            <div className="flex flex-col items-center gap-1.5">
              <span className="w-6 h-6 rounded-full bg-[#1A1A1A] text-[10px] font-bold flex items-center justify-center text-white ring-4 ring-[#C8B89A]/20">4</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]">{tCheckout('stepSuccess')}</span>
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
                <span>{tCheckout('orderStatus')}</span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[9px] select-none">{tCheckout('paid')}</span>
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
            <h3 className="text-lg font-medium text-zinc-950">{tCart('title')}</h3>
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
            }`}>{tCheckout('stepAddress')}</span>
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{tCheckout('stepSuccess')}</span>
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
                  <p className="text-xs text-amber-700/80 font-light">{tCheckout('emailVerifyBody')}</p>
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
                  <h4 className="font-semibold text-red-900">{tCheckout('errorTitle')}</h4>
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
                    <p className="text-xs text-zinc-400 font-light mt-0.5">{tCheckout('addressHint')}</p>
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
                      onChange={(e) =>
                        setAddress({
                          ...address,
                          firstName: sanitizePersonOrPlaceName(e.target.value, 80),
                        })
                      } 
                      className="w-full bg-[#F8F8F6] border border-zinc-200 focus:border-[#C8B89A] focus:bg-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all font-light text-zinc-800" 
                      required 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">{tCommon('lastName')}</label>
                    <input 
                      placeholder={tCommon('lastName')} 
                      value={address.lastName} 
                      onChange={(e) =>
                        setAddress({
                          ...address,
                          lastName: sanitizePersonOrPlaceName(e.target.value, 80),
                        })
                      } 
                      className="w-full bg-[#F8F8F6] border border-zinc-200 focus:border-[#C8B89A] focus:bg-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all font-light text-zinc-800" 
                      required 
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">
                      {tCheckout('street')}
                    </label>
                    <input
                      placeholder={tCheckout('streetPlaceholder')}
                      value={streetLine}
                      onChange={(e) => setStreetLine(e.target.value.slice(0, 140))}
                      autoComplete="street-address"
                      className="w-full bg-[#F8F8F6] border border-zinc-200 focus:border-[#C8B89A] focus:bg-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all font-light text-zinc-800"
                      required
                    />
                    <p className="text-xs text-zinc-400 font-light pl-1">{tCheckout('streetHint')}</p>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">
                      {tCommon('phone')}
                    </label>
                    <input
                      placeholder={tCheckout('phonePlaceholder')}
                      value={phone}
                      onChange={(e) => setPhone(sanitizePhone(e.target.value))}
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      className="w-full bg-[#F8F8F6] border border-zinc-200 focus:border-[#C8B89A] focus:bg-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all font-light text-zinc-800"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">{tCheckout('zip')} (PLZ)</label>
                    <input 
                      placeholder={tCheckout('zip')} 
                      value={address.postCode} 
                      onChange={(e) =>
                        setAddress({
                          ...address,
                          postCode: sanitizeDigits(
                            e.target.value,
                            address.country === 'CH' ? 4 : 12
                          ),
                        })
                      }
                      inputMode="numeric"
                      autoComplete="postal-code"
                      className="w-full bg-[#F8F8F6] border border-zinc-200 focus:border-[#C8B89A] focus:bg-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all font-light text-zinc-800" 
                      pattern={address.country === 'CH' ? '\\d{4}' : undefined}
                      required 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">{tCheckout('city')}</label>
                    <input 
                      placeholder={tCheckout('city')} 
                      value={address.city} 
                      onChange={(e) =>
                        setAddress({
                          ...address,
                          city: sanitizePersonOrPlaceName(e.target.value, 80),
                        })
                      } 
                      className="w-full bg-[#F8F8F6] border border-zinc-200 focus:border-[#C8B89A] focus:bg-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all font-light text-zinc-800" 
                      required 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">{tCheckout('country')}</label>
                    <select
                      value={address.country}
                      onChange={(e) =>
                        setAddress({
                          ...address,
                          country: e.target.value as ShippingCountryCode,
                        })
                      }
                      className="w-full bg-[#F8F8F6] border border-zinc-200 focus:border-[#C8B89A] focus:bg-white rounded-xl px-4 py-3.5 text-sm focus:outline-none transition-all font-light text-zinc-800 cursor-pointer"
                    >
                      {SHIPPING_COUNTRY_CODES.map((c) => (
                        <option key={c} value={c}>
                          {tGeo(`countries.${c}`)}
                        </option>
                      ))}
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
                      {SWISS_CANTONS.map((c) => (
                        <option key={c.code} value={c.code}>
                          {tGeo(`cantons.${c.code}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  )}

                  {shippingRates.length > 0 && (
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">{tCheckout('shippingMethod')}</label>
                      <select
                        value={selectedRateId}
                        onChange={(e) => setSelectedRateId(e.target.value)}
                        className="w-full bg-[#F8F8F6] border border-zinc-200 rounded-xl px-4 py-3.5 text-sm"
                        required
                      >
                        {shippingRates.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} — {r.price === 0 || (r.freeAbove && subtotal >= r.freeAbove) ? tCart('free') : `CHF ${r.price.toFixed(2)}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">{tCheckout('coupon')}</label>
                    <div className="flex gap-2">
                      <input
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase());
                          setAppliedCouponCode('');
                          setDiscountAmount(0);
                        }}
                        placeholder="SUMMER10"
                        className="flex-1 bg-[#F8F8F6] border border-zinc-200 rounded-xl px-4 py-3 text-sm"
                      />
                      <button type="button" onClick={applyCoupon} className="px-4 py-2 bg-zinc-100 rounded-xl text-xs font-bold uppercase">
                        {tCheckout('applyCoupon')}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">{tCheckout('paymentLabel')}</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-[#F8F8F6] border border-zinc-200 rounded-xl px-4 py-3.5 text-sm"
                    >
                      {address.country === 'CH' && (
                        <>
                          <option value="twint">{tCheckout('payTwint')}</option>
                          <option value="card">{tCheckout('payCard')}</option>
                        </>
                      )}
                      {address.country !== 'CH' && <option value="card">{tCheckout('payCardStripe')}</option>}
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
                    <p className="text-xs text-zinc-400 font-light mt-0.5">{tCheckout('paymentStripeHint')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-zinc-500 font-light leading-relaxed bg-[#F8F8F6] p-4 rounded-2xl border border-zinc-100">
                    {tCheckout('paymentDescription')}
                  </p>

                  {clientSecret && stripePublishableKey && stripeReturnUrl ? (
                    <CheckoutStripePayment
                      key={`${clientSecret}-${paymentMethod}`}
                      publishableKey={stripePublishableKey}
                      clientSecret={clientSecret}
                      locale={locale}
                      paymentMethod={paymentMethod}
                      returnUrl={stripeReturnUrl}
                      paying={paying}
                      setPaying={setPaying}
                      payLabel={
                        paymentMethod === 'twint' ? tCheckout('payTwint') : tCheckout('payNow')
                      }
                      processingLabel={tCheckout('processing')}
                      twintHint={
                        paymentMethod === 'twint' ? tCheckout('twintRedirectHint') : undefined
                      }
                      onSuccess={completePaymentOnServer}
                      onError={(message) =>
                        setError(resolveCheckoutError(message, tCheckout))
                      }
                    />
                  ) : (
                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-4">
                      {tCheckout('paymentUnavailable')}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-zinc-400 pl-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">{tCheckout('sslSecure')}</span>
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase font-light tracking-wider">{tCheckout('totalInclShipping')}</span>
                    <span className="text-lg font-bold text-zinc-950">{formatCHF(total)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPaymentStep('address')}
                    disabled={paying}
                    className="text-xs font-semibold text-zinc-500 hover:text-[#C8B89A] flex items-center gap-1.5 transition-colors disabled:opacity-40"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {tCommon('back')}
                  </button>
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
                  {tCheckout('orderReview')}
                </h3>
              </div>

              {/* Items List */}
              <div className="max-h-64 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                {items.map((item) => {
                  const name = item.product.nameJson[locale as keyof typeof item.product.nameJson] || item.product.nameJson.de;
                  const unitPrice = getCartItemUnitPrice(item);
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
                          {item.quantity} × CHF {unitPrice.toFixed(2)}
                          {tProducts('priceUnitShort')}
                        </div>
                      </div>

                      {/* Line Item total cost */}
                      <span className="text-xs font-bold text-zinc-900 flex-shrink-0 pl-2">
                        {formatCHF(unitPrice * item.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Shipping indicator helper */}
              <div className="bg-[#F8F8F6] rounded-2xl p-4 border border-zinc-100 space-y-3 font-light text-xs text-zinc-500">
                <div className="flex justify-between">
                  <span>{tCart('subtotal')}</span>
                  <span className="font-semibold text-zinc-800">{formatCHF(subtotal)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>{tCart('shipping')}</span>
                  <span className="font-semibold text-zinc-800">
                    {shipping === 0 ? (
                      <span className="text-emerald-600 font-semibold uppercase tracking-wider text-[10px]">
                        {tCart('free')}
                      </span>
                    ) : (
                      formatCHF(shipping)
                    )}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>{tCheckout('discount')}</span>
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
                  {tCheckout('vatNote')}
                </div>
              </div>

              {/* Shipping highlight banner */}
              {shipping === 0 ? (
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3.5 flex gap-2.5 items-center text-[11px] text-emerald-800 font-light leading-snug">
                  <Truck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{tCheckout('freeShippingQualified')}</span>
                </div>
              ) : (
                <div className="bg-zinc-50 border border-zinc-200/50 rounded-2xl p-3.5 flex gap-2.5 items-center text-[11px] text-zinc-400 font-light leading-snug">
                  <Truck className="w-4 h-4 text-[#C8B89A] flex-shrink-0" />
                  <span>{tCheckout('shippingNote')}</span>
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
