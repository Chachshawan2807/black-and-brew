import { headers } from 'next/headers';

/** Resolve client IP from reverse-proxy headers (Vercel, Cloudflare). */
export async function resolveClientIp(): Promise<string> {
  const headerStore = await headers();
  const forwarded = headerStore.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return (
    headerStore.get('x-real-ip') ??
    headerStore.get('cf-connecting-ip') ??
    'unknown'
  );
}
