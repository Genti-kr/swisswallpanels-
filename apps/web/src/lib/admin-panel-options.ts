import { ProductDTO } from '@swisswall/types';
import { getPanelOptionVariants, PanelOptionAttributes } from '@/lib/product-variants';

export type PanelOptionForm = {
  thickness_mm: number;
  width_mm: number;
  height_mm: number;
  priceChf: number;
};

export const defaultPanelOption = (): PanelOptionForm => ({
  thickness_mm: 12,
  width_mm: 600,
  height_mm: 2400,
  priceChf: 0,
});

export function panelOptionsFromProduct(product: ProductDTO): {
  panel1: PanelOptionForm;
  panel2: PanelOptionForm;
  panelOption2Enabled: boolean;
} {
  const variants = getPanelOptionVariants(product);
  const v1 = variants.find((v) => (v.attributes as PanelOptionAttributes).optionIndex === 1) ?? variants[0];
  const v2 = variants.find((v) => (v.attributes as PanelOptionAttributes).optionIndex === 2);

  const specs = (product.specsJson ?? {}) as {
    thickness_mm?: number;
    width_mm?: number;
    height_mm?: number;
  };

  const fromVariant = (v: (typeof variants)[0]): PanelOptionForm => {
    const a = v.attributes as PanelOptionAttributes;
    return {
      thickness_mm: a.thickness_mm ?? 12,
      width_mm: a.width_mm ?? 600,
      height_mm: a.height_mm ?? 2400,
      priceChf: v.priceChf,
    };
  };

  if (v1) {
    return {
      panel1: fromVariant(v1),
      panel2: v2 ? fromVariant(v2) : defaultPanelOption(),
      panelOption2Enabled: Boolean(v2),
    };
  }

  return {
    panel1: {
      thickness_mm: specs.thickness_mm ?? 12,
      width_mm: specs.width_mm ?? 600,
      height_mm: specs.height_mm ?? 2400,
      priceChf: product.priceChf,
    },
    panel2: defaultPanelOption(),
    panelOption2Enabled: false,
  };
}

export function buildPanelOptionsPayload(
  panel1: PanelOptionForm,
  panel2: PanelOptionForm,
  panelOption2Enabled: boolean
) {
  const options: Array<PanelOptionForm & { optionIndex: 1 | 2 }> = [
    { optionIndex: 1, ...panel1 },
  ];
  if (panelOption2Enabled) {
    options.push({ optionIndex: 2, ...panel2 });
  }
  return options;
}
