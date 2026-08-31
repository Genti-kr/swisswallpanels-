/**
 * Normalize uploaded image URLs so they always resolve from site root (/uploads/...)
 * regardless of locale prefix or stored host.
 */
export const PRODUCT_IMAGE_FALLBACK = '/Enhancing-Wood-Panel-Walls.webp';

export function resolveMediaUrl(
  url: string | null | undefined,
  options?: { fallback?: string }
): string {
  const fallback = options?.fallback ?? PRODUCT_IMAGE_FALLBACK;
  if (!url) return fallback;

  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith('/uploads/')) {
        return parsed.pathname;
      }
      return url;
    } catch {
      return url;
    }
  }

  if (url.startsWith('/uploads/')) {
    return url;
  }

  if (url.startsWith('uploads/')) {
    return `/${url}`;
  }

  const localeUploadMatch = url.match(/^\/[a-z]{2}\/uploads\/(.+)$/);
  if (localeUploadMatch) {
    return `/uploads/${localeUploadMatch[1]}`;
  }

  return url;
}
