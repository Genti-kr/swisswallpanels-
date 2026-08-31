import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { validateCoupon } from '../lib/checkout-calc';

const router = Router();

const addressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().optional().nullable(),
  street: z.string().min(1),
  houseNumber: z.string().min(1),
  postCode: z.string().min(1),
  city: z.string().min(1),
  canton: z.string().optional().default(''),
  country: z.string().default('CH'),
  type: z.enum(['shipping', 'billing']).default('shipping'),
  isDefault: z.boolean().optional(),
  phone: z.string().optional().nullable(),
});

router.get('/', requireAuth(), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ isDefault: 'desc' }],
    });
    res.json({ items: addresses });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth(), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = addressSchema.parse(req.body);
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.id, type: data.type },
        data: { isDefault: false },
      });
    }
    const address = await prisma.address.create({
      data: { ...data, userId: req.user!.id },
    });
    res.status(201).json({ address });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed' });
    }
    next(error);
  }
});

router.patch('/:id', requireAuth(), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = addressSchema.partial().parse(req.body);
    const existing = await prisma.address.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!existing) return res.status(404).json({ error: 'Address not found' });

    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.id, type: data.type || existing.type },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id: req.params.id },
      data,
    });
    res.json({ address });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAuth(), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.address.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!existing) return res.status(404).json({ error: 'Address not found' });
    await prisma.address.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/validate-coupon', requireAuth(), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { code, subtotal } = z
      .object({ code: z.string().min(1), subtotal: z.number().positive() })
      .parse(req.body);
    const result = await validateCoupon(code, subtotal);
    res.json({
      code: result.coupon.code,
      discountAmount: result.discountAmount,
      type: result.coupon.type,
      value: Number(result.coupon.value),
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid coupon' });
  }
});

export default router;
