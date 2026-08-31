import { Request } from 'express';
import { z } from 'zod';
import { prisma } from './prisma';
import { getStripe, getStripePublishableKey } from './stripe';
import { mapOrder } from './mappers';
import { validateSwissPLZ, generateOrderNumber } from './swiss';
import { getProductName } from './order-payment';
import {
  calculateTotals,
  resolveShippingCost,
  validateCoupon,
  getStripePaymentMethods,
  getCurrency,
  assertPaymentMethodAllowed,
} from './checkout-calc';

const productInclude = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: true,
};

export const addressSchema = z.object({
  firstName: z.string().min(1).max(80).trim(),
  lastName: z.string().min(1).max(80).trim(),
  company: z.string().max(120).optional().nullable(),
  street: z.string().min(1).max(120).trim(),
  houseNumber: z.string().min(1).max(20).trim(),
  postCode: z.string().min(1).max(12).trim(),
  city: z.string().min(1).max(80).trim(),
  canton: z.string().max(10).optional().default(''),
  country: z.enum(['CH', 'DE', 'FR', 'IT']).default('CH'),
});

export const checkoutSchema = z.object({
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  shippingRateId: z.string().min(1).max(64),
  paymentMethod: z
    .enum(['stripe', 'twint', 'card', 'transfer', 'invoice', 'postfinance', 'sepa', 'paypal', 'klarna', 'sofort'])
    .default('card'),
  couponCode: z.string().max(50).optional(),
  notes: z.string().max(1000).optional(),
  guestEmail: z.string().email().max(255).optional(),
}).strict();

export function validateAddress(address: z.infer<typeof addressSchema>) {
  if (address.country === 'CH' && !validateSwissPLZ(address.postCode)) {
    throw new Error('Invalid Swiss PLZ');
  }
}

async function loadCartByUserId(userId: string) {
  return prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: { include: productInclude },
        },
      },
    },
  });
}

async function loadCartBySessionId(sessionId: string) {
  return prisma.cart.findUnique({
    where: { sessionId },
    include: {
      items: {
        include: {
          product: { include: productInclude },
        },
      },
    },
  });
}

export async function resolveCheckoutCart(req: Request, userId?: string) {
  if (userId) {
    const cart = await loadCartByUserId(userId);
    return { cart, sessionId: undefined as string | undefined };
  }

  const sessionId = req.headers['x-cart-session'] as string | undefined;
  if (!sessionId) {
    throw new Error('Cart session required for guest checkout');
  }

  const cart = await loadCartBySessionId(sessionId);
  return { cart, sessionId };
}

