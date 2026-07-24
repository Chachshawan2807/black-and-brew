import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time comparison for webhook/cron bearer secrets.
 * Prevents timing side-channels when validating Authorization headers.
 */
export function verifyBearerSecret(
  authHeader: string | null,
  secret: string | undefined | null,
): boolean {
  if (!authHeader || !secret) return false;

  const expected = `Bearer ${secret}`;
  const received = authHeader.trim();

  if (expected.length !== received.length) return false;

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch {
    return false;
  }
}
