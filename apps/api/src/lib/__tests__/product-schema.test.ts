import { describe, expect, it } from 'vitest';
import { productSchema } from '../validators/product';

const validProduct = {
  slug: 'test-panel',
  sku: 'SWP-TEST-001',
  categoryId: 'cat_123',
  nameJson: { de: 'Test', fr: 'Test', en: 'Test', sq: 'Test' },
  descJson: { de: 'Desc', fr: 'Desc', en: 'Desc', sq: 'Desc' },
  priceChf: 99.9,
  priceBtwChf: 89.9,
};

describe('productSchema', () => {
  it('accepts valid product input', () => {
    const parsed = productSchema.parse(validProduct);
    expect(parsed.slug).toBe('test-panel');
    expect(parsed.isActive).toBe(true);
  });

  it('rejects missing multilingual fields', () => {
    expect(() =>
      productSchema.parse({
        ...validProduct,
        nameJson: { de: 'Only DE', fr: '', en: 'Test', sq: 'Test' },
      })
    ).toThrow();
  });

  it('rejects non-positive prices', () => {
    expect(() =>
      productSchema.parse({
        ...validProduct,
        priceChf: 0,
      })
    ).toThrow();
  });

  it('allows partial update via partial schema', () => {
    const partial = productSchema.partial().parse({ stockQuantity: 10 });
    expect(partial.stockQuantity).toBe(10);
  });
});
