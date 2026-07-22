/**
 * Shared PWA install + offline shell constants (manifest, service worker, tests).
 */

import { PWA_BRAND_ICON } from '@/lib/pwa-assets';

export const PWA_DEFAULT_LOCALE = 'th';
export const PWA_SCOPE = '/';
export const PWA_APP_ID = '/';
export const PWA_START_URL = `/${PWA_DEFAULT_LOCALE}?utm_source=pwa`;
export const PWA_OFFLINE_PAGE = '/offline.html';
export const PWA_SERVICE_WORKER_PATH = '/sw.js';

export type PwaShortcut = {
  name: string;
  short_name: string;
  url: string;
};

/** Home-screen shortcuts — inventory, schedule, dashboard (primary ERP routes). */
export const PWA_SHORTCUTS: readonly PwaShortcut[] = [
  { name: 'คลังสินค้า', short_name: 'คลัง', url: '/th/inventory' },
  { name: 'ตารางงาน', short_name: 'ตาราง', url: '/th/schedule' },
  { name: 'แดชบอร์ด', short_name: 'Dashboard', url: '/th/dashboard' },
] as const;

export function buildManifestShortcuts() {
  return PWA_SHORTCUTS.map((shortcut) => ({
    name: shortcut.name,
    short_name: shortcut.short_name,
    url: shortcut.url,
    icons: [{ src: PWA_BRAND_ICON, sizes: '192x192', type: 'image/png' as const }],
  }));
}

/** URLs precached on SW install for offline shell + assets. */
export const PWA_PRECACHE_URLS = [
  '/',
  PWA_START_URL.split('?')[0],
  PWA_OFFLINE_PAGE,
  PWA_SERVICE_WORKER_PATH,
  '/pwa-assets.js',
  '/notification-store.js',
  '/offline-mutation-store.js',
  '/pwa-badge.js',
  '/ai-agent-logo.svg',
] as const;
