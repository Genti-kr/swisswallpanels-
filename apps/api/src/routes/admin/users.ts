import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { mapUser } from '../../lib/mappers';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { canChangeUserRole, canViewAdminAccounts, filterVisibleUsers } from '../../lib/permissions';
import { Role } from '@swisswall/types';

const router = Router();
router.use(requireAuth(['ADMIN', 'SUPERADMIN']));

const listQuerySchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  role: z.enum(['USER', 'ADMIN', 'SUPERADMIN'] as const).optional(),
  isLocked: z.boolean().optional(),
  lockReason: z.string().optional().nullable(),
});

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const where: {
      role?: Role;
      OR?: { email?: { contains: string }; firstName?: { contains: string }; lastName?: { contains: string } }[];
    } = {};

    if (query.role) where.role = query.role as Role;
    if (query.search) {
      where.OR = [
        { email: { contains: query.search } },
        { firstName: { contains: query.search } },
        { lastName: { contains: query.search } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
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
          emailVerified: true,
          isLocked: true,
          lockReason: true,
          country: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
    ]);

    const visible = filterVisibleUsers(req.user!.role, users);

    res.json({
      items: visible.map((u) => ({
        ...mapUser(u),
        isLocked: u.isLocked,
        lockReason: u.lockReason,
        country: u.country,
        orderCount: u._count.orders,
      })),
      total: canViewAdminAccounts(req.user!.role) ? total : visible.length,
      page: query.page,
      pageSize: query.pageSize,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        orders: { take: 10, orderBy: { createdAt: 'desc' }, include: { items: true } },
        addresses: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!canViewAdminAccounts(req.user!.role) && user.role !== 'USER') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({
      user: {
        ...mapUser(user),
        isLocked: user.isLocked,
        lockReason: user.lockReason,
        country: user.country,
        addresses: user.addresses,
        recentOrders: user.orders,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = updateUserSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'User not found' });

    if (data.role && !canChangeUserRole(req.user!.role, data.role)) {
      return res.status(403).json({ error: 'Cannot change to this role' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        companyName: data.companyName,
        role: data.role,
        isLocked: data.isLocked,
        lockReason: data.lockReason,
      },
    });

    res.json({ user: mapUser(user) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed' });
    }
    next(error);
  }
});

export default router;
