import { Router, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

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

router.get('/images', async (_req, res: Response, next: NextFunction) => {
  try {
    const images = await prisma.siteImage.findMany({
      where: { isActive: true },
      orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }],
    });

    const gallery = images.filter((img) => img.section === 'GALLERY').map(mapSiteImage);
    const about = images.filter((img) => img.section === 'ABOUT').map(mapSiteImage);

    res.json({ gallery, about });
  } catch (error) {
    next(error);
  }
});

export default router;
