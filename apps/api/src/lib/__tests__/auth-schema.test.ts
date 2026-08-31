import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '../validators/auth';
import { productSchema as adminProductSchema } from '../validators/product';

describe('auth schemas', () => {
  it('accepts valid registration payload', () => {
    const result = registerSchema.safeParse({
      email: 'User@Example.com',
      password: 'SecurePass123!',
      name: 'Test User',
      preferredLanguage: 'DE',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('rejects weak registration passwords', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
      name: 'Test User',
    });

    expect(result.success).toBe(false);
  });

  it('accepts valid login payload', () => {
    const result = loginSchema.safeParse({
      email: 'admin@swisswallpanels.ch',
      password: 'Admin123!',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid login email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'Admin123!',
    });

    expect(result.success).toBe(false);
  });
});

describe('admin product schema', () => {
  const validProduct = {
    slug: 'test-panel',
    sku: 'SKU-001',
    categoryId: 'cat-1',
    nameJson: { de: 'Test', fr: 'Test', en: 'Test', sq: 'Test' },
    descJson: { de: 'Desc', fr: 'Desc', en: 'Desc', sq: 'Desc' },
    priceChf: 99.9,
    priceBtwChf: 107.99,
  };

  it('accepts valid admin product input', () => {
    expect(adminProductSchema.safeParse(validProduct).success).toBe(true);
  });

  it('rejects product without multilingual names', () => {
    const result = adminProductSchema.safeParse({
      ...validProduct,
      nameJson: { de: 'Only DE', fr: '', en: 'Test', sq: 'Test' },
    });

    expect(result.success).toBe(false);
  });
});
