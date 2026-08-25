import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

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
  const thaiRedirect = redirectEnglishPathToThai(request);
  if (thaiRedirect) return thaiRedirect;
  return intlMiddleware(request);
}

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(th|en)/:path*'],
};
