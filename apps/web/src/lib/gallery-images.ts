import type { SiteImageDTO } from '@swisswall/types';

export type GalleryImageItem = {
  id: string;
  src: string;
  alt: string;
};

export const FALLBACK_GALLERY_IMAGES: GalleryImageItem[] = [
  {
    id: 'fallback-1',
    src: '/Enhancing-Wood-Panel-Walls.webp',
    alt: 'Wood panel wall decoration',
  },
  { id: 'fallback-2', src: '/balsa_02.webp', alt: 'Balsa wood panels close-up' },
  { id: 'fallback-3', src: '/images.jpg', alt: 'Acoustic oak wood panels' },
  { id: 'fallback-4', src: '/imagess.jpg', alt: 'Decorative pine wood panels' },
];

export function mapGalleryImagesFromApi(
  gallery: SiteImageDTO[],
  locale: string,
  resolveUrl: (url: string) => string
): GalleryImageItem[] {
  return gallery.map((img) => ({
    id: img.id,
    src: resolveUrl(img.url),
    alt:
      (img.altJson as Record<string, string> | null)?.[locale] ||
      (img.altJson as Record<string, string> | null)?.de ||
      'Gallery image',
  }));
}
