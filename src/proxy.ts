import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { rewriteLocalePrefixedPublicAsset } from '@/lib/locale-prefixed-public-asset';
import { inspectRequestForDos } from '@/lib/rate-limit/dos-guard';
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

export default async function proxy(request: NextRequest) {
  const denied = await inspectRequestForDos(request);
  if (denied) return denied;

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
  // Pages skip api/_next/_vercel/static files. API is matched separately so DOS
  // limits apply without locale-prefixing cron/webhook routes.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)', '/api/:path*'],
};
