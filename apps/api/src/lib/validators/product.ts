import { z } from 'zod';

export const multilingualSchema = z.object({
  de: z.string().min(1),
  fr: z.string().min(1),
  en: z.string().min(1),
  sq: z.string().min(1),
});

export const productSchema = z.object({
  slug: z.string().min(1),
  sku: z.string().min(1),
  categoryId: z.string().min(1),
  nameJson: multilingualSchema,
  descJson: multilingualSchema,
  specsJson: z.record(z.any()).default({}),
  acousticRating: z.number().min(0).max(1).optional().nullable(),
  fireRatingClass: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  priceChf: z.number().positive(),
  priceBtwChf: z.number().positive(),
  stockQuantity: z.number().int().min(0).default(0),
  lowStockAlert: z.number().int().min(0).default(5),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export type ProductInput = z.infer<typeof productSchema>;
