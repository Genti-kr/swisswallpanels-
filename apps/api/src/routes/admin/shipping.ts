import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';

const router = Router();
router.use(requireAuth(['ADMIN', 'SUPERADMIN']));

const rateSchema = z.object({
  country: z.string().min(2),
  carrier: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  price: z.number().min(0),
  currency: z.string().default('CHF'),
  minDays: z.number().int().min(1),
  maxDays: z.number().int().min(1),
  freeAbove: z.number().optional().nullable(),
  isActive: z.boolean().default(true),
});

router.get('/', async (_req, res: Response, next: NextFunction) => {
  try {
    const rates = await prisma.shippingRate.findMany({ orderBy: [{ country: 'asc' }, { price: 'asc' }] });
    res.json({
      items: rates.map((r) => ({
        ...r,
        price: Number(r.price),
        freeAbove: r.freeAbove ? Number(r.freeAbove) : null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = rateSchema.parse(req.body);
    const rate = await prisma.shippingRate.create({ data });
    res.status(201).json({ rate });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed' });
    next(error);
  }
});

router.patch('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = rateSchema.partial().parse(req.body);
    const rate = await prisma.shippingRate.update({ where: { id: req.params.id }, data });
    res.json({ rate });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.shippingRate.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