export async function processCheckout(
  req: Request,
  data: z.infer<typeof checkoutSchema>,
  options: {
    userId?: string | null;
    guestEmail?: string | null;
    guestName?: string | null;
    idempotencyKey?: string | null;
  }
) {
  if (options.idempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey: options.idempotencyKey },
      include: { items: true },
    });
    if (existing) {
      const usesStripe = ['stripe', 'twint', 'card'].includes(existing.paymentMethod);
      let clientSecret: string | null = null;
      if (usesStripe && existing.stripePaymentIntent) {
        const stripe = getStripe();
        if (stripe) {
          const intent = await stripe.paymentIntents.retrieve(existing.stripePaymentIntent);
          clientSecret = intent.client_secret;
        }
      }
      return {
        order: mapOrder(existing),
        clientSecret,
        stripePublishableKey: usesStripe ? getStripePublishableKey() : null,
        requiresManualPayment: !usesStripe,
        customerEmail: existing.guestEmail,
        idempotentReplay: true,
      };
    }
  }

  validateAddress(data.shippingAddress);
  if (data.billingAddress) validateAddress(data.billingAddress);
  assertPaymentMethodAllowed(data.shippingAddress.country, data.paymentMethod);

  const billingAddress = data.billingAddress || data.shippingAddress;
  const country = data.shippingAddress.country;

  const { cart } = await resolveCheckoutCart(req, options.userId || undefined);
  if (!cart || cart.items.length === 0) {
    throw new Error('Cart is empty');
  }

  let grossSubtotal = 0;
  const orderItemsData: {
    productId: string;
    productName: string;
    productSku: string | null;
    variantName: string | null;
    imageUrl: string | null;
    quantity: number;
    unitPriceChf: number;
    totalChf: number;
  }[] = [];

  for (const item of cart.items) {
    const variant = item.variantId
      ? item.product.variants.find((v) => v.id === item.variantId)
      : null;
    const unitPrice = variant ? Number(variant.priceChf) : Number(item.product.priceChf);
    const lineTotal = unitPrice * item.quantity;
    grossSubtotal += lineTotal;

    const primaryImage = item.product.images?.find((img) => img.isPrimary) || item.product.images?.[0];

    orderItemsData.push({
      productId: item.productId,
      productName: getProductName(item.product.nameJson),
      productSku: variant?.sku || item.product.sku,
      variantName: variant ? getProductName(variant.nameJson) : null,
      imageUrl: primaryImage?.url || null,
      quantity: item.quantity,
      unitPriceChf: unitPrice,
      totalChf: lineTotal,
    });
  }

  const { cost: shippingCostChf, rate: shippingRate } = await resolveShippingCost(
    data.shippingRateId,
    grossSubtotal
  );

  let discountAmountChf = 0;
  let discountCodeId: string | null = null;
  let couponCode: string | null = null;

  if (data.couponCode) {
    const couponResult = await validateCoupon(data.couponCode, grossSubtotal);
    discountAmountChf = couponResult.discountAmount;
    discountCodeId = couponResult.coupon.id;
    couponCode = couponResult.coupon.code;
  }

  const totals = calculateTotals({
    subtotalGross: grossSubtotal,
    shippingCost: shippingCostChf,
    discountAmount: discountAmountChf,
    country,
  });

  const orderNumber = await generateOrderNumber();
  const stripeMethods = ['stripe', 'twint', 'card'];
  const usesStripe = stripeMethods.includes(data.paymentMethod);

  let stripePaymentIntent: string | null = null;
  let clientSecret: string | null = null;
  const stripe = getStripe();

  const customerEmail = options.guestEmail || data.guestEmail || null;
  const customerRef = options.userId || customerEmail || 'guest';

  if (usesStripe) {
    if (!stripe) {
      throw new Error('Stripe payment integration is not configured on this server.');
    }

    const paymentMethodTypes = getStripePaymentMethods(country, data.paymentMethod);
    const currency = getCurrency(country).toLowerCase();

    const intent = await stripe.paymentIntents.create(
      {
        amount: Math.round(totals.total * 100),
        currency,
        metadata: {
          orderNumber,
          customerRef,
          ...(customerEmail ? { guestEmail: customerEmail } : {}),
        },
        payment_method_types: paymentMethodTypes,
        ...(customerEmail ? { receipt_email: customerEmail } : {}),
      },
      options.idempotencyKey ? { idempotencyKey: `pi-${options.idempotencyKey}` } : undefined
    );
    stripePaymentIntent = intent.id;
    clientSecret = intent.client_secret;
  }

  const guestName =
    options.guestName ||
    `${data.shippingAddress.firstName} ${data.shippingAddress.lastName}`.trim();

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        userId: options.userId || null,
        guestEmail: options.userId ? null : customerEmail,
        guestName: options.userId ? null : guestName,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        deliveryStatus: 'NEW',
        country,
        currency: totals.currency,
        couponCode,
        discountCodeId,
        shippingAddressJson: data.shippingAddress,
        billingAddressJson: billingAddress,
        subtotalChf: totals.subtotal,
        vatAmountChf: totals.vatAmount,
        shippingCostChf,
        discountAmountChf,
        totalChf: totals.total,
        paymentMethod: data.paymentMethod,
        shippingMethod: shippingRate?.name || null,
        shippingCarrier: shippingRate?.carrier || null,
        stripePaymentIntent,
        notes: data.notes,
        idempotencyKey: options.idempotencyKey || null,
        items: { create: orderItemsData },
        statusHistory: { create: { status: 'PENDING', note: 'Order placed' } },
      },
      include: { items: true },
    });

    if (discountCodeId) {
      await tx.discountCode.update({
        where: { id: discountCodeId },
        data: { usesCount: { increment: 1 } },
      });
    }

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    return created;
  });

  return {
    order: mapOrder(order),
    clientSecret,
    stripePublishableKey: usesStripe ? getStripePublishableKey() : null,
    requiresManualPayment: !usesStripe,
    customerEmail,
  };
}
