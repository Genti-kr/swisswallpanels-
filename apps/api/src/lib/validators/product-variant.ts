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

export function thicknessNameJson(mm: number) {
  const label = `${mm} mm`;
  return { de: label, fr: label, en: label, sq: label };
}

export function isThicknessVariant(attributes: unknown): boolean {
  if (!attributes || typeof attributes !== 'object') return false;
  const a = attributes as { type?: string; thickness_mm?: number; color?: string };
  if (a.color) return false;
  return a.type === 'thickness' || typeof a.thickness_mm === 'number';
}
