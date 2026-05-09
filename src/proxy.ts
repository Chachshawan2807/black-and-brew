import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware({
  ...routing,
  localePrefix: 'always'
});

export const config = {
  // Match only internationalized pathnames
  // Matcher: ['/', '/(th|en)/:path*']
  // More robust matcher for Next.js
  matcher: [
    // Match all pathnames except for
    // - API routes
    // - Static files (_next, images, favicon, etc.)
    '/((?!api|_next/static|_next/image|images|favicon.ico).*)',
    // Match root
    '/'
  ]
};
