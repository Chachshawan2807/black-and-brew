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
    display_override: ['standalone', 'minimal-ui'],
    background_color: PWA_MANIFEST_BACKGROUND,
    theme_color: PWA_MANIFEST_THEME,
    orientation: 'any',
    prefer_related_applications: false,
    handle_links: 'preferred',
    launch_handler: {
      client_mode: 'navigate-existing',
    },
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
      {
        src: PWA_BRAND_ICON_512,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
