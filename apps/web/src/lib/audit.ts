import crypto from 'crypto';
import { prisma } from './prisma';

export async function createAuditLog(
  event: string,
  userId: string | null,
  ipStr: string,
  userAgent: string | null
) {
  const hashedIP = crypto.createHash('sha256').update(ipStr).digest('hex');
  await prisma.auditLog.create({
    data: {
      event,
      userId,
      ipAddress: hashedIP,
      userAgent: userAgent || null,
      timestamp: new Date(),
    },
  });
}
