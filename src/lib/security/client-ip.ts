const TRUSTED_IP_HEADERS = ['x-vercel-forwarded-for', 'cf-connecting-ip', 'x-real-ip'] as const;
const IPV4 =
  /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

/** Edge-safe IP check. Avoids node:net so proxy can reuse this module. */
export function isValidIp(value: string): boolean {
  if (!value || value.length > 45 || /[\r\n\0]/.test(value)) return false;
  if (IPV4.test(value)) return true;
  if (!value.includes(':')) return false;
  try {
    return Boolean(new URL(`http://[${value}]`).hostname);
  } catch {
    return false;
  }
}

function firstValidIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (/[\r\n\0]/.test(raw)) return null;

  for (const part of raw.split(',')) {
    const candidate = part.trim();
    if (candidate && isValidIp(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Pick a client IP from proxy headers. Platform-owned headers win so a forged
 * X-Forwarded-For cannot rotate rate-limit or PIN lockout keys.
 */
export function pickClientIp(
  getHeader: (name: string) => string | null | undefined,
): string | null {
  for (const name of TRUSTED_IP_HEADERS) {
    const trusted = firstValidIp(getHeader(name));
    if (trusted) return trusted;
  }
  return firstValidIp(getHeader('x-forwarded-for'));
}
