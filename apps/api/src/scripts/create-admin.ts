import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { prisma } from '../lib/prisma';

dotenv.config();

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@swisswallpanels.ch').trim().toLowerCase();
  const passwordRaw = process.env.ADMIN_SEED_PASSWORD?.trim();

  if (!passwordRaw || passwordRaw.includes('change-me')) {
    throw new Error('Set ADMIN_SEED_PASSWORD in apps/api/.env (min 12 characters, not a placeholder).');
  }
  if (passwordRaw.length < 12) {
    throw new Error('ADMIN_SEED_PASSWORD must be at least 12 characters.');
  }

  const existingAdmins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
    select: { email: true, role: true },
  });

  const existingUser = await prisma.user.findUnique({ where: { email } });
  const isExistingAdmin =
    existingUser?.role === 'ADMIN' || existingUser?.role === 'SUPERADMIN';

  if (existingAdmins.length > 0 && !isExistingAdmin) {
    throw new Error(
      `An admin already exists (${existingAdmins.map((a: { email: string }) => a.email).join(', ')}). ` +
        `Use ADMIN_EMAIL with that address to reset the password, or remove the old admin first.`
    );
  }

  const passwordHash = await bcrypt.hash(passwordRaw, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'SUPERADMIN',
      emailVerified: true,
      isLocked: false,
      failedAttempts: 0,
      emailVerifyToken: null,
      emailVerifyExpires: null,
      unlockToken: null,
      unlockTokenExpires: null,
    },
    create: {
      email,
      passwordHash,
      firstName: process.env.ADMIN_FIRST_NAME?.trim() || 'Admin',
      lastName: process.env.ADMIN_LAST_NAME?.trim() || 'Swiss Wall Panels',
      role: 'SUPERADMIN',
      emailVerified: true,
      preferredLanguage: 'DE',
      country: 'CH',
    },
  });

  await prisma.cart.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });

  await prisma.wishlist.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });

  console.log('Admin account ready.');
  console.log(`Email: ${email}`);
  console.log('Login: https://www.swisswallpanels.ch/admin/login');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
