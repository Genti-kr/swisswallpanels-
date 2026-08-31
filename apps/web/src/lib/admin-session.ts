import { Session } from 'next-auth';
import { prisma } from './prisma';
import { isAdminRole } from './user-mapper';

export type AdminSessionUser = {
  id: string;
  email: string;
  role: string;
};

export async function getAdminSessionUser(
  session: Session | null
): Promise<AdminSessionUser | null> {
  if (!session?.user?.id || !session.user.role) {
    return null;
  }

  if (!isAdminRole(session.user.role)) {
    return null;
  }

  let email = session.user.email;

  if (!email) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });
    email = dbUser?.email;
  }

  if (!email) {
    return null;
  }

  return {
    id: session.user.id,
    email,
    role: session.user.role,
  };
}
