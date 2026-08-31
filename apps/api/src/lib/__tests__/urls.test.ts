import { afterEach, describe, expect, it } from 'vitest';
import { frontendPath, getApiUrl, getFrontendUrl } from '../urls';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('api urls', () => {
  it('returns dev API URL when not in production', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.API_URL;
    expect(getApiUrl()).toBe('http://localhost:3001');
  });

  it('throws in production without API_URL', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.API_URL;
    expect(() => getApiUrl()).toThrow('API_URL must be set in production');
  });

  it('normalizes configured frontend URL', () => {
    process.env.NODE_ENV = 'development';
    process.env.FRONTEND_URL = 'http://localhost:3000/';
    expect(getFrontendUrl()).toBe('http://localhost:3000');
    expect(frontendPath('/de/login')).toBe('http://localhost:3000/de/login');
  });
});
