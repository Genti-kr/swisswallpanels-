import { CartItemDTO, ProductDTO, ProductVariantDTO } from '@swisswall/types';

export type PanelOptionAttributes = {
  type?: string;
  optionIndex?: number;
  thickness_mm?: number;
  width_mm?: number;
  height_mm?: number;
  color?: string;
};

type StoredPanelOption = {
  optionIndex: 1 | 2;
  thickness_mm: number;
  width_mm: number;
  height_mm: number;
  priceChf: number;
};

function panelVariantsFromSpecsJson(product: ProductDTO): ProductVariantDTO[] {
  const specs = product.specsJson as { panelOptions?: StoredPanelOption[] } | null;
  const stored = specs?.panelOptions;
  if (!stored?.length) return [];

  return stored
    .filter((o) => o.optionIndex === 1 || o.optionIndex === 2)
    .sort((a, b) => a.optionIndex - b.optionIndex)
    .map((o) => ({
      id: `${product.id}-panel-${o.optionIndex}`,
      sku: `${product.sku}-OPT${o.optionIndex}`,
      nameJson: product.nameJson,
      priceChf: o.priceChf,
      stockQuantity: 0,
      isActive: true,
      attributes: {
        type: 'panel_option',
        optionIndex: o.optionIndex,
        thickness_mm: o.thickness_mm,
        width_mm: o.width_mm,
        height_mm: o.height_mm,
      },
    }));
}

export function getPanelOptionVariants(product: ProductDTO): ProductVariantDTO[] {
  const fromDb = product.variants
    .filter((v) => v.isActive)
    .filter((v) => {
      const a = v.attributes as PanelOptionAttributes;
      if (a.color) return false;
      return (
        a.type === 'panel_option' ||
        a.type === 'thickness' ||
        a.optionIndex === 1 ||
        a.optionIndex === 2
      );
    })
    .sort(
      (a, b) =>
        Number((a.attributes as PanelOptionAttributes).optionIndex ?? 0) -
        Number((b.attributes as PanelOptionAttributes).optionIndex ?? 0)
    );

  if (fromDb.length > 0) return fromDb;

  const fromSpecs = panelVariantsFromSpecsJson(product);
  if (fromSpecs.length > 0) return fromSpecs;

  const specs = product.specsJson as PanelOptionAttributes | null;
  if (specs?.thickness_mm && specs?.width_mm && specs?.height_mm) {
    return [
      {
        id: `${product.id}-panel-1`,
        sku: `${product.sku}-OPT1`,
        nameJson: product.nameJson,
        priceChf: product.priceChf,
        stockQuantity: 0,
        isActive: true,
        attributes: {
          type: 'panel_option',
          optionIndex: 1,
          thickness_mm: specs.thickness_mm,
          width_mm: specs.width_mm,
          height_mm: specs.height_mm,
        },
      },
    ];
  }

  return [];
}

/** @deprecated */
export function getThicknessVariants(product: ProductDTO): ProductVariantDTO[] {
  return getPanelOptionVariants(product);
}

export function resolveProductVariant(
  product: ProductDTO,
  options: { colorCode?: string | null; optionIndex?: number | null }
): ProductVariantDTO | null {
  const { colorCode, optionIndex } = options;
  let pool = product.variants.filter((v) => v.isActive);

  const panelOptions = getPanelOptionVariants(product);
  const hasPanelOptions = panelOptions.length > 0;
  const hasColorOptions = pool.some((v) => (v.attributes as PanelOptionAttributes).color);

  if (hasPanelOptions) {
    if (optionIndex == null) return null;
    const match = panelOptions.find(
      (v) => (v.attributes as PanelOptionAttributes).optionIndex === optionIndex
    );
    if (match) return match;
    pool = pool.filter(
      (v) => (v.attributes as PanelOptionAttributes).optionIndex === optionIndex
    );
  } else {
    pool = pool.filter((v) => !(v.attributes as PanelOptionAttributes).optionIndex);
  }

  if (hasColorOptions && colorCode) {
    pool = pool.filter((v) => (v.attributes as PanelOptionAttributes).color === colorCode);
  } else if (hasColorOptions) {
    pool = pool.filter((v) => !(v.attributes as PanelOptionAttributes).color);
  }

  return pool[0] ?? null;
}

export function getCartItemUnitPrice(item: CartItemDTO): number {
  if (!item.variant) return item.product.priceChf;
  const a = item.variant.attributes as PanelOptionAttributes;
  if (a.color) return item.variant.priceChf;
  if (
    a.type === 'panel_option' ||
    a.type === 'thickness' ||
    a.optionIndex === 1 ||
    a.optionIndex === 2
  ) {
    return item.variant.priceChf;
  }
  return item.product.priceChf;
}

export function panelOptionFromSpecs(product: ProductDTO, optionIndex: 1 | 2) {
  const specs = product.specsJson as {
    thickness_mm?: number;
    width_mm?: number;
    height_mm?: number;
  } | null;
  if (optionIndex !== 1 || !specs) return null;
  return {
    optionIndex: 1 as const,
    thickness_mm: specs.thickness_mm ?? 0,
    width_mm: specs.width_mm ?? 0,
    height_mm: specs.height_mm ?? 0,
    priceChf: product.priceChf,
  };
}
