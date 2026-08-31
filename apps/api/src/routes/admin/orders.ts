import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { mapOrderDetail } from '../../lib/mappers';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { emailService } from '../../services/email';
import { OrderStatus, PaymentStatus, DeliveryStatus } from '@swisswall/types';

const router = Router();
router.use(requireAuth(['ADMIN', 'SUPERADMIN']));

const listQuerySchema = z.object({
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  deliveryStatus: z.string().optional(),
  country: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const statusSchema = z.object({
  status: z.enum([
    'PENDING',
    'PAYMENT_CONFIRMED',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED',
  ] as const),
  note: z.string().optional(),
});

const noteSchema = z.object({
  note: z.string().min(1),
});

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const where: {
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      deliveryStatus?: DeliveryStatus;
      country?: string;
      OR?: { orderNumber?: { contains: string }; guestEmail?: { contains: string } }[];
    } = {};
    if (query.status) where.status = query.status as OrderStatus;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus as PaymentStatus;
    if (query.deliveryStatus) where.deliveryStatus = query.deliveryStatus as DeliveryStatus;
    if (query.country) where.country = query.country;
    if (query.search) {
      where.OR = [
        { orderNumber: { contains: query.search } },
        { guestEmail: { contains: query.search } },
      ];
    }

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: {
          items: true,
          statusHistory: { orderBy: { createdAt: 'desc' } },
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    res.json({
      items: orders.map(mapOrderDetail),
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(total / query.pageSize),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    next(error);
  }
});

router.get('/export/csv', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.country) where.country = query.country;

    const orders = await prisma.order.findMany({
      where,
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'OrderNumber,Date,Customer,Country,Total,PaymentStatus,DeliveryStatus,Status\n';
    const rows = orders
      .map((o) => {
        const customer = o.user ? `${o.user.firstName} ${o.user.lastName}` : o.guestEmail || '';
        return [
          o.orderNumber,
          o.createdAt.toISOString().slice(0, 10),
          `"${customer}"`,
          o.country,
          Number(o.totalChf),
          o.paymentStatus,
          o.deliveryStatus,
          o.status,
        ].join(',');
      })
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="orders-export.csv"');
    res.send(header + rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
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

router.patch('/:id/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { status, note } = statusSchema.parse(req.body);

    const existing = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { user: true, items: true },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status,
        statusHistory: {
          create: { status, note: note || null },
        },
      },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      },
    });

    if (existing.user && note) {
      await emailService.sendOrderStatusUpdate(
        {
          firstName: existing.user.firstName,
          lastName: existing.user.lastName,
          email: existing.user.email,
        },
        { orderNumber: order.orderNumber, status, note },
        existing.user.preferredLanguage.toLowerCase()
      );
    }

    res.json({ order: mapOrderDetail(order) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    next(error);
  }
});

router.post('/:id/note', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { note } = noteSchema.parse(req.body);

    const existing = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        notes: note,
        statusHistory: {
          create: { status: existing.status, note },
        },
      },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      },
    });

    if (existing.user) {
      await emailService.sendOrderStatusUpdate(
        {
          firstName: existing.user.firstName,
          lastName: existing.user.lastName,
          email: existing.user.email,
        },
        { orderNumber: order.orderNumber, status: order.status, note },
        existing.user.preferredLanguage.toLowerCase()
      );
    }

    res.json({ order: mapOrderDetail(order) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    next(error);
  }
});

export default router;
