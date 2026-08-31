import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import PDFDocument from 'pdfkit';
import { prisma } from './prisma';
import { formatCHF } from './swiss';
import { getApiUrl } from './urls';

import { getInvoiceSigningSecret } from './secrets';

const INVOICE_DIR = path.join(process.cwd(), 'uploads', 'invoices');

function getInvoiceSecret(): string {
  return getInvoiceSigningSecret();
}

export function createInvoiceAccessToken(orderId: string, email: string): string {
  return crypto
    .createHmac('sha256', getInvoiceSecret())
    .update(`${orderId}:${email.toLowerCase()}`)
    .digest('hex');
}

export function verifyInvoiceAccessToken(orderId: string, email: string, token: string): boolean {
  const expected = createInvoiceAccessToken(orderId, email);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

export function buildInvoiceDownloadUrl(orderId: string, email: string): string {
  const token = createInvoiceAccessToken(orderId, email);
  const base = getApiUrl();
  return `${base}/api/orders/${orderId}/invoice?email=${encodeURIComponent(email)}&token=${token}`;
}

type InvoiceOrder = {
  orderNumber: string;
  guestEmail: string | null;
  guestName: string | null;
  createdAt: Date;
  subtotalChf: number;
  vatAmountChf: number;
  shippingCostChf: number;
  discountAmountChf: number;
  totalChf: number;
  currency: string;
  paymentMethod: string;
  shippingAddressJson: unknown;
  billingAddressJson: unknown;
  user: { firstName: string; lastName: string; email: string } | null;
  items: {
    productName: string;
    variantName: string | null;
    quantity: number;
    unitPriceChf: number;
    totalChf: number;
  }[];
};

function formatAddress(address: Record<string, string>): string {
  const lines = [
    `${address.firstName || ''} ${address.lastName || ''}`.trim(),
    address.company || '',
    `${address.street || ''} ${address.houseNumber || ''}`.trim(),
    `${address.postCode || ''} ${address.city || ''}`.trim(),
    address.country || '',
  ].filter(Boolean);
  return lines.join('\n');
}

async function renderInvoicePdf(order: InvoiceOrder): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const customerName = order.user
      ? `${order.user.firstName} ${order.user.lastName}`
      : order.guestName || 'Customer';
    const customerEmail = order.user?.email || order.guestEmail || '';
    const shipping = order.shippingAddressJson as Record<string, string>;
    const billing = order.billingAddressJson as Record<string, string>;

    doc.fontSize(20).text('Swiss Wall Panels', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#666').text('Invoice / Rechnung');
    doc.fillColor('#000');
    doc.moveDown();

    doc.fontSize(12).text(`Invoice No: ${order.orderNumber}`);
    doc.text(`Date: ${order.createdAt.toISOString().slice(0, 10)}`);
    doc.text(`Customer: ${customerName}`);
    doc.text(`Email: ${customerEmail}`);
    doc.moveDown();

    doc.fontSize(11).text('Billing address:');
    doc.fontSize(10).text(formatAddress(billing));
    doc.moveDown(0.5);
    doc.fontSize(11).text('Shipping address:');
    doc.fontSize(10).text(formatAddress(shipping));
    doc.moveDown();

    doc.fontSize(11).text('Items', { underline: true });
    doc.moveDown(0.3);
    for (const item of order.items) {
      const variant = item.variantName ? ` (${item.variantName})` : '';
      doc.fontSize(10).text(
        `${item.productName}${variant} — ${item.quantity} × ${formatCHF(item.unitPriceChf)} = ${formatCHF(item.totalChf)}`
      );
    }

    doc.moveDown();
    doc.fontSize(10).text(`Subtotal: ${formatCHF(order.subtotalChf)}`);
    doc.text(`VAT: ${formatCHF(order.vatAmountChf)}`);
    doc.text(`Shipping: ${formatCHF(order.shippingCostChf)}`);
    if (order.discountAmountChf > 0) {
      doc.text(`Discount: -${formatCHF(order.discountAmountChf)}`);
    }
    doc.moveDown(0.3);
    doc.fontSize(12).text(`Total (${order.currency}): ${formatCHF(order.totalChf)}`, { continued: false });
    doc.moveDown();
    doc.fontSize(9).fillColor('#666').text(
      'Thank you for your order. This document was generated automatically.',
      { align: 'left' }
    );

    doc.end();
  });
}

export async function readStoredInvoicePdf(orderNumber: string): Promise<Buffer | null> {
  try {
    const filePath = path.join(INVOICE_DIR, `${orderNumber}.pdf`);
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

export async function generateAndStoreInvoice(orderId: string): Promise<string | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: true },
  });

  if (!order) return null;

  const email = order.user?.email || order.guestEmail;
  if (!email) return null;

  const invoiceOrder: InvoiceOrder = {
    orderNumber: order.orderNumber,
    guestEmail: order.guestEmail,
    guestName: order.guestName,
    createdAt: order.createdAt,
    subtotalChf: Number(order.subtotalChf),
    vatAmountChf: Number(order.vatAmountChf),
    shippingCostChf: Number(order.shippingCostChf),
    discountAmountChf: Number(order.discountAmountChf),
    totalChf: Number(order.totalChf),
    currency: order.currency,
    paymentMethod: order.paymentMethod,
    shippingAddressJson: order.shippingAddressJson,
    billingAddressJson: order.billingAddressJson,
    user: order.user,
    items: order.items.map((i) => ({
      productName: i.productName,
      variantName: i.variantName,
      quantity: i.quantity,
      unitPriceChf: Number(i.unitPriceChf),
      totalChf: Number(i.totalChf),
    })),
  };

  await fs.mkdir(INVOICE_DIR, { recursive: true });
  const filename = `${order.orderNumber}.pdf`;
  const filePath = path.join(INVOICE_DIR, filename);
  const pdfBuffer = await renderInvoicePdf(invoiceOrder);
  await fs.writeFile(filePath, pdfBuffer);

  const invoiceUrl = buildInvoiceDownloadUrl(orderId, email);
  await prisma.order.update({
    where: { id: orderId },
    data: { invoiceUrl },
  });

  return invoiceUrl;
}
