import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Swiss Wall Panels',
    short_name: 'SwissWall',
    description: 'Premium acoustic and decorative wall panels for Switzerland',
    start_url: '/de',
    display: 'standalone',
    background_color: '#F8F8F6',
    theme_color: '#1A1A1A',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
