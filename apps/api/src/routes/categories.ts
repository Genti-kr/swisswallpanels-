import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { mapCategory } from '../lib/mappers';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ items: categories.map(mapCategory) });
  } catch (error) {
    next(error);
  }
});

export default router;
