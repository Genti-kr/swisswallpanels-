import crypto from 'crypto';
import { prisma } from './prisma';
import { emailService } from '../services/email';
import { generateAndStoreInvoice, readStoredInvoicePdf } from './invoice';
import { MultilingualText } from '@swisswall/types';

function getProductName(nameJson: unknown): string {
  const names = nameJson as MultilingualText;
  return names.de || names.en || 'Product';
}

function resolveCustomer(order: {
  guestEmail: string | null;
  guestName: string | null;
  user: { firstName: string; lastName: string; email: string; phone: string | null; preferredLanguage: string } | null;
}) {
  if (order.user) {
    return {
      firstName: order.user.firstName,
      lastName: order.user.lastName,
      email: order.user.email,
      phone: order.user.phone,
      locale: order.user.preferredLanguage.toLowerCase(),
    };
  }

  const [firstName = 'Guest', ...rest] = (order.guestName || 'Guest').split(' ');
  return {
    firstName,
    lastName: rest.join(' ') || 'Customer',
    email: order.guestEmail || '',
    phone: null as string | null,
    locale: 'de',
  };
}

function buildEmailOrder(order: {
  orderNumber: string;
  totalChf: unknown;
  subtotalChf: unknown;
  vatAmountChf: unknown;
  shippingCostChf: unknown;
  discountAmountChf: unknown;
  paymentMethod: string;
  invoiceUrl: string | null;
  items: {
    productName: string;
    variantName: string | null;
    quantity: number;
    unitPriceChf: unknown;
    totalChf: unknown;
  }[];
}) {
  return {
    orderNumber: order.orderNumber,
    totalChf: Number(order.totalChf),
    subtotalChf: Number(order.subtotalChf),
    vatAmountChf: Number(order.vatAmountChf),
    shippingCostChf: Number(order.shippingCostChf),
    discountAmountChf: Number(order.discountAmountChf),
    paymentMethod: order.paymentMethod,
    invoiceUrl: order.invoiceUrl,
    items: order.items.map((i) => ({
      productName: i.productName,
      variantName: i.variantName,
      quantity: i.quantity,
      unitPriceChf: Number(i.unitPriceChf),
      totalChf: Number(i.totalChf),
    })),
  };
}

async function clearCartForOrder(order: { userId: string | null; guestEmail: string | null }) {
  if (order.userId) {
    const cart = await prisma.cart.findUnique({ where: { userId: order.userId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return;
  }

  if (order.guestEmail) {
    const carts = await prisma.cart.findMany({
      where: { sessionId: { not: null }, userId: null },
      take: 20,
    });
    for (const cart of carts) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  }
}

export async function confirmOrderPayment(orderId: string, note: string): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      user: true,
    },
  });

  if (!order) {
    return false;
  }

  const customer = resolveCustomer(order);
  if (!customer.email) {
    return false;
  }

  if (order.paymentStatus === 'PAID' || order.status === 'PAYMENT_CONFIRMED') {
    return true;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'PAYMENT_CONFIRMED',
      paymentStatus: 'PAID',
      deliveryStatus: 'PROCESSING',
      statusHistory: {
        create: { status: 'PAYMENT_CONFIRMED', note },
      },
    },
  });

  await clearCartForOrder(order);

  const invoiceUrl = await generateAndStoreInvoice(order.id);
  const refreshed = await prisma.order.findUnique({
    where: { id: order.id },
    include: { items: true },
  });

  const emailOrder = buildEmailOrder({
    ...refreshed!,
    invoiceUrl: invoiceUrl || refreshed?.invoiceUrl || null,
  });

  const invoicePdf = refreshed ? await readStoredInvoicePdf(refreshed.orderNumber) : null;

  await emailService.sendOrderConfirmation(
    emailOrder,
    {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
    },
    customer.locale,
    invoicePdf
  );

  await emailService.sendNewOrderAdminAlert(emailOrder, {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
  });

  await prisma.auditLog.create({
    data: {
      event: 'PAYMENT_CONFIRMED',
      userId: order.userId,
      ipAddress: crypto.createHash('sha256').update(`order:${order.id}`).digest('hex'),
      userAgent: 'stripe-payment',
      timestamp: new Date(),
    },
  });

  return true;
}

export async function notifyOrderPlaced(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: true },
  });
  if (!order) return;

  const customer = resolveCustomer(order);
  if (!customer.email) return;

  const invoiceUrl = await generateAndStoreInvoice(order.id);
  const refreshed = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!refreshed) return;

  const emailOrder = buildEmailOrder({
    ...refreshed,
    invoiceUrl: invoiceUrl || refreshed.invoiceUrl || null,
  });

  const invoicePdf = await readStoredInvoicePdf(refreshed.orderNumber);

  await emailService.sendOrderConfirmation(
    emailOrder,
    {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
    },
    customer.locale,
    invoicePdf
  );

  await emailService.sendNewOrderAdminAlert(emailOrder, {
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
  });
}

export { getProductName };
