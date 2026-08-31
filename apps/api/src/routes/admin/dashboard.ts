import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { mapOrder } from '../../lib/mappers';

const router = Router();

router.get('/stats', requireAuth(['ADMIN', 'SUPERADMIN']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [todayOrders, monthOrders, newCustomers, pendingPayments, lowStock, recentOrders, allMonthOrders] =
      await Promise.all([
        prisma.order.aggregate({
          _sum: { totalChf: true },
          _count: true,
          where: { createdAt: { gte: startOfDay }, paymentStatus: 'PAID' },
        }),
        prisma.order.aggregate({
          _sum: { totalChf: true },
          where: { createdAt: { gte: startOfMonth }, paymentStatus: 'PAID' },
        }),
        prisma.user.count({ where: { role: 'USER', createdAt: { gte: startOfDay } } }),
        prisma.order.count({ where: { paymentStatus: 'PENDING', createdAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) } } }),
        prisma.product.count({ where: { stockQuantity: { lt: 3 }, isActive: true } }),
        prisma.order.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { items: true, user: true },
        }),
        prisma.order.findMany({
          where: { createdAt: { gte: thirtyDaysAgo }, paymentStatus: 'PAID' },
          include: { items: true },
        }),
      ]);

    const revenueByCountry: Record<string, number> = {};
    for (const order of allMonthOrders) {
      const c = order.country || 'CH';
      revenueByCountry[c] = (revenueByCountry[c] || 0) + Number(order.totalChf);
    }

    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const order of allMonthOrders) {
      for (const item of order.items) {
        const key = item.productId;
        if (!productSales[key]) {
          productSales[key] = { name: item.productName, quantity: 0, revenue: 0 };
        }
        productSales[key].quantity += item.quantity;
        productSales[key].revenue += Number(item.totalChf);
      }
    }

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    res.json({
      todayRevenue: Number(todayOrders._sum.totalChf || 0),
      monthRevenue: Number(monthOrders._sum.totalChf || 0),
      newOrders: todayOrders._count,
      newCustomers,
      pendingPayments,
      lowStockProducts: lowStock,
      revenueByCountry,
      topProducts,
      recentOrders: recentOrders.map(mapOrder),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/settings', requireAuth(['SUPERADMIN']), async (_req, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.appSetting.findUnique({ where: { id: 'global' } });
    res.json({ settings });
  } catch (error) {
    next(error);
  }
});

router.patch('/settings', requireAuth(['SUPERADMIN']), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.appSetting.upsert({
      where: { id: 'global' },
      update: {
        maintenanceMode: req.body.maintenanceMode ?? undefined,
        maintenanceMessage: req.body.maintenanceMessage ?? undefined,
      },
      create: {
        id: 'global',
        maintenanceMode: req.body.maintenanceMode ?? false,
        maintenanceMessage: req.body.maintenanceMessage ?? null,
      },
    });
    res.json({ settings });
  } catch (error) {
    next(error);
  }
});

export default router;
