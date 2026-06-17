import { headers } from 'next/headers';

const LOCALHOST_RP_IDS = new Set(['localhost', '127.0.0.1']);

/** RP ID must match the site hostname (no port, no scheme). */
export function normalizeRpId(hostname: string): string {
  const trimmed = hostname.trim().toLowerCase();
  if (!trimmed) {
    throw new Error('WEBAUTHN_RP_ID hostname is empty');
  }
  if (LOCALHOST_RP_IDS.has(trimmed)) {
    return 'localhost';
  }
  return trimmed;
}

export function resolveRpIdFromHostname(hostname: string): string {
  const fromEnv = process.env.WEBAUTHN_RP_ID?.trim();
  if (fromEnv) {
    return normalizeRpId(fromEnv);
  }
  return normalizeRpId(hostname);
}

export function resolveOriginFromHost(hostname: string, proto: string): string {
  const fromEnv = process.env.WEBAUTHN_ORIGIN?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  const scheme = proto === 'http' ? 'http' : 'https';
  if (LOCALHOST_RP_IDS.has(hostname.toLowerCase())) {
    return `${scheme}://${hostname}`;
  }
  return `${scheme}://${hostname}`;
}

export async function resolveWebAuthnContext(): Promise<{ rpId: string; origin: string }> {
  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host') ?? 'localhost';
  const hostname = host.split(':')[0] ?? 'localhost';
  const proto = headerStore.get('x-forwarded-proto') ?? 'https';
  return {
    rpId: resolveRpIdFromHostname(hostname),
    origin: resolveOriginFromHost(hostname, proto),
  };
}

export function resolveClientWebAuthnContext(): { rpId: string; origin: string } {
  if (typeof window === 'undefined') {
    return { rpId: 'localhost', origin: 'http://localhost' };
  }
  const hostname = window.location.hostname;
  return {
    rpId: resolveRpIdFromHostname(hostname),
    origin: window.location.origin,
  };
}
