import { afterEach, describe, expect, it } from 'vitest';
import { isMaintenanceBypassPath, isMaintenanceModeEnabled } from '../maintenance';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('maintenance mode', () => {
  it('is disabled by default', () => {
    delete process.env.MAINTENANCE_MODE;
    expect(isMaintenanceModeEnabled()).toBe(false);
  });

  it('is enabled when MAINTENANCE_MODE=true', () => {
    process.env.MAINTENANCE_MODE = 'true';
    expect(isMaintenanceModeEnabled()).toBe(true);
  });

  it('bypasses admin and API paths', () => {
    expect(isMaintenanceBypassPath('/admin')).toBe(true);
    expect(isMaintenanceBypassPath('/admin/orders')).toBe(true);
    expect(isMaintenanceBypassPath('/api/health')).toBe(true);
    expect(isMaintenanceBypassPath('/de/maintenance')).toBe(true);
    expect(isMaintenanceBypassPath('/de/produkte')).toBe(false);
  });
});
