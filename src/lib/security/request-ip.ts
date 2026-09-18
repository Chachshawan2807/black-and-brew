import { headers } from 'next/headers';
import { pickClientIp } from '@/lib/security/client-ip';

export { isValidIp, pickClientIp } from '@/lib/security/client-ip';

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
