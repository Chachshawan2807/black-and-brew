import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BLACKANDBREW',
    short_name: 'BLACKANDBREW',
    description: 'ระบบบริหารจัดการร้านกาแฟ BLACKANDBREW',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/images/notification-icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/images/notification-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
