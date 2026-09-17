import { PWA_PROXY_PASSTHROUGH_PATHS } from '@/lib/pwa-config';

/** Root public files that must never go through locale prefix redirects (SW, PWA scripts). */
export const PUBLIC_ROOT_ASSET_PATHS = new Set<string>(PWA_PROXY_PASSTHROUGH_PATHS);

export function isPublicRootAssetPath(pathname: string): boolean {
  if (PUBLIC_ROOT_ASSET_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/images/')) return true;
  if (pathname.startsWith('/pwa-')) return true;
  return false;
}
