/**
 * Test USER (verified) — run inside API container or locally with DATABASE_URL:
 *   node scripts/ensure-test-user.mjs
 * Optional: TEST_USER_EMAIL, TEST_USER_PASSWORD
 */
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.TEST_USER_EMAIL || 'test@gmail.com').trim().toLowerCase();
  const passwordRaw = process.env.TEST_USER_PASSWORD?.trim() || 'Test-123!';

  const passwordHash = await bcrypt.hash(passwordRaw, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'USER',
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
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
      emailVerified: true,
      preferredLanguage: 'SQ',
      country: 'CH',
    },
  });

  await prisma.cart.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  await prisma.wishlist.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  console.log('Test user ready (email verified).');
  console.log(`Email: ${email}`);
  console.log('Role: USER');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
