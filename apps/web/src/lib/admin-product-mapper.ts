import {
  CategoryDTO,
  MultilingualText,
  ProductDTO,
  ProductImageDTO,
  ProductVariantDTO,
} from '@swisswall/types';
import { Decimal } from '@prisma/client/runtime/library';

function toNumber(value: Decimal | number): number {
  return typeof value === 'number' ? value : Number(value);
}

function toMultilingualText(json: unknown): MultilingualText {
  const obj = json as MultilingualText;
  return {
    de: obj.de || '',
    fr: obj.fr || '',
    en: obj.en || '',
    sq: obj.sq || '',
  };
}

function mapProductImage(image: {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}): ProductImageDTO {
  return {
    id: image.id,
    url: image.url,
    isPrimary: image.isPrimary,
    sortOrder: image.sortOrder,
  };
}

function mapProductVariant(variant: {
  id: string;
  nameJson: unknown;
  sku: string;
  priceChf: Decimal;
  stockQuantity: number;
  attributes: unknown;
  isActive: boolean;
}): ProductVariantDTO {
  return {
    id: variant.id,
    nameJson: toMultilingualText(variant.nameJson),
    sku: variant.sku,
    priceChf: toNumber(variant.priceChf),
    stockQuantity: variant.stockQuantity,
    attributes: (variant.attributes as Record<string, unknown>) || {},
    isActive: variant.isActive,
  };
}

export function mapCategoryForAdmin(category: {
  id: string;
  slug: string;
  nameJson: unknown;
  descJson?: unknown | null;
  imageUrl?: string | null;
  parentId?: string | null;
}): CategoryDTO {
  return {
    id: category.id,
    slug: category.slug,
    nameJson: toMultilingualText(category.nameJson),
    descJson: category.descJson ? toMultilingualText(category.descJson) : null,
    imageUrl: category.imageUrl ?? null,
    parentId: category.parentId ?? null,
    children: [],
  };
}

export function mapProductForAdmin(product: {
  id: string;
  slug: string;
  sku: string;
  nameJson: unknown;
  descJson: unknown;
  specsJson: unknown;
  acousticRating: number | null;
  fireRatingClass: string | null;
  material: string | null;
  priceChf: Decimal;
  priceBtwChf: Decimal;
  vatRate: Decimal;
  stockQuantity: number;
  isFeatured: boolean;
  isActive: boolean;
  categoryId: string;
  images?: { id: string; url: string; isPrimary: boolean; sortOrder: number }[];
  variants?: Parameters<typeof mapProductVariant>[0][];
  category?: Parameters<typeof mapCategoryForAdmin>[0];
}): ProductDTO {
  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    nameJson: toMultilingualText(product.nameJson),
    descJson: toMultilingualText(product.descJson),
    specsJson: product.specsJson as ProductDTO['specsJson'],
    acousticRating: product.acousticRating,
    fireRatingClass: product.fireRatingClass,
    material: product.material,
    priceChf: toNumber(product.priceChf),
    priceBtwChf: toNumber(product.priceBtwChf),
    vatRate: toNumber(product.vatRate),
    stockQuantity: product.stockQuantity,
    isFeatured: product.isFeatured,
    isActive: product.isActive,
    categoryId: product.categoryId,
    category: product.category ? mapCategoryForAdmin(product.category) : undefined,
    images: (product.images || []).map(mapProductImage),
    variants: (product.variants || []).map(mapProductVariant),
  };
}
