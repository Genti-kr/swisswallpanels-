import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { PAYMENT_METHODS } from '../lib/checkout-calc';

const router = Router();

router.get('/rates', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const country = (req.query.country as string) || 'CH';
    const rates = await prisma.shippingRate.findMany({
      where: { country, isActive: true },
      orderBy: { price: 'asc' },
    });

    res.json({
      items: rates.map((r) => ({
        id: r.id,
        country: r.country,
        carrier: r.carrier,
        name: r.name,
        description: r.description,
        price: Number(r.price),
        currency: r.currency,
        minDays: r.minDays,
        maxDays: r.maxDays,
        freeAbove: r.freeAbove ? Number(r.freeAbove) : null,
        isActive: r.isActive,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/payment-methods', (req: Request, res: Response) => {
  const country = (req.query.country as string) || 'CH';
  const methods = PAYMENT_METHODS[country as keyof typeof PAYMENT_METHODS] || PAYMENT_METHODS.CH;
  res.json({ items: methods });
});

export default router;
