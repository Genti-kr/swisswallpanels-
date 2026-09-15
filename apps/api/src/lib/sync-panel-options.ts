import { prisma } from './prisma';
import { mapProductVariant } from './mappers';
import {
  panelOptionNameJson,
  isPanelOptionVariant,
  syncPanelOptionsSchema,
} from './validators/product-variant';
import { z } from 'zod';

type PanelOption = z.infer<typeof syncPanelOptionsSchema>['options'][number];

async function uniquePanelOptionSku(
  productSku: string,
  optionIndex: number,
  thicknessMm: number
): Promise<string> {
  const base = `${productSku}-OPT${optionIndex}-${thicknessMm}`
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .toUpperCase();
  let candidate = base;
  let n = 0;
  while (await prisma.productVariant.findUnique({ where: { sku: candidate } })) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

export async function syncPanelOptionsForProduct(productId: string, options: PanelOption[]) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new Error('Product not found');
  }

  const siblings = await prisma.productVariant.findMany({ where: { productId: product.id } });
  const panelVariants = siblings.filter((v) => isPanelOptionVariant(v.attributes));

  await prisma.$transaction([
    ...panelVariants.map((v) => prisma.productVariant.delete({ where: { id: v.id } })),
  ]);

  const created = [];
  for (const opt of options) {
    const sku = await uniquePanelOptionSku(product.sku, opt.optionIndex, opt.thickness_mm);
    const variant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku,
        nameJson: panelOptionNameJson(opt.optionIndex, opt.thickness_mm),
        priceChf: opt.priceChf,
        stockQuantity: 0,
        attributes: {
          type: 'panel_option',
          optionIndex: opt.optionIndex,
          thickness_mm: opt.thickness_mm,
          width_mm: opt.width_mm,
          height_mm: opt.height_mm,
        },
        isActive: true,
      },
    });
    created.push(mapProductVariant(variant));
  }

  const priorSpecs =
    typeof product.specsJson === 'object' && product.specsJson !== null
      ? (product.specsJson as Record<string, unknown>)
      : {};

  await prisma.product.update({
    where: { id: product.id },
    data: {
      priceChf: Math.min(...options.map((o) => o.priceChf)),
      specsJson: {
        ...priorSpecs,
        thickness_mm: options[0].thickness_mm,
        width_mm: options[0].width_mm,
        height_mm: options[0].height_mm,
        panelOptions: options.map((o) => ({
          optionIndex: o.optionIndex,
          thickness_mm: o.thickness_mm,
          width_mm: o.width_mm,
          height_mm: o.height_mm,
          priceChf: o.priceChf,
        })),
      },
    },
  });

  return created;
}
