/**
 * End-to-end checkout verification:
 * product → cart → checkout → Stripe test payment → verify-payment → DB totals
 *
 * Usage: pnpm --filter api test:e2e-checkout
 * Requires: API running on PORT (default 3001), Stripe test keys in .env, seeded products
 */
import crypto from 'crypto';
import dotenv from 'dotenv';
import { prisma } from '../lib/prisma';
import { calculateTotals } from '../lib/checkout-calc';
import { getStripe } from '../lib/stripe';

dotenv.config();

const API_URL = (process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');

type JsonRecord = Record<string, unknown>;

async function apiFetch<T>(
  path: string,
  options: RequestInit & { cartSession?: string } = {}
): Promise<{ data: T; cartSession?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (options.cartSession) {
    headers['X-Cart-Session'] = options.cartSession;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const cartSession = res.headers.get('X-Cart-Session') || options.cartSession;
  const data = (await res.json()) as T & JsonRecord;

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${path}: ${JSON.stringify(data)}`);
  }

  return { data, cartSession: cartSession || undefined };
}

function assertClose(actual: number, expected: number, label: string) {
  if (Math.abs(actual - expected) > 0.02) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

async function main() {
  console.log('=== E2E Checkout Test ===');
  console.log(`API: ${API_URL}`);

  const health = await fetch(`${API_URL}/api/health`);
  if (!health.ok) {
    throw new Error('API health check failed — start the API with `pnpm dev:api`');
  }
  console.log('✓ API health OK');

  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe is not configured — set STRIPE_SECRET_KEY in apps/api/.env');
  }
  console.log('✓ Stripe configured');

  const product = await prisma.product.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!product) {
    throw new Error('No active products in DB — run `pnpm --filter api seed` first');
  }
  console.log(`✓ Product: ${product.sku} (${product.id})`);

  const { data: ratesData } = await apiFetch<{
    items: { id: string; price: number; freeAbove: number | null }[];
  }>('/api/shipping/rates?country=CH');
  const shippingRate = ratesData.items[0];
  if (!shippingRate) {
    throw new Error('No shipping rates for CH — run seed');
  }
  console.log(`✓ Shipping rate: ${shippingRate.id}`);

  let cartSession = crypto.randomBytes(16).toString('hex');
  const guestEmail = `e2e-${Date.now()}@example.com`;

  const addResult = await apiFetch<{ cart: { items: unknown[] } }>('/api/cart/items', {
    method: 'POST',
    cartSession,
    body: JSON.stringify({
      productId: product.id,
      quantity: 2,
    }),
  });
  cartSession = addResult.cartSession || cartSession;
  console.log(`✓ Added 2× product to cart (session ${cartSession.slice(0, 8)}…)`);

  const unitPrice = Number(product.priceChf);
  const grossSubtotal = unitPrice * 2;
  const freeAbove = shippingRate.freeAbove;
  const shippingCost =
    freeAbove !== null && grossSubtotal >= freeAbove ? 0 : shippingRate.price;
  const expectedTotals = calculateTotals({
    subtotalGross: grossSubtotal,
    shippingCost,
    discountAmount: 0,
    country: 'CH',
  });

  const checkoutBody = {
    shippingAddress: {
      firstName: 'E2E',
      lastName: 'Tester',
      street: 'Bahnhofstrasse',
      houseNumber: '1',
      postCode: '8001',
      city: 'Zürich',
      canton: 'ZH',
      country: 'CH',
    },
    shippingRateId: shippingRate.id,
    paymentMethod: 'card',
    guestEmail,
  };

  const idempotencyKey = `e2e-${Date.now()}`;
  const checkoutRes = await fetch(`${API_URL}/api/orders/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Cart-Session': cartSession,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(checkoutBody),
  });
  const checkoutJson = (await checkoutRes.json()) as JsonRecord;
  if (!checkoutRes.ok) {
    throw new Error(`Checkout failed: ${JSON.stringify(checkoutJson)}`);
  }

  const order = checkoutJson.order as JsonRecord;
  const clientSecret = checkoutJson.clientSecret as string | null;
  const orderId = order.id as string;
  const orderNumber = order.orderNumber as string;

  console.log(`✓ Order created: ${orderNumber} (total CHF ${order.totalChf})`);

  assertClose(Number(order.subtotalChf), expectedTotals.subtotal, 'subtotalChf');
  assertClose(Number(order.vatAmountChf), expectedTotals.vatAmount, 'vatAmountChf');
  assertClose(Number(order.totalChf), expectedTotals.total, 'totalChf');
  console.log('✓ Order totals match server-side calculation (not hardcoded)');

  if (!clientSecret) {
    throw new Error('Missing Stripe clientSecret from checkout response');
  }

  const paymentIntentId = clientSecret.split('_secret_')[0];
  console.log(`✓ PaymentIntent: ${paymentIntentId}`);

  const confirmed = await stripe.paymentIntents.confirm(paymentIntentId, {
    payment_method: 'pm_card_visa',
    return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/de/checkout`,
  });

  if (confirmed.status !== 'succeeded') {
    throw new Error(`Stripe payment not succeeded: ${confirmed.status}`);
  }
  console.log('✓ Stripe test card payment succeeded');

  const verifyRes = await fetch(`${API_URL}/api/orders/${orderId}/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: guestEmail }),
  });
  const verifyJson = (await verifyRes.json()) as JsonRecord;
  if (!verifyRes.ok) {
    throw new Error(`verify-payment failed: ${JSON.stringify(verifyJson)}`);
  }
  console.log('✓ verify-payment confirmed order');

  const dbOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!dbOrder) {
    throw new Error('Order not found in DB after payment');
  }

  if (dbOrder.paymentStatus !== 'PAID') {
    throw new Error(`Expected paymentStatus PAID, got ${dbOrder.paymentStatus}`);
  }
  if (dbOrder.status !== 'PAYMENT_CONFIRMED') {
    throw new Error(`Expected status PAYMENT_CONFIRMED, got ${dbOrder.status}`);
  }
  assertClose(Number(dbOrder.totalChf), expectedTotals.total, 'DB totalChf');
  assertClose(Number(dbOrder.items[0]?.totalChf), grossSubtotal, 'line item total');
  console.log('✓ DB order saved with correct totals and PAID status');

  const publicInvoice = await fetch(`${API_URL}/uploads/invoices/${orderNumber}.pdf`);
  if (publicInvoice.status !== 404) {
    throw new Error(`Invoice PDF must not be public (got HTTP ${publicInvoice.status})`);
  }
  console.log('✓ Invoice PDF not publicly accessible');

  console.log('\n=== ALL E2E CHECKS PASSED ===');
  console.log(`Order ${orderNumber} | Total CHF ${dbOrder.totalChf} | Guest ${guestEmail}`);
}

main()
  .catch((error) => {
    console.error('\n=== E2E FAILED ===');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
