import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { mapProduct, mapProductVariant } from '../../lib/mappers';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { processAndUploadImage, deleteImageByUrl } from '../../services/storage';
import { productSchema } from '../../lib/validators/product';
import {
  thicknessVariantSchema,
  thicknessVariantUpdateSchema,
  thicknessNameJson,
  isThicknessVariant,
  syncPanelOptionsSchema,
} from '../../lib/validators/product-variant';
import { syncPanelOptionsForProduct } from '../../lib/sync-panel-options';
import {
  parseAdminProductCreateBody,
  parseAdminProductUpdateBody,
} from '../../lib/parse-admin-product-body';
import { MAX_PRODUCT_IMAGES } from '../../lib/product-images';

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
    const { data, panelOptions: panelOptionsRaw } = await parseAdminProductCreateBody(
      req.body as Record<string, unknown>
    );
    let product = await prisma.product.create({
      data,
      include: { images: true, variants: true },
    });
    if (panelOptionsRaw !== undefined) {
      const { options } = syncPanelOptionsSchema.parse({ options: panelOptionsRaw });
      await syncPanelOptionsForProduct(product.id, options);
      const refreshed = await prisma.product.findUnique({
        where: { id: product.id },
        include: { images: true, variants: true },
      });
      if (refreshed) product = refreshed;
    }
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
    const { data, panelOptions: panelOptionsRaw } = await parseAdminProductUpdateBody(
      req.body as Record<string, unknown>
    );
    let product = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: { images: { orderBy: { sortOrder: 'asc' } }, variants: true },
    });
    if (panelOptionsRaw !== undefined) {
      const { options } = syncPanelOptionsSchema.parse({ options: panelOptionsRaw });
      await syncPanelOptionsForProduct(product.id, options);
      const refreshed = await prisma.product.findUnique({
        where: { id: product.id },
        include: { images: { orderBy: { sortOrder: 'asc' } }, variants: true },
      });
      if (refreshed) product = refreshed;
    }
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

      const imageCount = await prisma.productImage.count({ where: { productId: product.id } });
      if (imageCount >= MAX_PRODUCT_IMAGES) {
        return res.status(400).json({
          error: `Maximum ${MAX_PRODUCT_IMAGES} images per product`,
        });
      }

      const url = await processAndUploadImage(req.file.buffer, req.file.originalname, 'products');
      const isPrimary = req.body.isPrimary === 'true' || req.body.isPrimary === true;

      if (isPrimary) {
        await prisma.productImage.updateMany({
          where: { productId: product.id },
          data: { isPrimary: false },
        });
      }

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

async function uniqueVariantSku(productSku: string, thicknessMm: number): Promise<string> {
  const base = `${productSku}-${thicknessMm}MM`.replace(/[^a-zA-Z0-9-]/g, '-').toUpperCase();
  let candidate = base;
  let n = 0;
  while (await prisma.productVariant.findUnique({ where: { sku: candidate } })) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

router.post('/:id/variants/thickness', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = thicknessVariantSchema.parse(req.body);
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const siblingVariants = await prisma.productVariant.findMany({
      where: { productId: product.id },
    });
    const duplicate = siblingVariants.some(
      (v) =>
        isThicknessVariant(v.attributes) &&
        (v.attributes as { thickness_mm?: number }).thickness_mm === data.thickness_mm
    );
    if (duplicate) {
      return res.status(400).json({ error: 'This thickness already exists for the product' });
    }

    const sku = await uniqueVariantSku(product.sku, data.thickness_mm);
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku,
        nameJson: thicknessNameJson(data.thickness_mm),
        priceChf: data.priceChf,
        stockQuantity: data.stockQuantity,
        attributes: { type: 'thickness', thickness_mm: data.thickness_mm },
        isActive: true,
      },
    });

    res.status(201).json({ variant: mapProductVariant(variant) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    next(error);
  }
});

router.put('/:id/variants/:variantId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = thicknessVariantUpdateSchema.parse(req.body);
    const existing = await prisma.productVariant.findFirst({
      where: { id: req.params.variantId, productId: req.params.id },
    });
    if (!existing || !isThicknessVariant(existing.attributes)) {
      return res.status(404).json({ error: 'Thickness variant not found' });
    }

    const attrs = existing.attributes as { thickness_mm: number; type: string };
    const nextMm = data.thickness_mm ?? attrs.thickness_mm;

    if (data.thickness_mm != null && data.thickness_mm !== attrs.thickness_mm) {
      const siblingVariants = await prisma.productVariant.findMany({
        where: { productId: req.params.id, id: { not: existing.id } },
      });
      const duplicate = siblingVariants.some(
        (v) =>
          isThicknessVariant(v.attributes) &&
          (v.attributes as { thickness_mm?: number }).thickness_mm === data.thickness_mm
      );
      if (duplicate) {
        return res.status(400).json({ error: 'This thickness already exists for the product' });
      }
    }

    const variant = await prisma.productVariant.update({
      where: { id: existing.id },
      data: {
        priceChf: data.priceChf,
        stockQuantity: data.stockQuantity,
        nameJson: data.thickness_mm != null ? thicknessNameJson(nextMm) : undefined,
        attributes: data.thickness_mm != null ? { type: 'thickness', thickness_mm: nextMm } : undefined,
      },
    });

    res.json({ variant: mapProductVariant(variant) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    next(error);
  }
});

router.put('/:id/panel-options', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { options } = syncPanelOptionsSchema.parse(req.body);
    const variants = await syncPanelOptionsForProduct(req.params.id, options);
    res.json({ variants });
  } catch (error) {
    if (error instanceof Error && error.message === 'Product not found') {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    next(error);
  }
});

router.delete('/:id/variants/:variantId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.productVariant.findFirst({
      where: { id: req.params.variantId, productId: req.params.id },
    });
    if (!existing || !isThicknessVariant(existing.attributes)) {
      return res.status(404).json({ error: 'Thickness variant not found' });
    }
    await prisma.productVariant.delete({ where: { id: existing.id } });
    res.json({ message: 'Variant deleted' });
  } catch (error) {
    next(error);
  }
});

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
