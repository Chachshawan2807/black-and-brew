import { isIP } from 'node:net';
import { headers } from 'next/headers';

const TRUSTED_IP_HEADERS = ['x-vercel-forwarded-for', 'cf-connecting-ip', 'x-real-ip'] as const;

function firstValidIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (/[\r\n\0]/.test(raw)) return null;

  for (const part of raw.split(',')) {
    const candidate = part.trim();
    if (candidate && isIP(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Pick a client IP from proxy headers. Platform-owned headers win so a forged
 * X-Forwarded-For cannot rotate PIN lockout keys.
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

/** Resolve client IP from reverse-proxy headers (Vercel, Cloudflare). */
export async function resolveClientIp(): Promise<string> {
  const headerStore = await headers();
  return pickClientIp((name) => headerStore.get(name)) ?? 'unknown';
}

/** Same as resolveClientIp but keeps null when no valid IP is present. */
export async function resolveOptionalClientIp(): Promise<string | null> {
  const headerStore = await headers();
  return pickClientIp((name) => headerStore.get(name));
}
