import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import {
  processAndUploadCatalogSwatch,
  deleteImageByUrl,
} from '../../services/storage';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const multilingualSchema = z.object({
  de: z.string().min(1),
  fr: z.string().min(1),
  en: z.string().min(1),
  sq: z.string().min(1),
});

const partialMultilingualSchema = z.object({
  de: z.string().optional(),
  fr: z.string().optional(),
  en: z.string().optional(),
  sq: z.string().optional(),
});

function normalizeSwatchCode(raw: string): string {
  return raw.trim().toUpperCase();
}

function resolveSwatchNameJson(code: string, raw?: string) {
  const fallback = {
    de: code,
    fr: code,
    en: code,
    sq: code,
  };

  if (!raw) {
    return multilingualSchema.parse(fallback);
  }

  const parsed = partialMultilingualSchema.parse(JSON.parse(raw));
  return multilingualSchema.parse({
    de: parsed.de?.trim() || code,
    fr: parsed.fr?.trim() || code,
    en: parsed.en?.trim() || code,
    sq: parsed.sq?.trim() || code,
  });
}

function mapSwatch(swatch: {
  id: string;
  catalogId: string;
  code: string;
  nameJson: unknown;
  imageUrl: string;
  thumbnailUrl: string;
  sortOrder: number;
  isActive: boolean;
}) {
  return {
    id: swatch.id,
    catalogId: swatch.catalogId,
    code: swatch.code,
    nameJson: swatch.nameJson,
    imageUrl: swatch.imageUrl,
    thumbnailUrl: swatch.thumbnailUrl,
    sortOrder: swatch.sortOrder,
    isActive: swatch.isActive,
  };
}

function mapCatalog(catalog: {
  id: string;
  slug: string;
  nameJson: unknown;
  descJson: unknown;
  sortOrder: number;
  isActive: boolean;
  swatches: Parameters<typeof mapSwatch>[0][];
}) {
  return {
    id: catalog.id,
    slug: catalog.slug,
    nameJson: catalog.nameJson,
    descJson: catalog.descJson,
    sortOrder: catalog.sortOrder,
    isActive: catalog.isActive,
    swatches: catalog.swatches.sort((a, b) => a.sortOrder - b.sortOrder).map(mapSwatch),
  };
}

router.use(requireAuth(['ADMIN', 'SUPERADMIN']));

router.get('/', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const catalogs = await prisma.colorCatalog.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { swatches: { orderBy: { sortOrder: 'asc' } } },
    });
    res.json({ items: catalogs.map(mapCatalog) });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = z
      .object({
        slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
        nameJson: multilingualSchema,
        descJson: multilingualSchema,
        sortOrder: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);

    const count = await prisma.colorCatalog.count();
    const catalog = await prisma.colorCatalog.create({
      data: {
        slug: data.slug,
        nameJson: data.nameJson,
        descJson: data.descJson,
        sortOrder: data.sortOrder ?? count,
        isActive: data.isActive ?? true,
      },
      include: { swatches: true },
    });

    res.status(201).json({ catalog: mapCatalog(catalog) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    next(error);
  }
});

router.patch('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = z
      .object({
        slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/).optional(),
        nameJson: multilingualSchema.optional(),
        descJson: multilingualSchema.optional(),
        sortOrder: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);

    const catalog = await prisma.colorCatalog.update({
      where: { id: req.params.id },
      data,
      include: { swatches: { orderBy: { sortOrder: 'asc' } } },
    });

    res.json({ catalog: mapCatalog(catalog) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    next(error);
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const catalog = await prisma.colorCatalog.findUnique({
      where: { id: req.params.id },
      include: { swatches: true },
    });
    if (!catalog) {
      return res.status(404).json({ error: 'Catalog not found' });
    }

    for (const swatch of catalog.swatches) {
      await deleteImageByUrl(swatch.imageUrl);
      await deleteImageByUrl(swatch.thumbnailUrl);
    }

    await prisma.colorCatalog.delete({ where: { id: catalog.id } });
    res.json({ message: 'Catalog deleted' });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/:catalogId/swatches',
  upload.single('image'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const catalog = await prisma.colorCatalog.findUnique({ where: { id: req.params.catalogId } });
      if (!catalog) {
        return res.status(404).json({ error: 'Catalog not found' });
      }

      const code = normalizeSwatchCode(z.string().min(1).max(40).parse(req.body.code));

      const existing = await prisma.colorSwatch.findUnique({
        where: { catalogId_code: { catalogId: catalog.id, code } },
      });
      if (existing) {
        return res.status(409).json({
          error: `Color code "${code}" already exists in this catalog`,
        });
      }

      const nameJson = resolveSwatchNameJson(code, req.body.nameJson);
      const { imageUrl, thumbnailUrl } = await processAndUploadCatalogSwatch(req.file.buffer);
      const swatchCount = await prisma.colorSwatch.count({ where: { catalogId: catalog.id } });

      const swatch = await prisma.colorSwatch.create({
        data: {
          catalogId: catalog.id,
          code,
          nameJson,
          imageUrl,
          thumbnailUrl,
          sortOrder: swatchCount,
        },
      });

      res.status(201).json({ swatch: mapSwatch(swatch) });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return res.status(409).json({
          error: 'Color code already exists in this catalog',
        });
      }
      next(error);
    }
  }
);

router.patch('/swatches/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = z
      .object({
        code: z.string().min(1).max(40).optional(),
        nameJson: multilingualSchema.optional(),
        sortOrder: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);

    const swatch = await prisma.colorSwatch.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ swatch: mapSwatch(swatch) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    next(error);
  }
});

router.delete('/swatches/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const swatch = await prisma.colorSwatch.findUnique({ where: { id: req.params.id } });
    if (!swatch) {
      return res.status(404).json({ error: 'Swatch not found' });
    }

    await prisma.colorSwatch.delete({ where: { id: swatch.id } });
    await deleteImageByUrl(swatch.imageUrl);
    await deleteImageByUrl(swatch.thumbnailUrl);
    res.json({ message: 'Swatch deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
