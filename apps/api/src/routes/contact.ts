import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { emailService } from '../services/email';
import { contactLimiter } from '../middleware/rateLimit';

const router = Router();

const contactSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().max(255).trim().toLowerCase(),
  phone: z.string().max(30).optional().nullable(),
  subject: z.string().min(3).max(200).trim(),
  message: z.string().min(10).max(5000).trim(),
  language: z.enum(['de', 'fr', 'en', 'sq']).default('de'),
});

router.post('/', contactLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = contactSchema.parse(req.body);
    const language = data.language.toUpperCase() as 'DE' | 'FR' | 'EN' | 'SQ';

    await prisma.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        subject: data.subject,
        message: data.message,
        language,
      },
    });

    await emailService.sendContactAutoReply({
      name: data.name,
      email: data.email,
      phone: data.phone,
      subject: data.subject,
      message: data.message,
    });

    await emailService.sendContactAdminNotification({
      name: data.name,
      email: data.email,
      phone: data.phone,
      subject: data.subject,
      message: data.message,
    });

    res.status(201).json({ success: true, message: 'Message received' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    next(error);
  }
});

export default router;
