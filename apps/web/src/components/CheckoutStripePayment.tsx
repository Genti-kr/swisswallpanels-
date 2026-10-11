'use client';

import { useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';

type StripeLocale = 'auto' | 'de' | 'fr' | 'en';

function stripeLocaleFromApp(locale: string): StripeLocale {
  if (locale === 'de' || locale === 'fr' || locale === 'en') return locale;
  return 'de';
}

type PayButtonProps = {
  returnUrl: string;
  paymentMethod: string;
  paying: boolean;
  setPaying: (v: boolean) => void;
  payLabel: string;
  processingLabel: string;
  twintHint?: string;
  onSuccess: () => Promise<void>;
  onError: (message: string) => void;
};

function StripePayButton({
  returnUrl,
  paymentMethod,
  paying,
  setPaying,
  payLabel,
  processingLabel,
  twintHint,
  onSuccess,
  onError,
}: PayButtonProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const isTwint = paymentMethod === 'twint';

  const handlePay = async () => {
    if (!stripe || !elements) {
      onError('Payment form is still loading. Please wait a moment.');
      return;
    }

    setPaying(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        onError(submitError.message || 'Payment validation failed.');
        return;
      }

      if (isTwint) {
        const { error } = await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: returnUrl },
          redirect: 'always',
        });
        if (error) {
          onError(error.message || 'Payment failed.');
        }
        return;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'Payment failed.');
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        await onSuccess();
        return;
      }

      if (paymentIntent?.status === 'processing') {
        onError('Payment is processing. Please wait or check your email.');
        return;
      }

      onError('Payment was not completed.');
    } finally {
      if (!isTwint) {
        setPaying(false);
      }
    }
  };

  const paymentElementOptions = useMemo(() => {
    if (isTwint) {
      return {
        layout: 'accordion' as const,
        paymentMethodOrder: ['twint'],
        wallets: { applePay: 'never' as const, googlePay: 'never' as const },
      };
    }
    return {
      layout: 'tabs' as const,
      paymentMethodOrder: ['card'],
      wallets: { applePay: 'never' as const, googlePay: 'never' as const },
    };
  }, [isTwint]);

  return (
    <div className="space-y-5">
      {isTwint && twintHint ? (
        <p className="text-sm text-zinc-600 font-light leading-relaxed rounded-xl border border-[#C8B89A]/30 bg-[#C8B89A]/5 px-4 py-3">
          {twintHint}
        </p>
      ) : null}
      <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-inner shadow-zinc-100/80 p-5 sm:p-6 min-h-[140px]">
        <PaymentElement
          onReady={() => setReady(true)}
          options={paymentElementOptions}
        />
      </div>
      <button
        type="button"
        onClick={handlePay}
        disabled={paying || !ready || !stripe}
        className="w-full bg-[#1A1A1A] hover:bg-[#C8B89A] text-white hover:text-[#1A1A1A] px-8 py-4 rounded-2xl text-sm font-semibold tracking-wide disabled:opacity-50 transition-all duration-300 shadow-lg shadow-zinc-900/15 flex justify-center items-center gap-2"
      >
        {paying && <Loader2 className="w-5 h-5 animate-spin" />}
        {paying ? processingLabel : payLabel}
      </button>
    </div>
  );
}

export type CheckoutStripePaymentProps = {
  publishableKey: string;
  clientSecret: string;
  locale: string;
  paymentMethod: string;
  returnUrl: string;
  paying: boolean;
  setPaying: (v: boolean) => void;
  payLabel: string;
  processingLabel: string;
  twintHint?: string;
  onSuccess: () => Promise<void>;
  onError: (message: string) => void;
};

export function CheckoutStripePayment(props: CheckoutStripePaymentProps) {
  const {
    publishableKey,
    clientSecret,
    locale,
    paymentMethod,
    returnUrl,
    paying,
    setPaying,
    payLabel,
    processingLabel,
    twintHint,
    onSuccess,
    onError,
  } = props;

  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  const options = useMemo(
    () => ({
      clientSecret,
      locale: stripeLocaleFromApp(locale),
      appearance: {
        theme: 'stripe' as const,
        variables: {
          colorPrimary: '#1A1A1A',
          colorBackground: '#ffffff',
          colorText: '#18181b',
          colorTextSecondary: '#71717a',
          colorDanger: '#b91c1c',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSizeBase: '15px',
          spacingUnit: '4px',
          borderRadius: '12px',
        },
        rules: {
          '.Input': {
            border: '1px solid #e4e4e7',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            padding: '12px 14px',
          },
          '.Input:focus': {
            border: '1px solid #C8B89A',
            boxShadow: '0 0 0 3px rgba(200, 184, 154, 0.25)',
          },
          '.Label': {
            fontWeight: '600',
            fontSize: '12px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          },
          '.Tab': {
            border: '1px solid #e4e4e7',
            boxShadow: 'none',
          },
          '.Tab--selected': {
            border: '2px solid #C8B89A',
            backgroundColor: 'rgba(200, 184, 154, 0.08)',
          },
        },
      },
    }),
    [clientSecret, locale]
  );

  return (
    <Elements stripe={stripePromise} options={options}>
      <StripePayButton
        returnUrl={returnUrl}
        paymentMethod={paymentMethod}
        paying={paying}
        setPaying={setPaying}
        payLabel={payLabel}
        processingLabel={processingLabel}
        twintHint={twintHint}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
