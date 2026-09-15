import { CartItemDTO, ProductDTO, ProductVariantDTO } from '@swisswall/types';

export function getThicknessVariants(product: ProductDTO): ProductVariantDTO[] {
  return product.variants
    .filter((v) => v.isActive)
    .filter((v) => {
      const a = v.attributes as { type?: string; thickness_mm?: number; color?: string };
      if (a.color) return false;
      return a.type === 'thickness' || typeof a.thickness_mm === 'number';
    })
    .sort(
      (a, b) =>
        Number((a.attributes as { thickness_mm?: number }).thickness_mm ?? 0) -
        Number((b.attributes as { thickness_mm?: number }).thickness_mm ?? 0)
    );
}

export function resolveProductVariant(
  product: ProductDTO,
  options: { colorCode?: string | null; thicknessMm?: number | null }
): ProductVariantDTO | null {
  const { colorCode, thicknessMm } = options;
  let pool = product.variants.filter((v) => v.isActive);

  const hasThicknessOptions = getThicknessVariants(product).length > 0;
  const hasColorOptions = pool.some((v) => (v.attributes as { color?: string }).color);

  if (hasThicknessOptions) {
    if (thicknessMm == null) return null;
    pool = pool.filter(
      (v) => (v.attributes as { thickness_mm?: number }).thickness_mm === thicknessMm
    );
  } else {
    pool = pool.filter((v) => (v.attributes as { thickness_mm?: number }).thickness_mm == null);
  }

  if (hasColorOptions && colorCode) {
    pool = pool.filter((v) => (v.attributes as { color?: string }).color === colorCode);
  } else if (hasColorOptions) {
    pool = pool.filter((v) => !(v.attributes as { color?: string }).color);
  }

  return pool[0] ?? null;
}

export function getCartItemUnitPrice(item: CartItemDTO): number {
  return item.variant?.priceChf ?? item.product.priceChf;
}
