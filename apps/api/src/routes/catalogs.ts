import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

function mapSwatch(swatch: {
  id: string;
  code: string;
  nameJson: unknown;
  imageUrl: string;
  thumbnailUrl: string;
  sortOrder: number;
  isActive: boolean;
}) {
  return {
    id: swatch.id,
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
    swatches: catalog.swatches
      .filter((s) => s.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(mapSwatch),
  };
}

const router = Router();

router.get('/', async (_req, res: Response, next: NextFunction) => {
  try {
    const catalogs = await prisma.colorCatalog.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        swatches: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    res.json({ items: catalogs.map(mapCatalog) });
  } catch (error) {
    next(error);
  }
});

router.get('/:slug', async (req, res: Response, next: NextFunction) => {
  try {
    const catalog = await prisma.colorCatalog.findFirst({
      where: { slug: req.params.slug, isActive: true },
      include: {
        swatches: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!catalog) {
      return res.status(404).json({ error: 'Catalog not found' });
    }
    res.json({ catalog: mapCatalog(catalog) });
  } catch (error) {
    next(error);
  }
});

export default router;
