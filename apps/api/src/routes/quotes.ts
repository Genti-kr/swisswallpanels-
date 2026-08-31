import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { emailService } from '../services/email';
import { generateQuoteNumber } from '../lib/swiss';
import { quoteLimiter } from '../middleware/rateLimit';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const quoteSchema = z.object({
  contactName: z.string().min(2).max(100).trim(),
  contactEmail: z.string().email().max(255).trim().toLowerCase(),
  contactPhone: z.string().max(30).optional().nullable(),
  company: z.string().max(200).optional().nullable(),
  projectDesc: z.string().min(5).max(5000).trim(),
  productId: z.string().optional(),
  productName: z.string().min(1),
  quantity: z.number().int().min(1).max(10000),
  estimatedTotalChf: z.number().optional(),
  language: z.enum(['de', 'fr', 'en', 'sq']).default('de'),
});

router.post('/', quoteLimiter, optionalAuth(), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = quoteSchema.parse(req.body);
    const quoteNumber = await generateQuoteNumber();

    const descParts = [data.projectDesc];
    if (data.estimatedTotalChf) {
      descParts.push(`Estimated total: CHF ${data.estimatedTotalChf.toFixed(2)}`);
    }

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        userId: req.user?.id || null,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone || null,
        company: data.company || null,
        projectDesc: descParts.join('\n\n'),
        items: {
          create: [
            {
              productId: data.productId || null,
              productName: data.productName,
              quantity: data.quantity,
              note: data.estimatedTotalChf
                ? `Estimated CHF ${data.estimatedTotalChf.toFixed(2)}`
                : null,
            },
          ],
        },
      },
      include: { items: true },
    });

    await emailService.sendQuoteReceived({
      quoteNumber: quote.quoteNumber,
      contactName: quote.contactName,
      contactEmail: quote.contactEmail,
      contactPhone: quote.contactPhone,
      company: quote.company,
      projectDesc: quote.projectDesc,
      roomDimensions: null,
      items: quote.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        note: item.note,
      })),
    });

    res.status(201).json({
      success: true,
      quoteNumber: quote.quoteNumber,
      message: 'Quote request received',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    next(error);
  }
});

export default router;
