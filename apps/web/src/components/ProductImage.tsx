'use client';

import Image from 'next/image';
import { useState } from 'react';
import { PRODUCT_IMAGE_FALLBACK, resolveMediaUrl } from '@/lib/media-url';

type ProductImageProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
};

export function ProductImage({
  src,
  alt,
  className,
  loading = 'lazy',
  priority = false,
  width = 600,
  height = 600,
  fill = false,
  sizes = '(max-width: 768px) 100vw, 50vw',
}: ProductImageProps) {
  const [url, setUrl] = useState(() => resolveMediaUrl(src));

  const imageProps = fill
    ? { fill: true as const, sizes }
    : { width, height };

  return (
    <Image
      src={url}
      alt={alt}
      className={className}
      loading={priority ? undefined : loading}
      priority={priority}
      {...imageProps}
      onError={() => {
        if (url !== PRODUCT_IMAGE_FALLBACK) {
          setUrl(PRODUCT_IMAGE_FALLBACK);
        }
      }}
    />
  );
}
