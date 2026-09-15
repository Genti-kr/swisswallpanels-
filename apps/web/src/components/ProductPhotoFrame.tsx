'use client';

import { useState } from 'react';
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

const frameByVariant = {
  card: 'aspect-[4/3] rounded-xl p-4 sm:p-5',
  detail: 'aspect-[4/5] sm:aspect-[3/4] lg:aspect-[4/5] w-full min-h-[300px] max-h-[min(78vh,680px)] rounded-2xl p-6 sm:p-8 lg:p-10',
  thumb: 'aspect-square rounded-xl p-1.5',
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
  const initial = resolveMediaUrl(src) || PRODUCT_IMAGE_FALLBACK;
  const [url, setUrl] = useState(initial);

  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#FAFAF8] via-[#F6F4F0] to-[#ECE8E1] border border-zinc-200/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ${frameByVariant[variant]} ${className}`}
    >
      <img
        src={url}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`max-w-[94%] max-h-[94%] w-auto h-auto object-contain drop-shadow-[0_8px_24px_rgba(26,26,26,0.12)] ${hoverZoom ? 'transition-transform duration-500 ease-out group-hover:scale-[1.04]' : ''} ${imageClassName}`}
        onError={() => {
          if (url !== PRODUCT_IMAGE_FALLBACK) setUrl(PRODUCT_IMAGE_FALLBACK);
        }}
      />
    </div>
  );
}
