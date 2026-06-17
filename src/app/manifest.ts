import { MetadataRoute } from 'next';
import {
  PWA_APPLE_TOUCH_ICON,
  PWA_BRAND_ICON,
  PWA_BRAND_ICON_512,
  PWA_MANIFEST_BACKGROUND,
  PWA_MANIFEST_THEME,
} from '@/lib/pwa-assets';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BLACKANDBREW',
    short_name: 'BLACKANDBREW',
    description: 'ระบบบริหารจัดการร้านกาแฟ BLACKANDBREW',
    id: '/',
    scope: '/',
    start_url: '/',
    display: 'standalone',
    background_color: PWA_MANIFEST_BACKGROUND,
    theme_color: PWA_MANIFEST_THEME,
    categories: ['business', 'productivity'],
    icons: [
      {
        src: PWA_BRAND_ICON,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: PWA_APPLE_TOUCH_ICON,
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: PWA_BRAND_ICON_512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
