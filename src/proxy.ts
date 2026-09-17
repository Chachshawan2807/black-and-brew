import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { rewriteLocalePrefixedPublicAsset } from '@/lib/locale-prefixed-public-asset';
import { isPublicRootAssetPath } from '@/lib/pwa-public-asset-paths';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

function passThroughPublicRootAssets(request: NextRequest): NextResponse | null {
  if (isPublicRootAssetPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  return null;
}

export { rewriteLocalePrefixedPublicAsset } from '@/lib/locale-prefixed-public-asset';

function redirectLocaleIndexToHome(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (pathname === '/th' || pathname === '/en') {
    const url = request.nextUrl.clone();
    url.pathname = '/th/home';
    return NextResponse.redirect(url);
  }
  return null;
}

function redirectEnglishPathToThai(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/en/')) {
    const url = request.nextUrl.clone();
    url.pathname = `/th${pathname.slice(3)}`;
    return NextResponse.redirect(url);
  }
  return null;
}

/** Cron and webhooks must stay at `/api/*` (no `/th` prefix). */
function passThroughApiRoutes(request: NextRequest): NextResponse | null {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  return null;
}

export default function proxy(request: NextRequest) {
  const apiPassthrough = passThroughApiRoutes(request);
  if (apiPassthrough) return apiPassthrough;

  const publicAssetPassthrough = passThroughPublicRootAssets(request);
  if (publicAssetPassthrough) return publicAssetPassthrough;

  const assetRewrite = rewriteLocalePrefixedPublicAsset(request);
  if (assetRewrite) return assetRewrite;

  const homeRedirect = redirectLocaleIndexToHome(request);
  if (homeRedirect) return homeRedirect;

  const thaiRedirect = redirectEnglishPathToThai(request);
  if (thaiRedirect) return thaiRedirect;
  return intlMiddleware(request);
}

export const proxyConfig = {
  // next-intl: skip api, root _next, vercel internals, and dotted static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
