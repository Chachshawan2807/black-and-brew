import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

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
    rest.startsWith('/pwa-');

  if (!isPublicAsset) return null;

  const url = request.nextUrl.clone();
  url.pathname = rest;
  return NextResponse.rewrite(url);
}

function redirectEnglishPathToThai(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (pathname === '/en') {
    const url = request.nextUrl.clone();
    url.pathname = '/th';
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith('/en/')) {
    const url = request.nextUrl.clone();
    url.pathname = `/th${pathname.slice(3)}`;
    return NextResponse.redirect(url);
  }
  return null;
}

export default function proxy(request: NextRequest) {
  const assetRewrite = rewriteLocalePrefixedPublicAsset(request);
  if (assetRewrite) return assetRewrite;

  const thaiRedirect = redirectEnglishPathToThai(request);
  if (thaiRedirect) return thaiRedirect;
  return intlMiddleware(request);
}

export const proxyConfig = {
  // next-intl: skip api, root _next, vercel internals, and dotted static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
