import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';

const router = Router();
router.use(requireAuth(['SUPERADMIN']));

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  country: z.string().optional(),
});

router.get('/summary', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const query = querySchema.parse(req.query);
    const from = query.from ? new Date(query.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = query.to ? new Date(query.to) : new Date();

    const where: {
      createdAt: { gte: Date; lte: Date };
      paymentStatus: 'PAID';
      country?: string;
    } = {
      createdAt: { gte: from, lte: to },
      paymentStatus: 'PAID',
    };
    if (query.country) where.country = query.country;

    const [orders, refunds] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.aggregate({
        _sum: { refundAmount: true },
        where: { ...where, refundAmount: { not: null } },
      }),
    ]);

    const grossRevenue = orders.reduce((sum, o) => sum + Number(o.totalChf), 0);
    const vatTotal = orders.reduce((sum, o) => sum + Number(o.vatAmountChf), 0);
    const shippingTotal = orders.reduce((sum, o) => sum + Number(o.shippingCostChf), 0);
    const discountTotal = orders.reduce((sum, o) => sum + Number(o.discountAmountChf), 0);
    const refundTotal = Number(refunds._sum.refundAmount || 0);

    const byCountry: Record<string, number> = {};
    const byPaymentMethod: Record<string, number> = {};
    for (const order of orders) {
      const c = order.country || 'CH';
      byCountry[c] = (byCountry[c] || 0) + Number(order.totalChf);
      byPaymentMethod[order.paymentMethod] = (byPaymentMethod[order.paymentMethod] || 0) + Number(order.totalChf);
    }

    res.json({
      period: { from: from.toISOString(), to: to.toISOString() },
      orderCount: orders.length,
      grossRevenue,
      netRevenue: grossRevenue - refundTotal,
      vatTotal,
      shippingTotal,
      discountTotal,
      refundTotal,
      byCountry,
      byPaymentMethod,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        totalChf: Number(o.totalChf),
        country: o.country,
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/export', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const query = querySchema.parse(req.query);
    const from = query.from ? new Date(query.from) : new Date(new Date().getFullYear(), 0, 1);
    const to = query.to ? new Date(query.to) : new Date();

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: from, lte: to }, paymentStatus: 'PAID' },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'OrderNumber,Date,Customer,Country,Subtotal,VAT,Shipping,Discount,Total,PaymentMethod,Status\n';
    const rows = orders
      .map((o) => {
        const customer = o.user ? `${o.user.firstName} ${o.user.lastName} <${o.user.email}>` : o.guestEmail || '';
        return [
          o.orderNumber,
          o.createdAt.toISOString().slice(0, 10),
          `"${customer}"`,
          o.country,
          Number(o.subtotalChf),
          Number(o.vatAmountChf),
          Number(o.shippingCostChf),
          Number(o.discountAmountChf),
          Number(o.totalChf),
          o.paymentMethod,
          o.status,
        ].join(',');
      })
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="finance-${from.toISOString().slice(0, 10)}.csv"`);
    res.send(header + rows);
  } catch (error) {
    next(error);
  }
});

export default router;
