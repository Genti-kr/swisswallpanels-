import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getConsentLogSalt } from '../lib/secrets';
import { contactLimiter } from '../middleware/rateLimit';

const router = Router();

function hashIp(ip: string): string {
  const salt = getConsentLogSalt();
  return crypto.createHash('sha256').update(`${ip}:${salt}`).digest('hex');
}

const consentSchema = z.object({
  consentId: z.string().min(8).max(64),
  necessary: z.boolean().optional(),
  analytics: z.boolean().optional(),
  marketing: z.boolean().optional(),
  locale: z.string().max(10).optional(),
}).strict();

router.post('/', contactLimiter, async (req, res) => {
  try {
    const parsed = consentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid consent payload' });
    }

    const { consentId, necessary, analytics, marketing, locale } = parsed.data;

    const forwarded = req.headers['x-forwarded-for'];
    const rawIp =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.socket.remoteAddress || 'unknown';

    await prisma.consentLog.create({
      data: {
        consentId,
        necessary: necessary !== false,
        analytics: Boolean(analytics),
        marketing: Boolean(marketing),
        ipHash: hashIp(rawIp),
        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
        locale: locale ? locale.slice(0, 10) : null,
      },
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Consent log error:', err);
    res.status(500).json({ error: 'Failed to record consent' });
  }
});

export default router;
