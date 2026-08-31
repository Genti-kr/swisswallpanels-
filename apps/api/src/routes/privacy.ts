import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { mapOrder } from '../lib/mappers';

const router = Router();

router.use(requireAuth());

router.get('/export', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        companyName: true,
        vatNumber: true,
        role: true,
        preferredLanguage: true,
        newsletterOptIn: true,
        emailVerified: true,
        country: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [addresses, orders, wishlist] = await Promise.all([
      prisma.address.findMany({ where: { userId } }),
      prisma.order.findMany({
        where: { userId },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.wishlist.findUnique({
        where: { userId },
        include: { items: { include: { product: { select: { slug: true, sku: true } } } } },
      }),
    ]);

    res.json({
      exportedAt: new Date().toISOString(),
      user,
      addresses,
      orders: orders.map(mapOrder),
      wishlist: wishlist?.items.map((item) => ({
        productSlug: item.product.slug,
        productSku: item.product.sku,
        addedAt: item.addedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/account', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'ADMIN' || user.role === 'SUPERADMIN') {
      return res.status(403).json({ error: 'Admin accounts cannot be self-deleted via this endpoint' });
    }

    const randomPassword = crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 12);

    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({ where: { userId } });
      await tx.cartItem.deleteMany({ where: { cart: { userId } } });
      await tx.cart.deleteMany({ where: { userId } });
      await tx.wishlistItem.deleteMany({ where: { wishlist: { userId } } });
      await tx.wishlist.deleteMany({ where: { userId } });
      await tx.address.deleteMany({ where: { userId } });

      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@anonymized.local`,
          firstName: 'Deleted',
          lastName: 'User',
          phone: null,
          companyName: null,
          vatNumber: null,
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
          emailVerifyToken: null,
          emailVerifyExpires: null,
          unlockToken: null,
          unlockTokenExpires: null,
          newsletterOptIn: false,
          emailVerified: false,
          isLocked: true,
        },
      });

      await tx.auditLog.create({
        data: {
          event: 'ACCOUNT_DELETED',
          userId,
          ipAddress: crypto.createHash('sha256').update('gdpr-delete').digest('hex'),
          userAgent: 'gdpr-delete',
          timestamp: new Date(),
        },
      });
    });

    res.json({
      message: 'Account anonymized. Order history is retained for legal and tax obligations.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
