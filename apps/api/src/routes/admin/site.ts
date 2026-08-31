import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { processAndUploadImage, deleteImageByUrl } from '../../services/storage';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const multilingualSchema = z.object({
  de: z.string().optional(),
  fr: z.string().optional(),
  en: z.string().optional(),
  sq: z.string().optional(),
});

function mapSiteImage(image: {
  id: string;
  section: string;
  url: string;
  altJson: unknown;
  sortOrder: number;
  isActive: boolean;
}) {
  return {
    id: image.id,
    section: image.section,
    url: image.url,
    altJson: image.altJson,
    sortOrder: image.sortOrder,
    isActive: image.isActive,
  };
}

router.use(requireAuth(['ADMIN', 'SUPERADMIN']));

router.get('/images', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const images = await prisma.siteImage.findMany({
      orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }],
    });
    res.json({ items: images.map(mapSiteImage) });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/images',
  upload.single('image'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const section = req.body.section;
      if (section !== 'GALLERY' && section !== 'ABOUT') {
        return res.status(400).json({ error: 'Section must be GALLERY or ABOUT' });
      }

      if (section === 'ABOUT') {
        const existing = await prisma.siteImage.findMany({ where: { section: 'ABOUT' } });
        for (const img of existing) {
          await prisma.siteImage.delete({ where: { id: img.id } });
          await deleteImageByUrl(img.url);
        }
      }

      const url = await processAndUploadImage(req.file.buffer, req.file.originalname, 'site');
      const imageCount = await prisma.siteImage.count({ where: { section } });

      let altJson = null;
      if (req.body.altJson) {
        try {
          altJson = multilingualSchema.parse(JSON.parse(req.body.altJson));
        } catch {
          altJson = null;
        }
      }

      const image = await prisma.siteImage.create({
        data: {
          section,
          url,
          altJson: altJson === null ? Prisma.JsonNull : altJson,
          sortOrder: imageCount,
        },
      });

      res.status(201).json({ image: mapSiteImage(image) });
    } catch (error) {
      next(error);
    }
  }
);

router.patch('/images/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = z
      .object({
        sortOrder: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
        altJson: multilingualSchema.optional().nullable(),
      })
      .parse(req.body);

    const updateData: Prisma.SiteImageUpdateInput = {};
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.altJson !== undefined) {
      updateData.altJson = data.altJson === null ? Prisma.JsonNull : data.altJson;
    }

    const image = await prisma.siteImage.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({ image: mapSiteImage(image) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    next(error);
  }
});

router.delete(
  '/images/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const image = await prisma.siteImage.findUnique({ where: { id: req.params.id } });
      if (!image) {
        return res.status(404).json({ error: 'Image not found' });
      }

      await prisma.siteImage.delete({ where: { id: image.id } });
      await deleteImageByUrl(image.url);
      res.json({ message: 'Image deleted' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
