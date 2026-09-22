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
    <div className="space-y-4">
      {isTwint && twintHint ? (
        <p className="text-xs text-zinc-500 font-light bg-[#F8F8F6] border border-zinc-100 rounded-xl px-4 py-3">
          {twintHint}
        </p>
      ) : null}
      <div className="rounded-2xl border border-zinc-200 bg-[#F8F8F6] p-4 min-h-[120px]">
        <PaymentElement
          onReady={() => setReady(true)}
          options={paymentElementOptions}
        />
      </div>
      <button
        type="button"
        onClick={handlePay}
        disabled={paying || !ready || !stripe}
        className="w-full sm:w-auto bg-[#1A1A1A] hover:bg-[#C8B89A] text-white hover:text-[#1A1A1A] px-8 py-4 rounded-xl text-xs font-bold uppercase tracking-widest disabled:opacity-50 transition-all duration-300 shadow-md flex justify-center items-center gap-2"
      >
        {paying && <Loader2 className="w-4 h-4 animate-spin" />}
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
          colorBackground: '#F8F8F6',
          borderRadius: '12px',
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
