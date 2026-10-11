import { CHECKOUT_PAYMENT_LOGO } from '@/lib/checkout-payment-assets';

type CheckoutPaymentLogoProps = {
  kind: 'twint' | 'card';
  className?: string;
  alt?: string;
};

export function CheckoutPaymentLogo({ kind, className, alt }: CheckoutPaymentLogoProps) {
  const src = CHECKOUT_PAYMENT_LOGO[kind];
  const defaultAlt = kind === 'twint' ? 'TWINT' : 'Visa, Mastercard';
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? defaultAlt}
      className={className ?? 'h-10 w-auto max-w-[5.5rem] object-contain'}
    />
  );
}
