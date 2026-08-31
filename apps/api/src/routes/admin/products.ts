import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { mapProduct } from '../../lib/mappers';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { processAndUploadImage, deleteImageByUrl } from '../../services/storage';
import { productSchema } from '../../lib/validators/product';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(requireAuth(['ADMIN', 'SUPERADMIN']));

router.get('/', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      include: { images: { orderBy: { sortOrder: 'asc' } }, variants: true, category: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ items: products.map(mapProduct) });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = productSchema.parse(req.body);
    const product = await prisma.product.create({
      data,
      include: { images: true, variants: true },
    });
    res.status(201).json({ product: mapProduct(product) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    next(error);
  }
});

router.put('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = productSchema.partial().parse(req.body);
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: { images: { orderBy: { sortOrder: 'asc' } }, variants: true },
    });
    res.json({ product: mapProduct(product) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    next(error);
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const images = await prisma.productImage.findMany({ where: { productId: req.params.id } });
    await prisma.product.delete({ where: { id: req.params.id } });
    for (const img of images) {
      await deleteImageByUrl(img.url);
    }
    res.json({ message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/:id/images',
  upload.single('image'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const product = await prisma.product.findUnique({ where: { id: req.params.id } });
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const url = await processAndUploadImage(req.file.buffer, req.file.originalname);
      const isPrimary = req.body.isPrimary === 'true' || req.body.isPrimary === true;

      if (isPrimary) {
        await prisma.productImage.updateMany({
          where: { productId: product.id },
          data: { isPrimary: false },
        });
      }

      const imageCount = await prisma.productImage.count({ where: { productId: product.id } });
      const image = await prisma.productImage.create({
        data: {
          productId: product.id,
          url,
          isPrimary: isPrimary || imageCount === 0,
          sortOrder: imageCount,
        },
      });

      res.status(201).json({ image });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id/images/:imageId',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const image = await prisma.productImage.findFirst({
        where: { id: req.params.imageId, productId: req.params.id },
      });
      if (!image) {
        return res.status(404).json({ error: 'Image not found' });
      }
      await prisma.productImage.delete({ where: { id: image.id } });
      await deleteImageByUrl(image.url);
      res.json({ message: 'Image deleted' });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id/images/:imageId/primary',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const image = await prisma.productImage.findFirst({
        where: { id: req.params.imageId, productId: req.params.id },
      });
      if (!image) {
        return res.status(404).json({ error: 'Image not found' });
      }

      await prisma.$transaction([
        prisma.productImage.updateMany({
          where: { productId: req.params.id },
          data: { isPrimary: false },
        }),
        prisma.productImage.update({
          where: { id: image.id },
          data: { isPrimary: true },
        }),
      ]);

      res.json({ message: 'Primary image updated' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
