import { z } from 'zod';
import { syncPanelOptionsForProduct } from './sync-panel-options';
import { isPanelOptionVariant, syncPanelOptionsSchema } from './validators/product-variant';

type ProductWithVariants = {
  id: string;
  priceChf: { toNumber?: () => number } | number;
  specsJson: unknown;
  variants: { attributes: unknown }[];
};

function toPriceChf(value: ProductWithVariants['priceChf']): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return Number(value);
}

export function panelOptionsFromSpecsJson(
  specsJson: unknown,
  fallbackPriceChf: number
): z.infer<typeof syncPanelOptionsSchema>['options'] | null {
  if (!specsJson || typeof specsJson !== 'object') return null;
  const specs = specsJson as Record<string, unknown>;

  const stored = specs.panelOptions;
  if (Array.isArray(stored) && stored.length > 0) {
    return syncPanelOptionsSchema.parse({ options: stored }).options;
  }

  const thickness = specs.thickness_mm;
  const width = specs.width_mm;
  const height = specs.height_mm;
  if (
    typeof thickness === 'number' &&
    typeof width === 'number' &&
    typeof height === 'number' &&
    thickness > 0 &&
    width > 0 &&
    height > 0
  ) {
    return [
      {
        optionIndex: 1,
        thickness_mm: thickness,
        width_mm: width,
        height_mm: height,
        priceChf: fallbackPriceChf,
      },
    ];
  }

  return null;
}

/** Creates DB variants when missing but specsJson (or panelOptions) has thickness data. */
export async function ensurePanelVariantsForProduct(product: ProductWithVariants): Promise<boolean> {
  const hasPanelVariants = product.variants.some((v) => isPanelOptionVariant(v.attributes));
  if (hasPanelVariants) return false;

  const options = panelOptionsFromSpecsJson(product.specsJson, toPriceChf(product.priceChf));
  if (!options?.length) return false;

  await syncPanelOptionsForProduct(product.id, options);
  return true;
}
