/**
 * Normalize product/media URLs for browser + Next.js Image.
 * Supports: /uploads/… (API disk), products/… (R2 key), legacy full https URLs.
 */
export const PRODUCT_IMAGE_FALLBACK = '/Enhancing-Wood-Panel-Walls.webp';

function r2PublicBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

/** Turn stored R2 object key into public URL. */
export function resolveR2ObjectKey(key: string): string | null {
  const base = r2PublicBase();
  if (!base) return null;
  const clean = key.replace(/^\//, '');
  if (!clean.startsWith('products/') && !clean.startsWith('catalog/') && !clean.startsWith('site/')) {
    return null;
  }
  return `${base}/${clean}`;
}

export function resolveMediaUrl(
  url: string | null | undefined,
  options?: { fallback?: string | null }
): string {
  const fallback =
    options && 'fallback' in options ? options.fallback ?? '' : PRODUCT_IMAGE_FALLBACK;

  if (!url?.trim()) {
    return fallback ?? '';
  }

  const trimmed = url.trim();

  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  if (trimmed.startsWith('products/') || trimmed.startsWith('catalog/') || trimmed.startsWith('site/')) {
    return resolveR2ObjectKey(trimmed) ?? trimmed;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith('/uploads/')) {
        return parsed.pathname;
      }
      const productsIdx = parsed.pathname.indexOf('/products/');
      if (productsIdx >= 0) {
        const key = parsed.pathname.slice(productsIdx + 1);
        return resolveR2ObjectKey(key) ?? trimmed;
      }
      return trimmed;
    } catch {
      return trimmed;
    }
  }

  if (trimmed.startsWith('/uploads/')) {
    return trimmed;
  }

  if (trimmed.startsWith('uploads/')) {
    return `/${trimmed}`;
  }

  const localeUploadMatch = trimmed.match(/^\/[a-z]{2}\/uploads\/(.+)$/);
  if (localeUploadMatch) {
    return `/uploads/${localeUploadMatch[1]}`;
  }

  return trimmed;
}
