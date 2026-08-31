import { Role } from '@prisma/client';

export type AppRole = 'USER' | 'ADMIN' | 'SUPERADMIN';

export function isSuperAdmin(role: string | undefined): boolean {
  return role === 'SUPERADMIN';
}

export function isAdmin(role: string | undefined): boolean {
  return role === 'ADMIN' || role === 'SUPERADMIN';
}

export function isUser(role: string | undefined): boolean {
  return role === 'USER';
}

export function canManageUsers(role: string | undefined): boolean {
  return isAdmin(role);
}

export function canChangeUserRole(actorRole: string | undefined, targetRole: string): boolean {
  if (!isSuperAdmin(actorRole)) return false;
  if (targetRole === 'SUPERADMIN') return false;
  return true;
}

export function canViewAdminAccounts(role: string | undefined): boolean {
  return isSuperAdmin(role);
}

export function canManageFinance(role: string | undefined): boolean {
  return isSuperAdmin(role);
}

export function canManageSettings(role: string | undefined): boolean {
  return isSuperAdmin(role);
}

export function canManageAdmins(role: string | undefined): boolean {
  return isSuperAdmin(role);
}

export function filterVisibleUsers<T extends { role: Role | string }>(
  actorRole: string | undefined,
  users: T[]
): T[] {
  if (canViewAdminAccounts(actorRole)) return users;
  return users.filter((u) => u.role === 'USER');
}
