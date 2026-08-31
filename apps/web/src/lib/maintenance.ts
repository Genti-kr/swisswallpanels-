export function isMaintenanceModeEnabled(): boolean {
  return process.env.MAINTENANCE_MODE === 'true';
}

export function isMaintenanceBypassPath(pathname: string): boolean {
  if (pathname.startsWith('/admin')) return true;
  if (pathname.startsWith('/api')) return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/uploads')) return true;
  if (pathname === '/favicon.ico') return true;
  if (pathname.endsWith('/maintenance')) return true;
  return false;
}
