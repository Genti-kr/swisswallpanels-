import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { emailService } from '../services/email';
import { newsletterLimiter } from '../middleware/rateLimit';

const router = Router();

const subscribeSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  language: z.enum(['de', 'fr', 'en', 'sq']).default('de'),
});

router.post('/subscribe', newsletterLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = subscribeSchema.parse(req.body);
    const language = data.language.toUpperCase() as 'DE' | 'FR' | 'EN' | 'SQ';

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: data.email },
    });

    if (existing && !existing.unsubscribedAt) {
      return res.json({ success: true, message: 'Already subscribed' });
    }

    if (existing) {
      await prisma.newsletterSubscriber.update({
        where: { email: data.email },
        data: {
          language,
          subscribedAt: new Date(),
          confirmedAt: new Date(),
          unsubscribedAt: null,
        },
      });
    } else {
      await prisma.newsletterSubscriber.create({
        data: {
          email: data.email,
          language,
          confirmedAt: new Date(),
        },
      });
    }

    await emailService.sendNewsletterWelcome(data.email, data.language);

    res.status(201).json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    next(error);
  }
});

export default router;
