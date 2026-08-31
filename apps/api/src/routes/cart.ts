import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { mapCart } from '../lib/mappers';
import { requireAuth, AuthenticatedRequest, resolveSessionUserId } from '../middleware/auth';
import { validationErrorResponse } from '../lib/safe-response';

const router = Router();

const productInclude = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: true,
};

async function getOrCreateCart(req: Request) {
  const userId = resolveSessionUserId(req);

  if (userId) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: { include: productInclude } } } },
    });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: { items: { include: { product: { include: productInclude } } } },
      });
    }
    return cart;
  }

  let sessionId = req.headers['x-cart-session'] as string | undefined;
  if (!sessionId) {
    sessionId = crypto.randomBytes(16).toString('hex');
  }

  let cart = await prisma.cart.findUnique({
    where: { sessionId },
    include: { items: { include: { product: { include: productInclude } } } },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { sessionId },
      include: { items: { include: { product: { include: productInclude } } } },
    });
  }

  return { cart, newSessionId: sessionId };
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getOrCreateCart(req);
    const cart = 'cart' in result ? result.cart : result;
    const newSessionId = 'newSessionId' in result ? result.newSessionId : undefined;

    if (newSessionId) {
      res.setHeader('X-Cart-Session', newSessionId);
    }

    res.json({ cart: mapCart(cart) });
  } catch (error) {
    next(error);
  }
});

const addItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  quantity: z.number().int().min(1).max(99),
});

router.post('/items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = addItemSchema.parse(req.body);
    const result = await getOrCreateCart(req);
    const cart = 'cart' in result ? result.cart : result;
    const newSessionId = 'newSessionId' in result ? result.newSessionId : undefined;

    const product = await prisma.product.findFirst({
      where: { id: data.productId, isActive: true },
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: data.productId,
        variantId: data.variantId || null,
      },
    });

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: Math.min(99, existingItem.quantity + data.quantity) },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: data.productId,
          variantId: data.variantId || null,
          quantity: data.quantity,
        },
      });
    }

    const updated = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { product: { include: productInclude } } } },
    });

    if (newSessionId) {
      res.setHeader('X-Cart-Session', newSessionId);
    }

    res.json({ cart: mapCart(updated!) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const { status, body } = validationErrorResponse(error);
      return res.status(status).json(body);
    }
    next(error);
  }
});

const updateItemSchema = z.object({
  quantity: z.number().int().min(0).max(99),
});

router.patch('/items/:itemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateItemSchema.parse(req.body);
    const result = await getOrCreateCart(req);
    const cart = 'cart' in result ? result.cart : result;

    const item = await prisma.cartItem.findFirst({
      where: { id: req.params.itemId, cartId: cart.id },
    });
    if (!item) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    if (data.quantity === 0) {
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity: data.quantity },
      });
    }

    const updated = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { product: { include: productInclude } } } },
    });

    res.json({ cart: mapCart(updated!) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const { status, body } = validationErrorResponse(error);
      return res.status(status).json(body);
    }
    next(error);
  }
});

router.delete('/items/:itemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getOrCreateCart(req);
    const cart = 'cart' in result ? result.cart : result;

    await prisma.cartItem.deleteMany({
      where: { id: req.params.itemId, cartId: cart.id },
    });

    const updated = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { include: { product: { include: productInclude } } } },
    });

    res.json({ cart: mapCart(updated!) });
  } catch (error) {
    next(error);
  }
});

router.post('/merge', requireAuth(), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.headers['x-cart-session'] as string | undefined;
    const userId = req.user!.id;

    let userCart = await prisma.cart.findUnique({ where: { userId } });
    if (!userCart) {
      userCart = await prisma.cart.create({ data: { userId } });
    }

    if (sessionId) {
      const guestCart = await prisma.cart.findUnique({
        where: { sessionId },
        include: { items: true },
      });

      if (guestCart && guestCart.items.length > 0) {
        for (const item of guestCart.items) {
          const existing = await prisma.cartItem.findFirst({
            where: {
              cartId: userCart.id,
              productId: item.productId,
              variantId: item.variantId,
            },
          });
          if (existing) {
            await prisma.cartItem.update({
              where: { id: existing.id },
              data: { quantity: Math.min(99, existing.quantity + item.quantity) },
            });
          } else {
            await prisma.cartItem.create({
              data: {
                cartId: userCart.id,
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
              },
            });
          }
        }
        await prisma.cartItem.deleteMany({ where: { cartId: guestCart.id } });
        await prisma.cart.delete({ where: { id: guestCart.id } });
      }
    }

    const updated = await prisma.cart.findUnique({
      where: { id: userCart.id },
      include: { items: { include: { product: { include: productInclude } } } },
    });

    res.json({ cart: mapCart(updated!) });
  } catch (error) {
    next(error);
  }
});

export default router;
