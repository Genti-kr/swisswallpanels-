import { UserDTO } from '@swisswall/types';

export function mapUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  companyName?: string | null;
  vatNumber?: string | null;
  role: UserDTO['role'];
  preferredLanguage: UserDTO['preferredLanguage'];
  emailVerified: boolean;
  createdAt: Date;
}): UserDTO {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    companyName: user.companyName,
    vatNumber: user.vatNumber,
    role: user.role,
    preferredLanguage: user.preferredLanguage,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  };
}

export function isAdminRole(role: string | undefined): boolean {
  return role === 'ADMIN' || role === 'SUPERADMIN';
}

export function isUserRole(role: string | undefined): boolean {
  return role === 'USER';
}

export function isSuperAdminRole(role: string | undefined): boolean {
  return role === 'SUPERADMIN';
}
