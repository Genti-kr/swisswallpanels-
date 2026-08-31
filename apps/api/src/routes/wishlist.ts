import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { mapProduct } from '../lib/mappers';

const router = Router();

router.get('/', requireAuth(), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId: req.user!.id },
      include: {
        items: {
          include: {
            product: {
              include: { images: true, variants: true, category: true },
            },
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    });

    res.json({
      items: (wishlist?.items || []).map((item) => ({
        id: item.id,
        productId: item.productId,
        product: mapProduct(item.product),
        addedAt: item.addedAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:productId', requireAuth(), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const wishlist = await prisma.wishlist.upsert({
      where: { userId: req.user!.id },
      update: {},
      create: { userId: req.user!.id },
    });

    const existing = await prisma.wishlistItem.findFirst({
      where: { wishlistId: wishlist.id, productId: req.params.productId },
    });

    if (existing) {
      return res.json({ success: true, message: 'Already in wishlist' });
    }

    await prisma.wishlistItem.create({
      data: { wishlistId: wishlist.id, productId: req.params.productId },
    });

    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.delete('/:productId', requireAuth(), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const wishlist = await prisma.wishlist.findUnique({ where: { userId: req.user!.id } });
    if (!wishlist) return res.json({ success: true });

    await prisma.wishlistItem.deleteMany({
      where: { wishlistId: wishlist.id, productId: req.params.productId },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
