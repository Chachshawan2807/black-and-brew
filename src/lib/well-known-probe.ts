const LOCALE_WELL_KNOWN = /^\/(?:th|en)(\/\.well-known(?:\/.*)?)$/;

/**
 * Chrome DevTools polls `/.well-known/appspecific/com.chrome.devtools.json`.
 * With the locale prefix that becomes `/th/.well-known/...`, which still contains a dot
 * so the default proxy matcher skips it and the App Router compiles `/_not-found`.
 */
export function isWellKnownProbePath(pathname: string): boolean {
  if (pathname === '/.well-known' || pathname.startsWith('/.well-known/')) {
    return true;
  }
  return LOCALE_WELL_KNOWN.test(pathname);
}
