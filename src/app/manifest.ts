import { MetadataRoute } from 'next';
import {
  PWA_APPLE_TOUCH_ICON,
  PWA_BRAND_ICON,
  PWA_BRAND_ICON_512,
  PWA_MANIFEST_BACKGROUND,
  PWA_MANIFEST_THEME,
} from '@/lib/pwa-assets';
import {
  PWA_APP_ID,
  PWA_DEFAULT_LOCALE,
  PWA_SCOPE,
  PWA_START_URL,
  buildManifestShortcuts,
} from '@/lib/pwa-config';

type AppManifest = MetadataRoute.Manifest & {
  handle_links?: 'preferred' | 'not-preferred' | 'auto';
};

export default function manifest(): AppManifest {
  return {
    name: 'BLACKANDBREW',
    short_name: 'BLACKANDBREW',
    description: 'ระบบบริหารจัดการร้านกาแฟ BLACKANDBREW',
    id: PWA_APP_ID,
    scope: PWA_SCOPE,
    start_url: PWA_START_URL,
    lang: PWA_DEFAULT_LOCALE,
    dir: 'ltr',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    background_color: PWA_MANIFEST_BACKGROUND,
    theme_color: PWA_MANIFEST_THEME,
    prefer_related_applications: false,
    handle_links: 'preferred',
    launch_handler: {
      client_mode: 'navigate-existing',
    },
    categories: ['business', 'productivity'],
    shortcuts: buildManifestShortcuts(),
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
