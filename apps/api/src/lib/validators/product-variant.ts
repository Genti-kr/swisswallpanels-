import { z } from 'zod';

export const thicknessVariantSchema = z.object({
  thickness_mm: z.number().int().positive(),
  priceChf: z.number().positive(),
  stockQuantity: z.number().int().min(0).default(0),
});

export const thicknessVariantUpdateSchema = z.object({
  thickness_mm: z.number().int().positive().optional(),
  priceChf: z.number().positive().optional(),
  stockQuantity: z.number().int().min(0).optional(),
});

export const panelOptionInputSchema = z.object({
  optionIndex: z.union([z.literal(1), z.literal(2)]),
  thickness_mm: z.number().int().positive(),
  width_mm: z.number().int().positive(),
  height_mm: z.number().int().positive(),
  priceChf: z.number().positive(),
});

export const syncPanelOptionsSchema = z.object({
  options: z.array(panelOptionInputSchema).min(1).max(2),
});

export function thicknessNameJson(mm: number) {
  const label = `${mm} mm`;
  return { de: label, fr: label, en: label, sq: label };
}

export function panelOptionNameJson(optionIndex: number, thickness_mm: number) {
  const label = `Option ${optionIndex} — ${thickness_mm} mm`;
  return { de: label, fr: label, en: label, sq: `Opsioni ${optionIndex} — ${thickness_mm} mm` };
}

export function isPanelOptionVariant(attributes: unknown): boolean {
  if (!attributes || typeof attributes !== 'object') return false;
  const a = attributes as { type?: string; color?: string; optionIndex?: number };
  if (a.color) return false;
  return (
    a.type === 'panel_option' ||
    a.type === 'thickness' ||
    a.optionIndex === 1 ||
    a.optionIndex === 2
  );
}

/** @deprecated use isPanelOptionVariant */
export function isThicknessVariant(attributes: unknown): boolean {
  return isPanelOptionVariant(attributes);
}
