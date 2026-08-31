import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { mapProduct } from '../lib/mappers';
import { searchLimiter } from '../middleware/rateLimit';
import { validationErrorResponse } from '../lib/safe-response';

const router = Router();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  category: z.string().max(100).optional(),
  featured: z.enum(['true', 'false']).optional(),
  search: z.string().max(100).optional(),
});

router.get('/', searchLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const where: Record<string, unknown> = { isActive: true };

    if (query.category) {
      where.category = { slug: query.category };
    }
    if (query.featured === 'true') {
      where.isFeatured = true;
    }
    if (query.search) {
      where.OR = [
        { slug: { contains: query.search } },
        { sku: { contains: query.search } },
      ];
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: { images: { orderBy: { sortOrder: 'asc' } }, variants: true, category: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    res.json({
      items: products.map(mapProduct),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const { status, body } = validationErrorResponse(error);
      return res.status(status).json(body);
    }
    next(error);
  }
});

router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.findFirst({
      where: { slug: req.params.slug, isActive: true },
      include: { images: { orderBy: { sortOrder: 'asc' } }, variants: true, category: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product: mapProduct(product) });
  } catch (error) {
    next(error);
  }
});

export default router;
