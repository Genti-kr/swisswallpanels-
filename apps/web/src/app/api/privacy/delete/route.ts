import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { auth, signOut } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { getClientIp, verifyOrigin } from '@/lib/security';

export async function DELETE(request: Request) {
  if (!verifyOrigin(request)) {
    return new Response('Forbidden', { status: 403 });
  }

  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (role === 'ADMIN' || role === 'SUPERADMIN') {
    return NextResponse.json(
      { error: 'Admin accounts cannot be self-deleted via this endpoint' },
      { status: 403 }
    );
  }

  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent');
  const randomPassword = crypto.randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(randomPassword, 12);

  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.deleteMany({ where: { userId } });
    await tx.cartItem.deleteMany({ where: { cart: { userId } } });
    await tx.cart.deleteMany({ where: { userId } });
    await tx.wishlistItem.deleteMany({ where: { wishlist: { userId } } });
    await tx.wishlist.deleteMany({ where: { userId } });
    await tx.address.deleteMany({ where: { userId } });

    await tx.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@anonymized.local`,
        firstName: 'Deleted',
        lastName: 'User',
        phone: null,
        companyName: null,
        vatNumber: null,
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        emailVerifyToken: null,
        emailVerifyExpires: null,
        unlockToken: null,
        unlockTokenExpires: null,
        newsletterOptIn: false,
        emailVerified: false,
        isLocked: true,
      },
    });
  });

  await createAuditLog('ACCOUNT_DELETED', userId, ip, userAgent);
  await signOut({ redirect: false });

  return NextResponse.json({
    message: 'Account anonymized. Order history is retained for legal and tax obligations.',
  });
}
