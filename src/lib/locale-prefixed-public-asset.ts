import { NextRequest, NextResponse } from 'next/server';
import { isPublicRootAssetPath, PUBLIC_ROOT_ASSET_PATHS } from '@/lib/pwa-public-asset-paths';

const LOCALE_PREFIX = /^\/(th|en)(\/.*)$/;

/**
 * Dev/runtime may request `/_next` and manifest under `/th/...` (relative to locale URL).
 * next-intl would treat those as app routes → 404 and a blank "กำลังเตรียมระบบ..." shell.
 */
export function rewriteLocalePrefixedPublicAsset(
  request: NextRequest,
): NextResponse | null {
  const { pathname } = request.nextUrl;
  const match = pathname.match(LOCALE_PREFIX);
  if (!match) return null;

  const rest = match[2];
  const isPublicAsset =
    rest.startsWith('/_next/') ||
    rest === '/manifest.webmanifest' ||
    rest.startsWith('/images/') ||
    rest === '/favicon.ico' ||
    rest.startsWith('/pwa-') ||
    PUBLIC_ROOT_ASSET_PATHS.has(rest) ||
    isPublicRootAssetPath(rest);

  if (!isPublicAsset) return null;

  const url = request.nextUrl.clone();
  url.pathname = rest;
  return NextResponse.rewrite(url);
}
