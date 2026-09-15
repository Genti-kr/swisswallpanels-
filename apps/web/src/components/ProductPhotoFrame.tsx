'use client';

import { useEffect, useState } from 'react';
import { PRODUCT_IMAGE_FALLBACK, resolveMediaUrl } from '@/lib/media-url';

type ProductPhotoFrameProps = {
  src: string | null | undefined;
  alt: string;
  variant?: 'card' | 'detail' | 'thumb';
  className?: string;
  imageClassName?: string;
  hoverZoom?: boolean;
  priority?: boolean;
};

const outerShell: Record<NonNullable<ProductPhotoFrameProps['variant']>, string> = {
  card: 'aspect-[4/3] w-full rounded-xl',
  detail: 'aspect-[4/3] w-full rounded-2xl sm:aspect-[5/4] lg:aspect-[4/3]',
  thumb: 'aspect-square w-full h-full min-h-0 rounded-lg',
};

const insetPad: Record<NonNullable<ProductPhotoFrameProps['variant']>, string> = {
  card: 'inset-2 sm:inset-2.5',
  detail: 'inset-3 sm:inset-4',
  thumb: 'inset-1',
};

export function ProductPhotoFrame({
  src,
  alt,
  variant = 'card',
  className = '',
  imageClassName = '',
  hoverZoom = false,
  priority = false,
}: ProductPhotoFrameProps) {
  const resolved = resolveMediaUrl(src) || PRODUCT_IMAGE_FALLBACK;
  const [url, setUrl] = useState(resolved);

  useEffect(() => {
    setUrl(resolveMediaUrl(src) || PRODUCT_IMAGE_FALLBACK);
  }, [src]);

  return (
    <div
      className={`relative overflow-hidden border border-zinc-200/70 bg-[#F3F1EC] shadow-sm ${outerShell[variant]} ${className}`}
    >
      <div
        className={`absolute ${insetPad[variant]} flex items-center justify-center rounded-lg bg-white border border-zinc-100/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)]`}
      >
        <img
          src={url}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={`block w-full h-full object-contain object-center ${hoverZoom ? 'transition-transform duration-500 ease-out group-hover:scale-[1.03]' : ''} ${imageClassName}`}
          onError={() => {
            if (url !== PRODUCT_IMAGE_FALLBACK) setUrl(PRODUCT_IMAGE_FALLBACK);
          }}
        />
      </div>
    </div>
  );
}
