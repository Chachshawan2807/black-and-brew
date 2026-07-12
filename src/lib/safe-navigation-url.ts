/** Resolve in-app navigation targets — block open redirects from service worker messages. */

export function resolveSameOriginNavigationUrl(
  rawUrl: string,
  origin: string,
): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const resolved = new URL(trimmed, origin);
    if (resolved.origin !== origin) return null;
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null;
    return resolved.href;
  } catch {
    return null;
  }
}
