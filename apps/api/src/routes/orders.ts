import { Router, Response, NextFunction, Request } from 'express';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { getStripe } from '../lib/stripe';
import { prisma } from '../lib/prisma';
import { mapOrder, mapOrderDetail } from '../lib/mappers';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { confirmOrderPayment } from '../lib/order-payment';
import { checkoutSchema, processCheckout } from '../lib/checkout-service';
import { verifyInvoiceAccessToken } from '../lib/invoice';
import { checkoutLimiter, verifyPaymentLimiter } from '../middleware/rateLimit';
import { validationErrorResponse, internalErrorMessage } from '../lib/safe-response';

const router = Router();

function parseIdempotencyKey(req: Request): string | undefined {
  const raw = req.headers['idempotency-key'];
  if (typeof raw !== 'string' || !raw.trim()) {
    return undefined;
  }
  const key = raw.trim().slice(0, 128);
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
    return undefined;
  }
  return key;
}

router.get('/', requireAuth(), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ items: orders.map(mapOrder) });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/invoice', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = String(req.query.email || '');
    const token = String(req.query.token || '');
    if (!email || !token) {
      return res.status(400).json({ error: 'Missing invoice access parameters' });
    }

    if (!verifyInvoiceAccessToken(req.params.id, email, token)) {
      return res.status(403).json({ error: 'Invalid invoice access token' });
    }

    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderEmail = order.userId
      ? (await prisma.user.findUnique({ where: { id: order.userId }, select: { email: true } }))?.email
      : order.guestEmail;

    if (!orderEmail || orderEmail.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: 'Invoice access denied' });
    }

    const filePath = path.join(process.cwd(), 'uploads', 'invoices', `${order.orderNumber}.pdf`);
    const pdf = await fs.readFile(filePath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${order.orderNumber}.pdf"`);
    res.send(pdf);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return res.status(404).json({ error: 'Invoice file not found' });
    }
    next(error);
  }
});

router.get('/:id', requireAuth(), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ order: mapOrderDetail(order) });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/checkout',
  checkoutLimiter,
  optionalAuth(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = checkoutSchema.parse(req.body);
      const idempotencyKey = parseIdempotencyKey(req);

      if (req.user) {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        if (!user.emailVerified && user.role === 'USER') {
          return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED', message: 'Email not verified' });
        }

        const result = await processCheckout(req, data, {
          userId: req.user.id,
          idempotencyKey,
        });

        return res.status(201).json(result);
      }

      const guestEmail = data.guestEmail?.trim().toLowerCase();
      if (!guestEmail) {
        return res.status(400).json({ error: 'Guest email is required for checkout without an account' });
      }

      const result = await processCheckout(req, data, {
        guestEmail,
        guestName: `${data.shippingAddress.firstName} ${data.shippingAddress.lastName}`.trim(),
        idempotencyKey,
      });

      return res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const { status, body } = validationErrorResponse(error);
        return res.status(status).json(body);
      }
      if (error instanceof Error) {
        return res.status(400).json({ error: internalErrorMessage(error) });
      }
      next(error);
    }
  }
);

const verifyPaymentSchema = z.object({
  email: z.string().email().optional(),
});

router.post(
  '/:id/verify-payment',
  verifyPaymentLimiter,
  optionalAuth(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const stripe = getStripe();
      if (!stripe) {
        return res.status(503).json({ error: 'Stripe payment integration is not configured on this server.' });
      }

      const body = verifyPaymentSchema.parse(req.body ?? {});

      let order;
      if (req.user) {
        order = await prisma.order.findFirst({
          where: { id: req.params.id, userId: req.user.id },
          include: { items: true },
        });
      } else {
        const email = body.email?.trim().toLowerCase();
        if (!email) {
          return res.status(400).json({ error: 'Guest email is required to verify payment' });
        }
        order = await prisma.order.findFirst({
          where: { id: req.params.id, guestEmail: email, userId: null },
          include: { items: true },
        });
      }

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.paymentStatus === 'PAID' || order.status === 'PAYMENT_CONFIRMED') {
        return res.json({ order: mapOrder(order), confirmed: true });
      }

      if (!order.stripePaymentIntent) {
        return res.status(400).json({ error: 'No payment intent associated with this order.' });
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntent);
      if (paymentIntent.status !== 'succeeded') {
        return res.status(402).json({
          error: 'Payment has not been completed.',
          paymentStatus: paymentIntent.status,
        });
      }

      await confirmOrderPayment(order.id, 'Payment confirmed via Stripe payment intent');

      const updated = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });

      res.json({ order: mapOrder(updated!), confirmed: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const { status, body } = validationErrorResponse(error);
        return res.status(status).json(body);
      }
      next(error);
    }
  }
);

export default router;
